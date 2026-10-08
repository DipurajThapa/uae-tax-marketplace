/**
 * Matching latency benchmark (ENG-04). Builds N synthetic providers in a throwaway database
 * (marketplace_bench), then times loadCandidates + matchProviders. Usage: npx tsx scripts/bench-matching.ts [N]
 */
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
process.env.DATABASE_URL = "postgresql://app:app@localhost:5432/marketplace_bench";
process.env.APP_SECRET ??= "bench-secret-0123456789abcdef0123456789abcdef";
const N = Number(process.argv[2] ?? 5000);
const { getDb, closeDb } = await import("../src/db/client");
const s = await import("../src/db/schema");
const { SERVICES, CREDENTIAL_TYPES, JURISDICTIONS, INDUSTRIES, EMIRATES } = await import("../src/lib/taxonomy");
const { DEFAULT_PLANS } = await import("../src/lib/billing");
const { loadCandidates } = await import("../src/lib/providers");
const { matchProviders } = await import("../src/lib/matching");
const db = getDb();

await db.execute(sql`drop schema if exists public cascade; create schema public; drop schema if exists drizzle cascade;`);
await migrate(db, { migrationsFolder: "./drizzle" });
await db.insert(s.services).values(SERVICES.map((x, i) => ({ ...x, sortOrder: i })));
await db.insert(s.credentialTypes).values(CREDENTIAL_TYPES);
await db.insert(s.jurisdictions).values(JURISDICTIONS.map((j) => ({ ...j })));
await db.insert(s.industries).values(INDUSTRIES.map((j) => ({ ...j })));
await db.insert(s.plans).values(DEFAULT_PLANS);
const [src] = await db.insert(s.dataSources).values({ name: "bench", kind: "synthetic", termsReviewedAt: new Date() }).returning();

const t0 = Date.now();
for (let start = 0; start < N; start += 500) {
  const batch = Array.from({ length: Math.min(500, N - start) }, (_, k) => {
    const i = start + k;
    return {
      slug: `bench-${i}`, legalName: `Bench Firm ${i}`, kind: "accounting_firm" as const, emirate: EMIRATES[i % EMIRATES.length]!.code,
      listingStatus: "published" as const, claimState: "claimed" as const, isSynthetic: true, sourceId: src!.id, normalizedName: `bench firm ${i}`, languages: ["en"],
    };
  });
  const orgs = await db.insert(s.organizations).values(batch).returning({ id: s.organizations.id });
  await db.insert(s.organizationServices).values(orgs.flatMap((o, k) => [SERVICES[(start + k) % SERVICES.length]!.code, "vat-returns"].filter((v, idx, arr) => arr.indexOf(v) === idx).map((c) => ({ organizationId: o.id, serviceCode: c }))));
  await db.insert(s.users).values(orgs.map((o, k) => ({ email: `b${start + k}@bench.invalid`, name: "b", role: "provider" as const, organizationId: o.id, passwordHash: "x", emailVerifiedAt: new Date() })));
  const paid = orgs.filter((_, k) => (start + k) % 5 === 0);
  if (paid.length) await db.insert(s.subscriptions).values(paid.map((o) => ({ organizationId: o.id, planCode: "professional", status: "active" as const, billingProvider: "test", currentPeriodStart: new Date(Date.now() - 86400_000), currentPeriodEnd: new Date(Date.now() + 20 * 86400_000) })));
}
console.log(`seeded ${N} providers in ${Date.now() - t0} ms`);

process.env.ALLOW_SYNTHETIC_DATA = "true";
const a = { services: ["vat-returns"], emirate: "dubai", languages: [], answers: { revenueBand: "1m-10m", employeesBand: "10-49" } };
const times: number[] = [];
for (let i = 0; i < 15; i++) {
  const t = performance.now();
  const c = await loadCandidates(db, a.services, new Date());
  const r = matchProviders(c, a);
  times.push(performance.now() - t);
  if (i === 0) console.log(`candidates: ${c.length}, matches returned: ${r.matches.length}`);
}
times.sort((x, y) => x - y);
const p = (q: number) => times[Math.min(times.length - 1, Math.floor(q * times.length))]!.toFixed(0);
console.log(JSON.stringify({ providers: N, runs: times.length, p50_ms: Number(p(0.5)), p95_ms: Number(p(0.95)) }));
await closeDb();
