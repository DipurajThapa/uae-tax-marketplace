import { and, eq, inArray, lte, or, sql } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "@/db/client";
import { credentials, credentialTypes, disputes, credentialSubmissions, organizations } from "@/db/schema";
import { audit, PUBLIC, SYSTEM, type Actor } from "./audit";
import { rateLimit } from "./ratelimit";
import { keyedHash } from "./crypto";
import { httpUrl } from "./validators";

const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400_000);

export const verifyInputSchema = z.object({
  method: z.enum(["official_register", "document_review"]),
  evidenceNote: z.string().trim().min(10, "Describe what was checked, where and when").max(1000),
  evidenceUrl: httpUrl().optional().or(z.literal("").transform(() => undefined)),
  registrationNumber: z.string().trim().max(50).optional(),
  expiresAt: z.coerce.date().optional(),
});

/**
 * Marks a credential verified. The DB rejects verification without method/reviewer/evidence
 * and for synthetic records, so a bug here cannot create an unsupported "verified" claim.
 */
export async function verifyCredential(db: DB, actor: Actor, credentialId: string, input: z.input<typeof verifyInputSchema>, now = new Date()) {
  if (!actor.userId) throw new Error("A named reviewer is required");
  const v = verifyInputSchema.parse(input);
  await db.transaction(async (tx) => {
    const [c] = await tx
      .select({ c: credentials, recheckDays: credentialTypes.recheckDays })
      .from(credentials)
      .innerJoin(credentialTypes, eq(credentialTypes.code, credentials.credentialType))
      .where(eq(credentials.id, credentialId))
      .for("update");
    if (!c) throw new Error("Credential not found");
    if (c.c.status === "disputed") throw new Error("Resolve the open dispute first");
    let recheck = addDays(now, c.recheckDays);
    const expires = v.expiresAt ?? c.c.expiresAt;
    if (expires && expires <= now) throw new Error("Credential has already expired");
    if (expires && expires < recheck) recheck = expires;
    await tx
      .update(credentials)
      .set({
        status: "verified",
        method: v.method,
        evidenceNote: v.evidenceNote,
        evidenceUrl: v.evidenceUrl ?? null,
        registrationNumber: v.registrationNumber ?? c.c.registrationNumber,
        expiresAt: expires ?? null,
        verifiedAt: now,
        verifiedBy: actor.userId,
        recheckDueAt: recheck,
        updatedAt: now,
      })
      .where(eq(credentials.id, credentialId));
    await audit(tx, actor, "credential.verified", "credential", credentialId, { method: v.method, recheckDueAt: recheck.toISOString() });
  });
}

/** Revokes a credential. The original evidence is kept; the reason goes to the audit log. */
export async function revokeCredential(db: DB, actor: Actor, credentialId: string, note: string, now = new Date()) {
  if (!actor.userId) throw new Error("A named reviewer is required");
  if (note.trim().length < 5) throw new Error("Give a reason");
  await db.transaction(async (tx) => {
    const [c] = await tx.select().from(credentials).where(eq(credentials.id, credentialId)).for("update");
    if (!c) throw new Error("Credential not found");
    if (c.status === "disputed") throw new Error("Resolve the open dispute instead");
    if (c.status === "revoked") throw new Error("Already revoked");
    await tx.update(credentials).set({ status: "revoked", updatedAt: now }).where(eq(credentials.id, credentialId));
    await audit(tx, actor, "credential.revoked", "credential", credentialId, { note, previousStatus: c.status });
  });
}

/**
 * Fail closed on freshness: verified credentials past their re-check date or expiry become
 * "expired", which removes the badge and eligibility for services that require them.
 */
export async function sweepStaleCredentials(db: DB, now = new Date()): Promise<number> {
  return db.transaction(async (tx) => {
    const stale = await tx
      .update(credentials)
      .set({ status: "expired", updatedAt: now })
      .where(and(eq(credentials.status, "verified"), or(lte(credentials.recheckDueAt, now), lte(credentials.expiresAt, now))))
      .returning({ id: credentials.id });
    for (const s of stale) await audit(tx, SYSTEM, "credential.expired", "credential", s.id, { at: now.toISOString() });
    return stale.length;
  });
}

export async function credentialsDueSoon(db: DB, now: Date, withinDays = 14) {
  return db
    .select({ c: credentials, org: organizations })
    .from(credentials)
    .leftJoin(organizations, eq(organizations.id, credentials.organizationId))
    .where(and(eq(credentials.status, "verified"), lte(credentials.recheckDueAt, addDays(now, withinDays))))
    .orderBy(credentials.recheckDueAt);
}

// ---------- Disputes ----------

export const disputeSchema = z.object({
  organizationId: z.string().uuid(),
  credentialId: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  reporterEmail: z.string().trim().email().max(200),
  reason: z.enum(["incorrect_credential", "incorrect_details", "business_closed", "other"]),
  details: z.string().trim().min(10, "Please give some detail").max(2000),
});

/**
 * Anyone can report an error. Reports go to the review queue and do NOT change the credential:
 * an anonymous report must not be able to strip a competitor's badge (review finding H2).
 * A reviewer can freeze the credential while investigating (freezeForDispute).
 */
export async function openDispute(db: DB, input: z.input<typeof disputeSchema>, ctx: { ip: string; now: Date }) {
  const d = disputeSchema.parse(input);
  const rl = await rateLimit(db, "dispute_ip", keyedHash(`ip:${ctx.ip}`), 5, 3600, ctx.now);
  const perTarget = await rateLimit(db, "dispute_org", d.organizationId, 10, 86400, ctx.now);
  if (!rl.allowed || !perTarget.allowed) return { ok: false as const, code: "rate_limited" };
  const id = await db.transaction(async (tx) => {
    let prior: typeof credentials.$inferSelect.status | null = null;
    if (d.credentialId) {
      const [c] = await tx.select().from(credentials).where(and(eq(credentials.id, d.credentialId), eq(credentials.organizationId, d.organizationId))).for("update");
      if (!c) throw new Error("Credential does not belong to this provider");
      prior = c.status;
    }
    const [row] = await tx
      .insert(disputes)
      .values({ ...d, credentialId: d.credentialId ?? null, priorCredentialStatus: prior, createdAt: ctx.now })
      .returning({ id: disputes.id });
    await audit(tx, PUBLIC, "dispute.opened", "dispute", row!.id, { organizationId: d.organizationId, reason: d.reason });
    return row!.id;
  });
  return { ok: true as const, id };
}

export async function resolveDispute(db: DB, actor: Actor, disputeId: string, outcome: "upheld" | "rejected", note: string, now = new Date()) {
  await db.transaction(async (tx) => {
    const [d] = await tx.select().from(disputes).where(eq(disputes.id, disputeId)).for("update");
    if (!d || d.state !== "open") throw new Error("Dispute is not open");
    if (d.credentialId) {
      const [c] = await tx.select().from(credentials).where(eq(credentials.id, d.credentialId));
      if (c && outcome === "upheld" && (c.status === "verified" || c.status === "disputed" || c.status === "expired" || c.status === "pending")) {
        await tx.update(credentials).set({ status: "revoked", updatedAt: now }).where(eq(credentials.id, c.id));
      } else if (c && c.status === "disputed") {
        // Upheld → revoked. Rejected → back to the prior status, unless its re-check date passed meanwhile.
        let next: (typeof credentials.$inferSelect)["status"] = outcome === "upheld" ? "revoked" : (d.priorCredentialStatus ?? "unverified");
        if (next === "verified" && c.recheckDueAt && c.recheckDueAt <= now) next = "expired";
        await tx.update(credentials).set({ status: next, updatedAt: now }).where(eq(credentials.id, c.id));
      }
    }
    if (outcome === "upheld" && d.reason === "business_closed")
      await tx.update(organizations).set({ listingStatus: "suspended", updatedAt: now }).where(eq(organizations.id, d.organizationId));
    await tx.update(disputes).set({ state: outcome, resolvedBy: actor.userId, resolvedAt: now, resolutionNote: note }).where(eq(disputes.id, disputeId));
    await audit(tx, actor, `dispute.${outcome}`, "dispute", disputeId, { note });
  });
}

/** Reviewer action: hide a credential's badge while a dispute is investigated. */
export async function freezeForDispute(db: DB, actor: Actor, disputeId: string, now = new Date()) {
  if (!actor.userId) throw new Error("A named reviewer is required");
  await db.transaction(async (tx) => {
    const [d] = await tx.select().from(disputes).where(eq(disputes.id, disputeId)).for("update");
    if (!d || d.state !== "open" || !d.credentialId) throw new Error("Open dispute about a credential required");
    const [c] = await tx.select().from(credentials).where(eq(credentials.id, d.credentialId)).for("update");
    if (!c || c.status !== "verified") throw new Error("Only a verified credential can be frozen");
    await tx.update(disputes).set({ priorCredentialStatus: c.status }).where(eq(disputes.id, disputeId));
    await tx.update(credentials).set({ status: "disputed", updatedAt: now }).where(eq(credentials.id, c.id));
    await audit(tx, actor, "credential.frozen_for_dispute", "credential", c.id, { disputeId });
  });
}

// ---------- Credential submissions from providers ----------

/** Approves a provider's submission and verifies the credential in ONE transaction (no orphan rows on failure). */
export async function approveSubmission(db: DB, actor: Actor, submissionId: string, input: z.input<typeof verifyInputSchema>, now = new Date()) {
  await db.transaction(async (tx) => {
    const [s] = await tx.select().from(credentialSubmissions).where(eq(credentialSubmissions.id, submissionId)).for("update");
    if (!s || s.state !== "pending") throw new Error("Submission is not pending");
    if (s.submittedBy === actor.userId) throw new Error("Reviewers cannot approve their own submission");
    let credentialId = s.credentialId;
    if (!credentialId) {
      const [c] = await tx
        .insert(credentials)
        .values({ credentialType: s.credentialType, organizationId: s.organizationId, registrationNumber: s.registrationNumber, status: "pending", method: "self_declared" })
        .returning({ id: credentials.id });
      credentialId = c!.id;
    }
    // Nested call runs as a savepoint inside this transaction.
    await verifyCredential(tx as unknown as DB, actor, credentialId, { ...input, registrationNumber: input.registrationNumber ?? s.registrationNumber }, now);
    await tx
      .update(credentialSubmissions)
      .set({ state: "approved", reviewedBy: actor.userId, reviewedAt: now, credentialId, reviewNote: "Verified" })
      .where(eq(credentialSubmissions.id, submissionId));
    await audit(tx, actor, "credential_submission.approved", "credential_submission", submissionId, { credentialId });
  });
}

export async function rejectSubmission(db: DB, actor: Actor, submissionId: string, note: string, now = new Date()) {
  await db.transaction(async (tx) => {
    const [s] = await tx.select().from(credentialSubmissions).where(eq(credentialSubmissions.id, submissionId)).for("update");
    if (!s || s.state !== "pending") throw new Error("Submission is not pending");
    await tx.update(credentialSubmissions).set({ state: "rejected", reviewedBy: actor.userId, reviewedAt: now, reviewNote: note }).where(eq(credentialSubmissions.id, submissionId));
    if (s.credentialId) await tx.update(credentials).set({ status: "unverified", updatedAt: now }).where(and(eq(credentials.id, s.credentialId), inArray(credentials.status, ["pending"])));
    await audit(tx, actor, "credential_submission.rejected", "credential_submission", submissionId, { note });
  });
}

export async function verificationQueueCounts(db: DB) {
  const [r] = await db
    .select({
      submissions: sql<number>`(select count(*) from credential_submissions where state = 'pending')::int`,
      disputes: sql<number>`(select count(*) from disputes where state = 'open')::int`,
      claims: sql<number>`(select count(*) from claims where state = 'pending')::int`,
      expired: sql<number>`(select count(*) from credentials where status = 'expired')::int`,
      drafts: sql<number>`(select count(*) from organizations where listing_status = 'draft')::int`,
      deadNotifications: sql<number>`(select count(*) from notifications where status = 'dead')::int`,
    })
    .from(sql`(select 1) as one`);
  return r!;
}
