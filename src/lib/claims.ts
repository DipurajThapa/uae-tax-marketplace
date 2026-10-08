import { z } from "zod";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { DB } from "@/db/client";
import {
  claims,
  organizations,
  users,
  passwordTokens,
  credentials,
  credentialSubmissions,
  organizationServices,
  organizationJurisdictions,
  dataSources,
  consents,
} from "@/db/schema";
import { audit, PUBLIC, userActor, type Actor } from "./audit";
import { rateLimit } from "./ratelimit";
import { hashPassword, keyedHash, randomToken, sha256 } from "./crypto";
import { domainOf, normalizeEmail, normalizeName, slugify } from "./text";
import { enqueue } from "./notify";
import { track } from "./analytics";
import { CREDENTIAL_BY_CODE, isEmirate, SERVICE_BY_CODE, JURISDICTION_BY_CODE } from "./taxonomy";
import { httpUrl } from "./validators";
import { LANGUAGE_BY_CODE } from "./taxonomy";
import { PROVIDER_LISTING_CONSENT_TEXT, PROVIDER_LISTING_CONSENT_VERSION, consentHash } from "./consent";

export const claimSchema = z.object({
  organizationId: z.string().uuid(),
  claimantName: z.string().trim().min(2).max(100),
  claimantEmail: z.string().trim().email().max(200),
  claimantRole: z.string().trim().min(2).max(100),
  evidenceNote: z.string().trim().min(20, "Tell us how we can confirm you represent this business (at least 20 characters)").max(2000),
});

export async function submitClaim(db: DB, input: z.input<typeof claimSchema>, ctx: { ip: string; now: Date }) {
  const parsed = claimSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, errors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  const c = parsed.data;
  const rl = await rateLimit(db, "claim_ip", keyedHash(`ip:${ctx.ip}`), 5, 3600, ctx.now);
  if (!rl.allowed) return { ok: false as const, errors: { form: "Too many attempts. Try again later." } };
  const [org] = await db.select().from(organizations).where(eq(organizations.id, c.organizationId));
  if (!org || org.claimState === "claimed") return { ok: false as const, errors: { form: "This listing cannot be claimed." } };
  const email = normalizeEmail(c.claimantEmail);
  const match = !!org.website && domainOf(email) === domainOf(org.website);
  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(claims)
      .values({ ...c, claimantEmail: email, emailDomainMatchesWebsite: match, createdAt: ctx.now })
      .returning({ id: claims.id });
    await tx.update(organizations).set({ claimState: "claim_pending" }).where(eq(organizations.id, org.id));
    await audit(tx, PUBLIC, "claim.submitted", "claim", row!.id, { organizationId: org.id, domainMatch: match });
    return row!.id;
  });
  await track(db, "claim_submitted", { orgId: org.id });
  return { ok: true as const, id };
}

async function issuePasswordToken(tx: Pick<DB, "insert">, userId: string, now: Date): Promise<string> {
  const token = randomToken();
  await tx.insert(passwordTokens).values({ id: sha256(token), userId, expiresAt: new Date(now.getTime() + 72 * 3600_000) });
  return token;
}

export async function approveClaim(db: DB, actor: Actor, claimId: string, note: string, now = new Date()) {
  await db.transaction(async (tx) => {
    const [cl] = await tx.select().from(claims).where(eq(claims.id, claimId)).for("update");
    if (!cl || cl.state !== "pending") throw new Error("Claim is not pending");
    const [org] = await tx.select().from(organizations).where(eq(organizations.id, cl.organizationId)).for("update");
    if (!org || org.claimState === "claimed") throw new Error("Listing already claimed");
    const [existing] = await tx.select().from(users).where(eq(users.email, cl.claimantEmail));
    if (existing && existing.organizationId && existing.organizationId !== org.id) throw new Error("That email already manages another listing");
    let userId = existing?.id;
    if (!userId) {
      const [u] = await tx
        .insert(users)
        .values({ email: cl.claimantEmail, name: cl.claimantName, role: "provider", organizationId: org.id, passwordHash: await hashPassword(randomToken()) })
        .returning({ id: users.id });
      userId = u!.id;
    } else {
      await tx.update(users).set({ organizationId: org.id }).where(eq(users.id, userId));
    }
    const token = await issuePasswordToken(tx, userId, now);
    await tx.update(organizations).set({ claimState: "claimed", updatedAt: now }).where(eq(organizations.id, org.id));
    await tx.update(claims).set({ state: "approved", reviewedBy: actor.userId, reviewedAt: now, reviewNote: note, createdUserId: userId }).where(eq(claims.id, claimId));
    await enqueue(tx, { to: cl.claimantEmail, template: "claim_decision", payload: { approved: true, orgName: org.tradeName ?? org.legalName, setPasswordToken: token } });
    await audit(tx, actor, "claim.approved", "claim", claimId, { organizationId: org.id, userId });
  });
}

export async function rejectClaim(db: DB, actor: Actor, claimId: string, note: string, now = new Date()) {
  await db.transaction(async (tx) => {
    const [cl] = await tx.select().from(claims).where(eq(claims.id, claimId)).for("update");
    if (!cl || cl.state !== "pending") throw new Error("Claim is not pending");
    const [org] = await tx.select().from(organizations).where(eq(organizations.id, cl.organizationId));
    await tx.update(claims).set({ state: "rejected", reviewedBy: actor.userId, reviewedAt: now, reviewNote: note }).where(eq(claims.id, claimId));
    const [otherPending] = await tx.select({ id: claims.id }).from(claims).where(and(eq(claims.organizationId, cl.organizationId), eq(claims.state, "pending")));
    if (!otherPending && org?.claimState === "claim_pending")
      await tx.update(organizations).set({ claimState: "unclaimed" }).where(eq(organizations.id, cl.organizationId));
    await enqueue(tx, { to: cl.claimantEmail, template: "claim_decision", payload: { approved: false, orgName: org?.tradeName ?? org?.legalName ?? "", note } });
    await audit(tx, actor, "claim.rejected", "claim", claimId, { note });
  });
}

export async function consumePasswordToken(db: DB, token: string, newPassword: string, now = new Date()) {
  if (newPassword.length < 12) return { ok: false as const, error: "Use at least 12 characters" };
  return db.transaction(async (tx) => {
    const [t] = await tx
      .select()
      .from(passwordTokens)
      .where(and(eq(passwordTokens.id, sha256(token)), isNull(passwordTokens.usedAt), gt(passwordTokens.expiresAt, now)))
      .for("update");
    if (!t) return { ok: false as const, error: "This link is invalid or has expired" };
    await tx.update(users).set({ passwordHash: await hashPassword(newPassword) }).where(eq(users.id, t.userId));
    await tx.update(passwordTokens).set({ usedAt: now }).where(eq(passwordTokens.id, t.id));
    await audit(tx, userActor(t.userId), "user.password_set", "user", t.userId);
    return { ok: true as const };
  });
}

// ---------- Provider self-listing (primary supply path; see DECISIONS D-003) ----------

const listCodes = (dict: Record<string, unknown>) => z.array(z.string().refine((v) => v in dict, "Unknown value"));

export const registrationSchema = z.object({
  legalName: z.string().trim().min(2).max(200),
  tradeName: z.string().trim().max(200).optional().transform((v) => v || undefined),
  kind: z.enum(["tax_agency", "accounting_firm", "einvoicing_provider", "law_firm", "independent_consultant"]),
  emirate: z.string().refine(isEmirate, "Choose an emirate"),
  city: z.string().trim().max(100).optional().transform((v) => v || undefined),
  website: httpUrl("Enter a full URL, e.g. https://example.ae").optional().or(z.literal("").transform(() => undefined)),
  publicEmail: z.string().trim().email().max(200),
  publicPhone: z.string().trim().max(30).regex(/^[+0-9 ()-]*$/).optional().transform((v) => v || undefined),
  description: z.string().trim().max(600).optional().transform((v) => v || undefined),
  services: listCodes(SERVICE_BY_CODE).min(1, "Choose at least one service"),
  jurisdictions: listCodes(JURISDICTION_BY_CODE).default([]),
  languages: listCodes(LANGUAGE_BY_CODE).default([]),
  contactName: z.string().trim().min(2).max(100),
  contactEmail: z.string().trim().email().max(200),
  password: z.string().min(12, "Use at least 12 characters").max(200),
  credentials: z
    .array(
      z.object({
        type: z.string().refine((v) => CREDENTIAL_BY_CODE[v]?.subject === "organization", "Choose a firm-level registration (individual registrations are added later)"),
        registrationNumber: z.string().trim().min(3, "Enter the registration number").max(50),
      }),
    )
    .max(10)
    .default([]),
  consent: z.literal(true, { message: "You must confirm you are authorised to list this business" }),
});

export async function registerProvider(db: DB, input: unknown, ctx: { ip: string; now: Date }) {
  const parsed = registrationSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, errors: Object.fromEntries(parsed.error.issues.map((i) => [i.path.join("."), i.message])) };
  const r = parsed.data;
  const rl = await rateLimit(db, "register_ip", keyedHash(`ip:${ctx.ip}`), 3, 3600, ctx.now);
  if (!rl.allowed) return { ok: false as const, errors: { form: "Too many attempts. Try again later." } };
  const email = normalizeEmail(r.contactEmail);
  const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (taken) return { ok: false as const, errors: { contactEmail: "An account already exists for this email. Sign in instead." } };

  const normalized = normalizeName(r.legalName);
  const [dupe] = await db.select({ id: organizations.id, slug: organizations.slug }).from(organizations).where(eq(organizations.normalizedName, normalized));
  if (dupe) return { ok: false as const, errors: { legalName: "This business already has a listing. Use “Claim this listing” on its profile instead." }, existingSlug: dupe.slug };

  const [source] = await db.select().from(dataSources).where(eq(dataSources.kind, "provider_submission"));
  if (!source) throw new Error("provider_submission data source missing (run seed)");

  let slug = slugify(r.tradeName ?? r.legalName) || "provider";
  const [slugTaken] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.slug, slug));
  if (slugTaken) slug = `${slug}-${randomToken(3).toLowerCase().replace(/[^a-z0-9]/g, "")}`;

  const orgId = await db.transaction(async (tx) => {
    const [org] = await tx
      .insert(organizations)
      .values({
        slug,
        legalName: r.legalName,
        tradeName: r.tradeName ?? null,
        kind: r.kind,
        emirate: r.emirate,
        city: r.city ?? null,
        website: r.website ?? null,
        publicEmail: normalizeEmail(r.publicEmail),
        publicPhone: r.publicPhone ?? null,
        description: r.description ?? null,
        languages: r.languages,
        listingStatus: "draft", // admin publishes after review
        claimState: "claimed",
        sourceId: source.id,
        normalizedName: normalized,
        createdAt: ctx.now,
      })
      .returning({ id: organizations.id });
    const orgId = org!.id;
    if (r.services.length) await tx.insert(organizationServices).values(r.services.map((s) => ({ organizationId: orgId, serviceCode: s })));
    if (r.jurisdictions.length) await tx.insert(organizationJurisdictions).values(r.jurisdictions.map((j) => ({ organizationId: orgId, jurisdictionCode: j })));
    const [user] = await tx
      .insert(users)
      .values({ email, name: r.contactName, role: "provider", organizationId: orgId, passwordHash: await hashPassword(r.password) })
      .returning({ id: users.id });
    for (const c of r.credentials) {
      const [cred] = await tx
        .insert(credentials)
        .values({ credentialType: c.type, organizationId: orgId, registrationNumber: c.registrationNumber, status: "pending", method: "self_declared", sourceId: source.id })
        .returning({ id: credentials.id });
      await tx.insert(credentialSubmissions).values({
        organizationId: orgId,
        submittedBy: user!.id,
        credentialType: c.type,
        registrationNumber: c.registrationNumber,
        evidenceNote: "Submitted at registration",
        credentialId: cred!.id,
      });
    }
    await tx.insert(consents).values({
      textVersion: PROVIDER_LISTING_CONSENT_VERSION,
      textHash: consentHash(PROVIDER_LISTING_CONSENT_TEXT),
      purposes: ["public_listing", "credential_verification"],
      recipientOrganizationIds: [],
      grantedAt: ctx.now,
      ipHash: keyedHash(`ip:${ctx.ip}`),
    });
    await audit(tx, PUBLIC, "provider.registered", "organization", orgId, { userId: user!.id });
    return orgId;
  });
  return { ok: true as const, organizationId: orgId, slug };
}
