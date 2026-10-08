import { z } from "zod";
import { and, eq } from "drizzle-orm";
import type { DB } from "@/db/client";
import { professionals, credentials, credentialSubmissions } from "@/db/schema";
import { audit, type Actor } from "./audit";
import { copyViolations } from "./copy-rules";
import { randomToken } from "./crypto";
import { slugify } from "./text";
import { CREDENTIAL_BY_CODE, LANGUAGE_BY_CODE } from "./taxonomy";

/** People at a provider firm and their individual registrations (ENG-07). */
export const professionalSchema = z.object({
  fullName: z.string().trim().min(3, "Enter the person's full name").max(120),
  title: z.string().trim().max(120).optional().transform((v) => v || null),
  bio: z.string().trim().max(1500).optional().transform((v) => v || null),
  languages: z.array(z.string().refine((v) => Object.hasOwn(LANGUAGE_BY_CODE, v), "Unknown language")).max(10).default([]),
});

type Result = { ok: true; id?: string } | { ok: false; errors: Record<string, string> };
const errorsOf = (e: z.ZodError) => Object.fromEntries(e.issues.map((i) => [String(i.path[0] ?? "form"), i.message]));

export async function addProfessional(db: DB, actor: Actor, organizationId: string, input: unknown): Promise<Result> {
  const p = professionalSchema.safeParse(input);
  if (!p.success) return { ok: false, errors: errorsOf(p.error) };
  const bad = [p.data.title, p.data.bio].flatMap((t) => (t ? copyViolations(t) : []));
  if (bad.length) return { ok: false, errors: { bio: `Please remove wording that implies a guarantee, endorsement or official approval (${bad[0]}).` } };
  const slug = `${slugify(p.data.fullName) || "person"}-${randomToken(4).toLowerCase().replace(/[^a-z0-9]/g, "")}`;
  const id = await db.transaction(async (tx) => {
    const [row] = await tx.insert(professionals).values({ ...p.data, slug, organizationId }).returning({ id: professionals.id });
    await audit(tx, actor, "professional.added", "organization", organizationId, { professionalId: row!.id, fullName: p.data.fullName });
    return row!.id;
  });
  return { ok: true, id };
}

export async function updateProfessional(db: DB, actor: Actor, organizationId: string, professionalId: string, input: unknown): Promise<Result> {
  const p = professionalSchema.safeParse(input);
  if (!p.success) return { ok: false, errors: errorsOf(p.error) };
  const bad = [p.data.title, p.data.bio].flatMap((t) => (t ? copyViolations(t) : []));
  if (bad.length) return { ok: false, errors: { bio: `Please remove wording that implies a guarantee, endorsement or official approval (${bad[0]}).` } };
  return db.transaction(async (tx): Promise<Result> => {
    const [before] = await tx.select().from(professionals).where(and(eq(professionals.id, professionalId), eq(professionals.organizationId, organizationId))).for("update");
    if (!before) return { ok: false, errors: { form: "Person not found" } };
    // A name change on someone with verified registrations would carry the badge to a different name.
    const [verified] = await tx.select({ id: credentials.id }).from(credentials).where(and(eq(credentials.professionalId, professionalId), eq(credentials.status, "verified")));
    if (verified && before.fullName !== p.data.fullName) return { ok: false as const, errors: { fullName: "This person has a verified registration; contact support to change the name." } };
    await tx.update(professionals).set({ ...p.data, updatedAt: new Date() }).where(eq(professionals.id, professionalId));
    await audit(tx, actor, "professional.updated", "organization", organizationId, { professionalId, from: { fullName: before.fullName, title: before.title }, to: { fullName: p.data.fullName, title: p.data.title } });
    return { ok: true as const };
  });
}

export async function removeProfessional(db: DB, actor: Actor, organizationId: string, professionalId: string) {
  await db.transaction(async (tx) => {
    const removed = await tx
      .delete(professionals)
      .where(and(eq(professionals.id, professionalId), eq(professionals.organizationId, organizationId)))
      .returning({ id: professionals.id, fullName: professionals.fullName });
    if (removed.length === 0) throw new Error("Person not found");
    await audit(tx, actor, "professional.removed", "organization", organizationId, { professionalId, fullName: removed[0]!.fullName });
  });
}

export const individualSubmissionSchema = z.object({
  professionalId: z.string().uuid(),
  credentialType: z.string().refine((v) => Object.hasOwn(CREDENTIAL_BY_CODE, v) && CREDENTIAL_BY_CODE[v]!.subject === "professional", "Choose an individual registration or qualification"),
  registrationNumber: z.string().trim().min(3, "Enter the registration or membership number").max(50),
  evidenceNote: z.string().trim().min(10, "Tell the reviewer where to check this registration").max(1000),
});

/** Submits an individual's registration for review. The person must belong to the caller's organisation. */
export async function submitIndividualCredential(db: DB, actor: Actor, organizationId: string, input: unknown): Promise<Result> {
  if (!actor.userId) throw new Error("Sign in required");
  const parsed = individualSubmissionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: errorsOf(parsed.error) };
  const s = parsed.data;
  return db.transaction(async (tx): Promise<Result> => {
    const [person] = await tx.select().from(professionals).where(and(eq(professionals.id, s.professionalId), eq(professionals.organizationId, organizationId)));
    if (!person) return { ok: false as const, errors: { professionalId: "Choose a person from your firm" } };
    const [existing] = await tx.select().from(credentials).where(and(eq(credentials.professionalId, person.id), eq(credentials.credentialType, s.credentialType)));
    let credentialId = existing?.id;
    if (!existing) {
      const [c] = await tx
        .insert(credentials)
        .values({ credentialType: s.credentialType, professionalId: person.id, registrationNumber: s.registrationNumber, status: "pending", method: "self_declared" })
        .returning({ id: credentials.id });
      credentialId = c!.id;
    } else if (existing.status !== "verified" && existing.status !== "disputed") {
      await tx.update(credentials).set({ status: "pending", registrationNumber: s.registrationNumber }).where(eq(credentials.id, existing.id));
    }
    await tx.insert(credentialSubmissions).values({
      organizationId,
      professionalId: person.id,
      submittedBy: actor.userId!,
      credentialType: s.credentialType,
      registrationNumber: s.registrationNumber,
      evidenceNote: s.evidenceNote,
      credentialId: credentialId ?? null,
    });
    await audit(tx, actor, "credential_submission.created", "organization", organizationId, { type: s.credentialType, professionalId: person.id });
    return { ok: true as const };
  });
}
