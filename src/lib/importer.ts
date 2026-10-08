import { z } from "zod";
import { and, eq } from "drizzle-orm";
import type { DB } from "@/db/client";
import { dataSources, importBatches, importRows, organizations, organizationServices, organizationJurisdictions } from "@/db/schema";
import { audit, type Actor } from "./audit";
import { normalizeName, similarity, slugify, domainOf, normalizeEmail } from "./text";
import { isEmirate, SERVICE_BY_CODE, JURISDICTION_BY_CODE, LANGUAGE_BY_CODE } from "./taxonomy";

/** RFC 4180-style CSV parser (quotes, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

export const IMPORT_COLUMNS = ["legal_name", "trade_name", "kind", "emirate", "city", "website", "public_email", "public_phone", "services", "jurisdictions", "languages", "source_record_ref"] as const;

const pipeList = (dict: Record<string, unknown>, what: string) =>
  z
    .string()
    .default("")
    .transform((s) => s.split("|").map((x) => x.trim()).filter(Boolean))
    .refine((arr) => arr.every((x) => x in dict), { message: `Unknown ${what}` });

export const importRowSchema = z.object({
  legal_name: z.string().trim().min(2).max(200),
  trade_name: z.string().trim().max(200).default(""),
  kind: z.enum(["tax_agency", "accounting_firm", "einvoicing_provider", "law_firm", "independent_consultant"]),
  emirate: z.string().trim().refine(isEmirate, "Unknown emirate"),
  city: z.string().trim().max(100).default(""),
  website: z.string().trim().max(200).default("").refine((v) => v === "" || domainOf(v) !== null, "Invalid website"),
  public_email: z.string().trim().max(200).default("").refine((v) => v === "" || z.string().email().safeParse(v).success, "Invalid email"),
  public_phone: z.string().trim().max(30).default(""),
  services: pipeList(SERVICE_BY_CODE, "service"),
  jurisdictions: pipeList(JURISDICTION_BY_CODE, "jurisdiction"),
  languages: pipeList(LANGUAGE_BY_CODE, "language"),
  source_record_ref: z.string().trim().max(100).default(""),
});

export type ExistingOrg = { id: string; normalizedName: string; emirate: string; website: string | null };

/** Duplicate if same normalised name, near-identical name in the same emirate, or same website domain. */
export function findDuplicate(row: { legal_name: string; emirate: string; website: string }, existing: ExistingOrg[]): string | null {
  const n = normalizeName(row.legal_name);
  const d = domainOf(row.website);
  for (const e of existing) {
    if (e.normalizedName === n) return e.id;
    if (d && domainOf(e.website) === d) return e.id;
    if (e.emirate === row.emirate && similarity(e.normalizedName, n) >= 0.92) return e.id;
  }
  return null;
}

export class ImportBlockedError extends Error {}

/** Stage a CSV: validate every row and detect duplicates, without creating any listing. */
export async function stageImport(db: DB, actor: Actor, sourceId: string, filename: string, csv: string) {
  if (!actor.userId) throw new Error("Imports need a named operator");
  const [source] = await db.select().from(dataSources).where(eq(dataSources.id, sourceId));
  if (!source) throw new ImportBlockedError("Unknown data source");
  // Lawful-sourcing gate (DECISIONS D-003): terms must have been reviewed and must permit reuse.
  if (!source.termsReviewedAt) throw new ImportBlockedError(`Source "${source.name}" has no terms review recorded. Import refused.`);
  if (source.kind === "official_register") throw new ImportBlockedError(`Bulk import from an official register needs the issuer's written consent; record it as a separate source.`);

  const rows = parseCsv(csv);
  const header = (rows.shift() ?? []).map((h) => h.trim().toLowerCase());
  const missing = ["legal_name", "kind", "emirate", "services"].filter((c) => !header.includes(c));
  if (missing.length) throw new ImportBlockedError(`Missing columns: ${missing.join(", ")}`);

  const existing: ExistingOrg[] = await db
    .select({ id: organizations.id, normalizedName: organizations.normalizedName, emirate: organizations.emirate, website: organizations.website })
    .from(organizations);
  const seenInBatch: ExistingOrg[] = [];

  return db.transaction(async (tx) => {
    const [batch] = await tx.insert(importBatches).values({ sourceId, filename, createdBy: actor.userId! }).returning({ id: importBatches.id });
    const summary = { valid: 0, invalid: 0, duplicate: 0 };
    for (let i = 0; i < rows.length; i++) {
      const raw = Object.fromEntries(header.map((h, j) => [h, rows[i]![j] ?? ""]));
      const parsed = importRowSchema.safeParse(raw);
      if (!parsed.success) {
        summary.invalid++;
        await tx.insert(importRows).values({ batchId: batch!.id, rowNumber: i + 2, raw, state: "invalid", errors: parsed.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`) });
        continue;
      }
      const dupe = findDuplicate(parsed.data, [...existing, ...seenInBatch]);
      if (dupe && existing.some((e) => e.id === dupe)) {
        summary.duplicate++;
        await tx.insert(importRows).values({ batchId: batch!.id, rowNumber: i + 2, raw, state: "duplicate", duplicateOfOrganizationId: dupe });
        continue;
      }
      if (dupe) {
        summary.duplicate++;
        await tx.insert(importRows).values({ batchId: batch!.id, rowNumber: i + 2, raw, state: "duplicate", errors: ["Duplicate of an earlier row in this file"] });
        continue;
      }
      seenInBatch.push({ id: `row-${i}`, normalizedName: normalizeName(parsed.data.legal_name), emirate: parsed.data.emirate, website: parsed.data.website || null });
      summary.valid++;
      await tx.insert(importRows).values({ batchId: batch!.id, rowNumber: i + 2, raw, state: "valid" });
    }
    await audit(tx, actor, "import.staged", "import_batch", batch!.id, { sourceId, filename, ...summary });
    return { batchId: batch!.id, ...summary };
  });
}

/** Commit valid rows as DRAFT, UNCLAIMED listings with no credentials. Nothing becomes public until reviewed. */
export async function commitImport(db: DB, actor: Actor, batchId: string, now = new Date()) {
  return db.transaction(async (tx) => {
    const [batch] = await tx.select().from(importBatches).where(eq(importBatches.id, batchId)).for("update");
    if (!batch || batch.state !== "staged") throw new Error("Batch is not staged");
    const [source] = await tx.select().from(dataSources).where(eq(dataSources.id, batch.sourceId));
    const valid = await tx.select().from(importRows).where(eq(importRows.batchId, batchId));
    let created = 0;
    for (const r of valid.filter((x) => x.state === "valid")) {
      const d = importRowSchema.parse(r.raw);
      const normalized = normalizeName(d.legal_name);
      const [clash] = await tx.select({ id: organizations.id }).from(organizations).where(eq(organizations.normalizedName, normalized));
      if (clash) {
        await tx.update(importRows).set({ state: "duplicate", duplicateOfOrganizationId: clash.id }).where(eq(importRows.id, r.id));
        continue;
      }
      let slug = slugify(d.trade_name || d.legal_name);
      const [taken] = await tx.select({ id: organizations.id }).from(organizations).where(eq(organizations.slug, slug));
      if (taken) slug = `${slug}-${r.rowNumber}`;
      const [org] = await tx
        .insert(organizations)
        .values({
          slug,
          legalName: d.legal_name,
          tradeName: d.trade_name || null,
          kind: d.kind,
          emirate: d.emirate,
          city: d.city || null,
          website: d.website || null,
          publicEmail: d.public_email ? normalizeEmail(d.public_email) : null,
          publicPhone: d.public_phone || null,
          languages: d.languages,
          listingStatus: "draft",
          claimState: "unclaimed",
          sourceId: batch.sourceId,
          sourceRecordRef: d.source_record_ref || null,
          isSynthetic: source?.kind === "synthetic",
          normalizedName: normalized,
          createdAt: now,
        })
        .returning({ id: organizations.id });
      if (d.services.length) await tx.insert(organizationServices).values(d.services.map((s) => ({ organizationId: org!.id, serviceCode: s })));
      if (d.jurisdictions.length) await tx.insert(organizationJurisdictions).values(d.jurisdictions.map((j) => ({ organizationId: org!.id, jurisdictionCode: j })));
      await tx.update(importRows).set({ state: "committed", committedOrganizationId: org!.id }).where(eq(importRows.id, r.id));
      created++;
    }
    await tx.update(importBatches).set({ state: "committed", committedAt: now }).where(eq(importBatches.id, batchId));
    await audit(tx, actor, "import.committed", "import_batch", batchId, { created });
    return { created };
  });
}

export async function discardImport(db: DB, actor: Actor, batchId: string) {
  await db.transaction(async (tx) => {
    const updated = await tx
      .update(importBatches)
      .set({ state: "discarded" })
      .where(and(eq(importBatches.id, batchId), eq(importBatches.state, "staged")))
      .returning({ id: importBatches.id });
    if (updated.length === 0) throw new Error("Only a staged batch can be discarded");
    await tx.update(importRows).set({ state: "skipped" }).where(and(eq(importRows.batchId, batchId), eq(importRows.state, "valid")));
    await audit(tx, actor, "import.discarded", "import_batch", batchId);
  });
}
