import { z } from "zod";
import { and, eq } from "drizzle-orm";
import type { DB } from "@/db/client";
import {
  organizations,
  organizationServices,
  organizationJurisdictions,
  organizationIndustries,
  credentialSubmissions,
  credentials,
} from "@/db/schema";
import { audit, type Actor } from "./audit";
import { effectivePlan } from "./billing";
import { SERVICE_BY_CODE, JURISDICTION_BY_CODE, INDUSTRY_BY_CODE, LANGUAGE_BY_CODE, CREDENTIAL_BY_CODE } from "./taxonomy";

const codes = (dict: Record<string, unknown>) => z.array(z.string().refine((v) => v in dict, "Unknown value")).max(30);

/** Fields a provider may change directly. Legal name, kind and credentials need review. */
export const profileUpdateSchema = z.object({
  tradeName: z.string().trim().max(200).optional().transform((v) => v || null),
  city: z.string().trim().max(100).optional().transform((v) => v || null),
  address: z.string().trim().max(300).optional().transform((v) => v || null),
  website: z.string().trim().url().max(200).optional().or(z.literal("").transform(() => undefined)).transform((v) => v ?? null),
  publicEmail: z.string().trim().email().max(200).optional().or(z.literal("").transform(() => undefined)).transform((v) => v ?? null),
  publicPhone: z.string().trim().max(30).regex(/^[+0-9 ()-]*$/).optional().transform((v) => v || null),
  description: z.string().trim().max(4000).optional().transform((v) => v || null),
  sizeBand: z.enum(["1-9", "10-49", "50-249", "250+"]).optional().or(z.literal("").transform(() => undefined)).transform((v) => v ?? null),
  foundedYear: z.coerce.number().int().min(1950).max(2100).optional().or(z.literal("").transform(() => undefined)).transform((v) => v ?? null),
  acceptingEnquiries: z.boolean(),
  languages: codes(LANGUAGE_BY_CODE),
  services: codes(SERVICE_BY_CODE).min(1, "Choose at least one service"),
  jurisdictions: codes(JURISDICTION_BY_CODE),
  industries: codes(INDUSTRY_BY_CODE),
});

export async function updateOwnProfile(db: DB, actor: Actor, organizationId: string, input: unknown, now = new Date()) {
  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, errors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  const p = parsed.data;
  const plan = await effectivePlan(db, organizationId, now);
  if (p.description && p.description.length > plan.features.maxDescriptionChars)
    return { ok: false as const, errors: { description: `Your plan allows up to ${plan.features.maxDescriptionChars} characters` } };
  await db.transaction(async (tx) => {
    const { services, jurisdictions, industries, ...fields } = p;
    await tx.update(organizations).set({ ...fields, updatedAt: now }).where(eq(organizations.id, organizationId));
    await tx.delete(organizationServices).where(eq(organizationServices.organizationId, organizationId));
    await tx.insert(organizationServices).values(services.map((s) => ({ organizationId, serviceCode: s })));
    await tx.delete(organizationJurisdictions).where(eq(organizationJurisdictions.organizationId, organizationId));
    if (jurisdictions.length) await tx.insert(organizationJurisdictions).values(jurisdictions.map((j) => ({ organizationId, jurisdictionCode: j })));
    await tx.delete(organizationIndustries).where(eq(organizationIndustries.organizationId, organizationId));
    if (industries.length) await tx.insert(organizationIndustries).values(industries.map((i) => ({ organizationId, industryCode: i })));
    await audit(tx, actor, "organization.profile_updated", "organization", organizationId, { fields: Object.keys(fields) });
  });
  return { ok: true as const };
}

export const credentialSubmissionSchema = z.object({
  credentialType: z.string().refine((v) => CREDENTIAL_BY_CODE[v]?.subject === "organization", "Choose a firm-level registration"),
  registrationNumber: z.string().trim().min(3).max(50),
  evidenceNote: z.string().trim().min(10, "Tell the reviewer where to check this registration").max(1000),
});

export async function submitCredential(db: DB, actor: Actor, organizationId: string, input: unknown) {
  if (!actor.userId) throw new Error("Sign in required");
  const parsed = credentialSubmissionSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, errors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  const s = parsed.data;
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(credentials)
      .where(and(eq(credentials.organizationId, organizationId), eq(credentials.credentialType, s.credentialType)));
    let credentialId = existing?.id;
    if (!existing) {
      const [c] = await tx
        .insert(credentials)
        .values({ credentialType: s.credentialType, organizationId, registrationNumber: s.registrationNumber, status: "pending", method: "self_declared" })
        .returning({ id: credentials.id });
      credentialId = c!.id;
    } else if (existing.status !== "verified" && existing.status !== "disputed") {
      await tx.update(credentials).set({ status: "pending", registrationNumber: s.registrationNumber }).where(eq(credentials.id, existing.id));
    }
    await tx.insert(credentialSubmissions).values({ organizationId, submittedBy: actor.userId!, ...s, credentialId: credentialId ?? null });
    await audit(tx, actor, "credential_submission.created", "organization", organizationId, { type: s.credentialType });
  });
  return { ok: true as const };
}

export async function setListingStatus(db: DB, actor: Actor, organizationId: string, status: "published" | "suspended" | "draft" | "removed", note: string, now = new Date()) {
  await db.transaction(async (tx) => {
    await tx.update(organizations).set({ listingStatus: status, lastReviewedAt: now, updatedAt: now }).where(eq(organizations.id, organizationId));
    await audit(tx, actor, `organization.${status}`, "organization", organizationId, { note });
  });
}
