import { z } from "zod";
import { and, eq, gte, inArray, lt, ne, sql } from "drizzle-orm";
import type { DB } from "@/db/client";
import { consents, enquiries, enquiryRecipients, users, organizations, notifications } from "@/db/schema";
import { validateAssessment, type Answers, type Assessment } from "./assessment";
import { matchProviders, MAX_RECIPIENTS, type Match } from "./matching";
import { loadCandidates } from "./providers";
import { spamScore, SPAM_THRESHOLD } from "./spam";
import { rateLimit } from "./ratelimit";
import { keyedHash, publicRef, randomToken, sha256 } from "./crypto";
import { normalizeEmail } from "./text";
import { ENQUIRY_CONSENT_VERSION, enquiryConsentText, consentHash } from "./consent";
import { recordLeadCharge, lockOrganizationsForCharging, CapacityExceededError } from "./billing";
import { enqueue } from "./notify";
import { audit, PUBLIC, type Actor } from "./audit";
import { track } from "./analytics";
import { EMIRATE_BY_CODE, SERVICE_BY_CODE } from "./taxonomy";
import { isUuid } from "./validators";

export const contactSchema = z.object({
  contactName: z.string().trim().min(2, "Enter your name").max(100),
  contactEmail: z.string().trim().email("Enter a valid email").max(200),
  contactPhone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[+0-9 ()-]*$/, "Use digits, spaces and + only")
    .optional()
    .transform((v) => v || undefined),
  companyName: z.string().trim().max(150).optional().transform((v) => v || undefined),
  message: z.string().trim().max(2000).optional().transform((v) => v || undefined),
});

export type SubmitInput = {
  answers: Answers;
  contact: Record<string, string | undefined>;
  selectedProviderIds: string[];
  consentGiven: boolean;
  consentVersion: string;
  honeypot?: string;
  formStartedAt?: number;
};

export type SubmitResult =
  | { ok: true; ref: string; manageToken: string | null; duplicate: boolean }
  | { ok: false; code: "validation" | "rate_limited" | "rejected" | "ineligible_selection" | "consent_required"; errors?: Record<string, string> };

export const DEDUPE_WINDOW_DAYS = 7;

export async function getMatches(db: DB, assessment: Assessment, now: Date) {
  const candidates = await loadCandidates(db, assessment.services, now);
  return matchProviders(candidates, assessment);
}

export async function submitEnquiry(db: DB, input: SubmitInput, ctx: { ip: string; now: Date }): Promise<SubmitResult> {
  const assessed = validateAssessment(input.answers);
  const contact = contactSchema.safeParse(input.contact);
  const errors: Record<string, string> = {};
  if (!assessed.ok) Object.assign(errors, assessed.errors);
  if (!contact.success) for (const i of contact.error.issues) errors[String(i.path[0])] ??= i.message;
  const selected = [...new Set(input.selectedProviderIds)].filter(Boolean);
  if (selected.some((id) => !isUuid(id))) return { ok: false, code: "ineligible_selection", errors: { providers: "Unknown provider" } };
  if (selected.length === 0) errors.providers = "Choose at least one provider";
  if (selected.length > MAX_RECIPIENTS) errors.providers = `Choose up to ${MAX_RECIPIENTS} providers`;
  if (Object.keys(errors).length || !assessed.ok || !contact.success) return { ok: false, code: "validation", errors };
  if (!input.consentGiven || input.consentVersion !== ENQUIRY_CONSENT_VERSION)
    return { ok: false, code: "consent_required", errors: { consent: "Please confirm you agree to share your details" } };

  const email = normalizeEmail(contact.data.contactEmail);
  const spam = spamScore({
    honeypot: input.honeypot,
    formStartedAt: input.formStartedAt,
    now: ctx.now.getTime(),
    message: contact.data.message,
    email,
    name: contact.data.contactName,
  });
  if (spam.score >= SPAM_THRESHOLD) {
    // Personal data of rejected submissions is not stored.
    await track(db, "enquiry_rejected", { reason: "spam" });
    return { ok: false, code: "rejected" };
  }

  const ipHash = keyedHash(`ip:${ctx.ip}`);
  const byIp = await rateLimit(db, "enquiry_ip", ipHash, 5, 3600, ctx.now);
  const byEmail = await rateLimit(db, "enquiry_email", keyedHash(`email:${email}`), 5, 86400, ctx.now);
  if (!byIp.allowed || !byEmail.allowed) {
    await track(db, "enquiry_rejected", { reason: "rate_limited" });
    return { ok: false, code: "rate_limited" };
  }

  // Re-run matching on the server: a provider can only be contacted if it is eligible now.
  const assessment = assessed.value;
  const { matches } = await getMatches(db, assessment, ctx.now);
  const byId = new Map(matches.map((m) => [m.candidateId, m]));
  const chosen: Match[] = [];
  for (const id of selected) {
    const m = byId.get(id);
    if (!m) return { ok: false, code: "ineligible_selection", errors: { providers: "One of the selected providers can no longer receive enquiries. Please review the list." } };
    chosen.push(m);
  }

  const dedupeKey = keyedHash(`dedupe:${email}|${[...assessment.services].sort().join(",")}|${[...selected].sort().join(",")}`);
  const since = new Date(ctx.now.getTime() - DEDUPE_WINDOW_DAYS * 86400_000);
  const [existing] = await db
    .select({ ref: enquiries.publicRef })
    .from(enquiries)
    .where(and(eq(enquiries.dedupeKey, dedupeKey), gte(enquiries.createdAt, since), inArray(enquiries.status, ["received", "routed"])));
  if (existing) return { ok: true, ref: existing.ref, manageToken: null, duplicate: true };

  const names = chosen.map((c) => c.name);
  const consentText = enquiryConsentText(names);
  const manageToken = randomToken();
  const ref = publicRef();

  const recipientEmails = await db
    .select({ org: users.organizationId, email: users.email })
    .from(users)
    .where(and(inArray(users.organizationId, selected), eq(users.role, "provider"), eq(users.disabled, false)));

  try {
    await db.transaction(async (tx) => {
      await lockOrganizationsForCharging(tx, selected);
      const [consent] = await tx
        .insert(consents)
        .values({
          textVersion: ENQUIRY_CONSENT_VERSION,
          textHash: consentHash(consentText),
          purposes: ["share_with_selected_providers", "service_record"],
          recipientOrganizationIds: selected,
          grantedAt: ctx.now,
          ipHash,
        })
        .returning({ id: consents.id });
      const [enq] = await tx
        .insert(enquiries)
        .values({
          publicRef: ref,
          status: "routed",
          contactName: contact.data.contactName,
          contactEmail: email,
          contactPhone: contact.data.contactPhone ?? null,
          companyName: contact.data.companyName ?? null,
          assessment,
          serviceCodes: assessment.services,
          emirate: assessment.emirate,
          message: contact.data.message ?? null,
          consentId: consent!.id,
          dedupeKey,
          manageTokenHash: sha256(manageToken),
          ipHash,
          spamScore: spam.score,
          createdAt: ctx.now,
        })
        .returning({ id: enquiries.id });

      for (const m of chosen) {
        const [rec] = await tx
          .insert(enquiryRecipients)
          .values({ enquiryId: enq!.id, organizationId: m.candidateId, matchScore: m.score, matchReasons: m.reasons, createdAt: ctx.now })
          .returning({ id: enquiryRecipients.id });
        await recordLeadCharge(tx, rec!.id, m.candidateId, ctx.now);
        const to = recipientEmails.filter((r) => r.org === m.candidateId).map((r) => r.email);
        for (const addr of to)
          await enqueue(tx, {
            to: addr,
            template: "provider_new_enquiry",
            payload: {
              ref,
              orgName: m.name,
              recipientId: rec!.id,
              services: assessment.services.map((s) => SERVICE_BY_CODE[s]?.name ?? s),
              emirate: EMIRATE_BY_CODE[assessment.emirate]?.name ?? assessment.emirate,
            },
            enquiryRecipientId: rec!.id,
          }, ctx.now);
      }
      await enqueue(tx, { to: email, template: "buyer_enquiry_receipt", payload: { ref, name: contact.data.contactName, providers: names, manageToken } }, ctx.now);
      await audit(tx, PUBLIC, "enquiry.created", "enquiry", enq!.id, { ref, recipients: selected, services: assessment.services });
    });
  } catch (e) {
    // A provider filled its monthly allowance between matching and submission: nothing was written.
    if (e instanceof CapacityExceededError)
      return { ok: false, code: "ineligible_selection", errors: { providers: "One of the selected providers has just reached its monthly enquiry limit. Please review your matches." } };
    throw e;
  }

  await track(db, "enquiry_submitted", { count: chosen.length, service: assessment.services[0], emirate: assessment.emirate });
  return { ok: true, ref, manageToken, duplicate: false };
}

/** Buyer withdraws and erases an enquiry via the secret link. Recipients are told to delete their copy. */
export async function withdrawEnquiry(db: DB, manageToken: string, now = new Date()): Promise<{ ok: boolean; ref?: string }> {
  const [enq] = await db.select().from(enquiries).where(eq(enquiries.manageTokenHash, sha256(manageToken)));
  if (!enq) return { ok: false };
  if (enq.status === "erased") return { ok: true, ref: enq.publicRef };
  await eraseEnquiry(db, PUBLIC, enq.id, now);
  return { ok: true, ref: enq.publicRef };
}

export async function eraseEnquiry(db: DB, actor: Actor, enquiryId: string, now = new Date()): Promise<void> {
  await db.transaction(async (tx) => {
    const [enq] = await tx.select().from(enquiries).where(eq(enquiries.id, enquiryId)).for("update");
    if (!enq || enq.status === "erased") return;
    const recips = await tx
      .select({ id: enquiryRecipients.id, org: enquiryRecipients.organizationId })
      .from(enquiryRecipients)
      .where(and(eq(enquiryRecipients.enquiryId, enquiryId), ne(enquiryRecipients.status, "closed")));
    const orgIds = recips.map((r) => r.org);
    const providerUsers = orgIds.length
      ? await tx.select({ email: users.email }).from(users).where(and(inArray(users.organizationId, orgIds), eq(users.role, "provider")))
      : [];
    await tx
      .update(enquiries)
      .set({ status: "erased", erasedAt: now, contactName: "[erased]", contactEmail: "[erased]", contactPhone: null, companyName: null, message: null, ipHash: null })
      .where(eq(enquiries.id, enquiryId));
    // The buyer's receipt holds their name, email and manage token: remove it too.
    await tx.delete(notifications).where(and(eq(notifications.template, "buyer_enquiry_receipt"), sql`${notifications.payload}->>'ref' = ${enq.publicRef}`));
    await tx.update(enquiryRecipients).set({ status: "closed" }).where(eq(enquiryRecipients.enquiryId, enquiryId));
    for (const u of providerUsers) await enqueue(tx, { to: u.email, template: "provider_enquiry_withdrawn", payload: { ref: enq.publicRef } }, now);
    await audit(tx, actor, "enquiry.erased", "enquiry", enquiryId, { ref: enq.publicRef });
  });
}

/** Provider-facing access with an ownership check. Returns null when the user's organisation is not a recipient. */
export async function getRecipientForProvider(db: DB, organizationId: string, recipientId: string, now = new Date()) {
  if (!isUuid(recipientId) || !isUuid(organizationId)) return null;
  const [row] = await db
    .select({ rec: enquiryRecipients, enq: enquiries, org: organizations })
    .from(enquiryRecipients)
    .innerJoin(enquiries, eq(enquiries.id, enquiryRecipients.enquiryId))
    .innerJoin(organizations, eq(organizations.id, enquiryRecipients.organizationId))
    .where(and(eq(enquiryRecipients.id, recipientId), eq(enquiryRecipients.organizationId, organizationId)));
  if (!row) return null;
  if (!row.rec.viewedAt && row.enq.status !== "erased") {
    await db
      .update(enquiryRecipients)
      .set({ viewedAt: now, status: row.rec.status === "pending" || row.rec.status === "notified" ? "viewed" : row.rec.status })
      .where(eq(enquiryRecipients.id, recipientId));
  }
  return row;
}

export async function respondToEnquiry(
  db: DB,
  actor: Actor,
  organizationId: string,
  recipientId: string,
  decision: "accepted" | "declined",
  note: string | undefined,
  now = new Date(),
): Promise<boolean> {
  if (!isUuid(recipientId) || !isUuid(organizationId)) return false;
  return db.transaction(async (tx) => {
    const [rec] = await tx
      .select({ rec: enquiryRecipients, status: enquiries.status })
      .from(enquiryRecipients)
      .innerJoin(enquiries, eq(enquiries.id, enquiryRecipients.enquiryId))
      .where(and(eq(enquiryRecipients.id, recipientId), eq(enquiryRecipients.organizationId, organizationId)))
      .for("update");
    if (!rec || rec.status === "erased" || rec.rec.status === "closed") return false;
    await tx
      .update(enquiryRecipients)
      .set({ status: decision, respondedAt: now, providerNote: note?.slice(0, 1000) ?? null })
      .where(eq(enquiryRecipients.id, recipientId));
    await audit(tx, actor, `enquiry_recipient.${decision}`, "enquiry_recipient", recipientId);
    return true;
  });
}

/** Retention: erase enquiries older than the retention period (default 12 months, DECISIONS D-009). */
export async function applyRetention(db: DB, actor: Actor, now: Date, months = 12): Promise<number> {
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
  const old = await db
    .select({ id: enquiries.id })
    .from(enquiries)
    .where(and(ne(enquiries.status, "erased"), lt(enquiries.createdAt, cutoff)));
  for (const e of old) await eraseEnquiry(db, actor, e.id, now);
  return old.length;
}
