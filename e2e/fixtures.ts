import { sql, eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDb, closeDb } from "../src/db/client";
import * as s from "../src/db/schema";
import { SERVICES, CREDENTIAL_TYPES, JURISDICTIONS, INDUSTRIES } from "../src/lib/taxonomy";
import { DEFAULT_PLANS } from "../src/lib/billing";
import { hashPassword } from "../src/lib/crypto";
import { normalizeName, slugify } from "../src/lib/text";
import { verifyCredential } from "../src/lib/verification";
import { userActor } from "../src/lib/audit";

const db = getDb();
await db.execute(sql`drop schema if exists public cascade; create schema public; drop schema if exists drizzle cascade;`);
await migrate(db, { migrationsFolder: "./drizzle" });
for (const [i, x] of SERVICES.entries()) await db.insert(s.services).values({ ...x, sortOrder: i });
await db.insert(s.credentialTypes).values(CREDENTIAL_TYPES);
await db.insert(s.jurisdictions).values(JURISDICTIONS.map((j) => ({ ...j })));
await db.insert(s.industries).values(INDUSTRIES.map((j) => ({ ...j })));
await db.insert(s.plans).values(DEFAULT_PLANS);
const [src] = await db.insert(s.dataSources).values([
  { name: "Provider self-submission", kind: "provider_submission", termsReviewedAt: new Date() },
  { name: "Manual research (reviewed)", kind: "manual_research", termsReviewedAt: new Date() },
]).returning();

const pw = await hashPassword("e2e-password-123");
const [admin] = await db.insert(s.users).values({ email: "admin@e2e.invalid", name: "E2E Admin", role: "admin", passwordHash: pw }).returning();
await db.insert(s.users).values({ email: "reviewer@e2e.invalid", name: "E2E Reviewer", role: "reviewer", passwordHash: pw });

async function org(name: string, o: { services: string[]; emirate?: string; claimed?: boolean; verify?: string[]; languages?: string[]; user?: string }) {
  const [row] = await db
    .insert(s.organizations)
    .values({
      slug: slugify(name), legalName: name, kind: "tax_agency", emirate: o.emirate ?? "dubai", city: "Dubai", website: `https://${slugify(name)}.example`,
      listingStatus: "published", claimState: o.claimed === false ? "unclaimed" : "claimed", languages: o.languages ?? ["en"], sizeBand: "10-49",
      normalizedName: normalizeName(name), sourceId: src!.id, description: "E2E fixture provider.",
    })
    .returning();
  await db.insert(s.organizationServices).values(o.services.map((c) => ({ organizationId: row!.id, serviceCode: c })));
  await db.insert(s.organizationJurisdictions).values({ organizationId: row!.id, jurisdictionCode: `${o.emirate ?? "dubai"}-mainland` });
  for (const t of o.verify ?? []) {
    const [c] = await db.insert(s.credentials).values({ credentialType: t, organizationId: row!.id, registrationNumber: "E2E-0001", status: "pending" }).returning();
    await verifyCredential(db, userActor(admin!.id), c!.id, { method: "official_register", evidenceNote: "E2E fixture: checked against register" });
  }
  if (o.user) await db.insert(s.users).values({ email: o.user, name: `${name} owner`, role: "provider", organizationId: row!.id, passwordHash: pw });
  return row!;
}

await org("E2E Verified Tax Agency", { services: ["vat-returns", "fta-representation", "corporate-tax-returns"], verify: ["FTA_TAX_AGENCY"], languages: ["en", "ar"], user: "agency@e2e.invalid" });
await org("E2E Bookkeepers", { services: ["vat-returns", "bookkeeping"], user: "books@e2e.invalid" });
await org("E2E Unclaimed Firm", { services: ["vat-returns"], claimed: false });
await org("E2E Unverified Representation", { services: ["fta-representation"], user: "unverified@e2e.invalid" });
const [check] = await db.select({ n: sql<number>`count(*)::int` }).from(s.organizations).where(eq(s.organizations.listingStatus, "published"));
console.log(`e2e fixtures ready (${check!.n} providers)`);
await closeDb();
