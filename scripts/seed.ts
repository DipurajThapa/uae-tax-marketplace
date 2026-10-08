/**
 * Seeds reference data (idempotent). With --demo, also loads SYNTHETIC demo providers,
 * which are flagged is_synthetic=true, labelled "(Demo)", cannot hold verified credentials
 * (DB trigger), and are hidden whenever ALLOW_SYNTHETIC_DATA is not true.
 */
import { eq, sql } from "drizzle-orm";
import { loadEnv } from "./env";
loadEnv();
const { getDb, closeDb } = await import("../src/db/client");
const s = await import("../src/db/schema");
const { SERVICES, CREDENTIAL_TYPES, JURISDICTIONS, INDUSTRIES } = await import("../src/lib/taxonomy");
const { DEFAULT_PLANS } = await import("../src/lib/billing");
const { hashPassword } = await import("../src/lib/crypto");
const { normalizeName, slugify } = await import("../src/lib/text");

const db = getDb();
const demo = process.argv.includes("--demo");

export const SOURCES = [
  { name: "Provider self-submission", kind: "provider_submission" as const, url: null, termsReviewedAt: new Date("2026-10-08"), termsNotes: "Data supplied by the provider under the listing consent (listing-v1-draft)." },
  {
    name: "FTA tax agent register (single-record lookup only)",
    kind: "official_register" as const,
    url: "https://tax.gov.ae",
    termsReviewedAt: null,
    termsNotes: "Per research ledger 2026-10-08: site terms prohibit copying/storing/redistributing content without FTA written consent. Use only to check individual registrations by hand. Bulk import blocked.",
  },
  {
    name: "MoF accredited e-invoicing service provider list (single-record lookup only)",
    kind: "official_register" as const,
    url: "https://mof.gov.ae",
    termsReviewedAt: null,
    termsNotes: "Per research ledger 2026-10-08: reproduction requires permission. Use only to check individual accreditations by hand.",
  },
  { name: "Synthetic demo data", kind: "synthetic" as const, url: null, termsReviewedAt: new Date("2026-10-08"), termsNotes: "Fabricated for development and tests only. Never shown in production." },
];

async function seedReference() {
  for (const [i, x] of SERVICES.entries())
    await db.insert(s.services).values({ ...x, sortOrder: i }).onConflictDoUpdate({ target: s.services.code, set: { name: x.name, category: x.category, description: x.description, requiredCredentialTypes: x.requiredCredentialTypes, sortOrder: i } });
  for (const x of CREDENTIAL_TYPES)
    await db.insert(s.credentialTypes).values(x).onConflictDoUpdate({ target: s.credentialTypes.code, set: { name: x.name, issuer: x.issuer, regulated: x.regulated, recheckDays: x.recheckDays, description: x.description } });
  for (const x of JURISDICTIONS)
    await db.insert(s.jurisdictions).values({ ...x }).onConflictDoUpdate({ target: s.jurisdictions.code, set: { name: x.name } });
  for (const x of INDUSTRIES) await db.insert(s.industries).values({ ...x }).onConflictDoUpdate({ target: s.industries.code, set: { name: x.name } });
  for (const p of DEFAULT_PLANS)
    await db.insert(s.plans).values(p).onConflictDoNothing();
  for (const src of SOURCES) {
    const [exists] = await db.select().from(s.dataSources).where(eq(s.dataSources.name, src.name));
    if (!exists) await db.insert(s.dataSources).values(src);
  }
}

async function ensureUser(email: string, name: string, role: "admin" | "reviewer" | "provider", password: string, organizationId: string | null = null) {
  const [u] = await db.select().from(s.users).where(eq(s.users.email, email));
  if (u) return u.id;
  const [row] = await db.insert(s.users).values({ email, name, role, organizationId, passwordHash: await hashPassword(password) }).returning({ id: s.users.id });
  return row!.id;
}

async function seedStaff() {
  const pw = process.env.SEED_ADMIN_PASSWORD ?? (demo ? "admin-password-dev" : undefined);
  if (!pw) {
    console.log("SEED_ADMIN_PASSWORD not set: no admin user created.");
    return;
  }
  await ensureUser("admin@example.invalid", "Admin (dev)", "admin", pw);
  await ensureUser("reviewer@example.invalid", "Reviewer (dev)", "reviewer", pw);
}

// Deterministic pseudo-random generator so demo data is reproducible.
function rng(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
}

async function seedDemo() {
  const [src] = await db.select().from(s.dataSources).where(eq(s.dataSources.kind, "synthetic"));
  const rand = rng(42);
  const pick = <T,>(arr: readonly T[], n: number) => [...arr].sort(() => rand() - 0.5).slice(0, n);
  const emirates = ["dubai", "dubai", "dubai", "abu-dhabi", "abu-dhabi", "sharjah", "ras-al-khaimah", "ajman"];
  const kinds = ["tax_agency", "accounting_firm", "accounting_firm", "einvoicing_provider", "independent_consultant", "law_firm"] as const;
  const prefixes = ["Alpha", "Bravo", "Cedar", "Delta", "Falcon", "Harbour", "Juniper", "Lumen", "Meridian", "Oasis", "Pearl", "Quartz", "Saffron", "Summit", "Tidewater", "Zenith", "Atlas", "Crescent", "Dune", "Marina"];
  const langs = ["en", "ar", "hi", "ur", "ml", "tl", "fr", "ru"];
  const svcByKind: Record<string, string[]> = {
    tax_agency: ["corporate-tax-registration", "corporate-tax-returns", "corporate-tax-advisory", "vat-registration", "vat-returns", "vat-advisory", "fta-representation", "transfer-pricing", "free-zone-tax", "excise-tax"],
    accounting_firm: ["bookkeeping", "financial-statements", "vat-returns", "vat-registration", "corporate-tax-returns", "corporate-tax-registration", "einvoicing-readiness"],
    einvoicing_provider: ["einvoicing-asp", "einvoicing-erp-integration", "einvoicing-readiness"],
    independent_consultant: ["corporate-tax-advisory", "vat-advisory", "free-zone-tax", "einvoicing-readiness"],
    law_firm: ["corporate-tax-advisory", "transfer-pricing", "fta-representation"],
  };
  for (let i = 0; i < prefixes.length; i++) {
    const kind = kinds[i % kinds.length]!;
    const emirate = emirates[i % emirates.length]!;
    const label = kind === "einvoicing_provider" ? "E-Invoicing" : kind === "law_firm" ? "Legal" : kind === "independent_consultant" ? "Consulting" : kind === "tax_agency" ? "Tax Agency" : "Accounting";
    const legalName = `${prefixes[i]} ${label} (Demo)`;
    const slug = slugify(`${prefixes[i]}-${label}-demo`);
    const [exists] = await db.select({ id: s.organizations.id }).from(s.organizations).where(eq(s.organizations.slug, slug));
    if (exists) continue;
    const claimed = i % 3 !== 2;
    const [org] = await db
      .insert(s.organizations)
      .values({
        slug,
        legalName,
        kind,
        emirate,
        city: emirate === "dubai" ? "Dubai" : null,
        website: `https://${slug}.example`,
        publicEmail: `contact@${slug}.example`,
        description: "Synthetic demo listing used for development and testing. Not a real business.",
        languages: ["en", ...pick(langs.slice(1), 1 + Math.floor(rand() * 2))],
        sizeBand: pick(["1-9", "10-49", "50-249", "250+"], 1)[0]!,
        foundedYear: 2005 + Math.floor(rand() * 18),
        listingStatus: i === prefixes.length - 1 ? "draft" : "published",
        claimState: claimed ? "claimed" : "unclaimed",
        acceptingEnquiries: i !== 4,
        sourceId: src!.id,
        isSynthetic: true,
        normalizedName: normalizeName(legalName),
      })
      .returning({ id: s.organizations.id });
    const services = pick(svcByKind[kind]!, 3 + Math.floor(rand() * 3));
    await db.insert(s.organizationServices).values(services.map((c) => ({ organizationId: org!.id, serviceCode: c })));
    const juris = JURISDICTIONS.filter((j) => j.emirate === emirate).map((j) => j.code);
    await db.insert(s.organizationJurisdictions).values(pick(juris, Math.min(2, juris.length)).map((c) => ({ organizationId: org!.id, jurisdictionCode: c })));
    await db.insert(s.organizationIndustries).values(pick(INDUSTRIES.map((x) => x.code), 3).map((c) => ({ organizationId: org!.id, industryCode: c })));
    // Synthetic credentials are self-declared only; the DB forbids marking them verified.
    if (kind === "tax_agency") await db.insert(s.credentials).values({ credentialType: "FTA_TAX_AGENCY", organizationId: org!.id, registrationNumber: `DEMO-${1000 + i}`, status: "pending", method: "self_declared", sourceId: src!.id });
    if (kind === "einvoicing_provider") await db.insert(s.credentials).values({ credentialType: "MOF_EINVOICING_ASP", organizationId: org!.id, registrationNumber: `DEMO-ASP-${i}`, status: "unverified", method: "self_declared", sourceId: src!.id });
    if (claimed) await ensureUser(`provider${String(i + 1).padStart(2, "0")}@example.invalid`, `Demo user ${i + 1}`, "provider", "provider-password-dev", org!.id);
  }
  console.log("demo data loaded (synthetic)");
}

await seedReference();
await seedStaff();
if (demo) await seedDemo();
const [{ n } = { n: 0 }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.organizations);
console.log(`reference data seeded; organizations: ${n}`);
await closeDb();
