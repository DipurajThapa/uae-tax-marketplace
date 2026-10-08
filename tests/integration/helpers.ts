import { sql, eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDb } from "@/db/client";
import * as s from "@/db/schema";
import { SERVICES, CREDENTIAL_TYPES, JURISDICTIONS, INDUSTRIES } from "@/lib/taxonomy";
import { DEFAULT_PLANS } from "@/lib/billing";
import { hashPassword } from "@/lib/crypto";
import { normalizeName, slugify } from "@/lib/text";
import { userActor } from "@/lib/audit";
import { verifyCredential } from "@/lib/verification";
import type { MailTransport, Mail } from "@/lib/notify";

let migrated = false;
const db = () => getDb();

export async function resetDb() {
  if (!migrated) {
    await migrate(db(), { migrationsFolder: "./drizzle" });
    migrated = true;
  }
  const tables = await db().execute(sql`select tablename from pg_tables where schemaname = 'public'`);
  const names = (tables.rows as { tablename: string }[]).map((r) => `"${r.tablename}"`).join(", ");
  // TRUNCATE bypasses row triggers, so the append-only audit_log can still be reset between tests.
  await db().execute(sql.raw(`TRUNCATE ${names} RESTART IDENTITY CASCADE`));
  for (const [i, x] of SERVICES.entries()) await db().insert(s.services).values({ ...x, sortOrder: i });
  await db().insert(s.credentialTypes).values(CREDENTIAL_TYPES);
  await db().insert(s.jurisdictions).values(JURISDICTIONS.map((j) => ({ ...j })));
  await db().insert(s.industries).values(INDUSTRIES.map((j) => ({ ...j })));
  await db().insert(s.plans).values(DEFAULT_PLANS);
  await db().insert(s.dataSources).values([
    { name: "Provider self-submission", kind: "provider_submission", termsReviewedAt: new Date() },
    { name: "FTA register", kind: "official_register", termsReviewedAt: null },
    { name: "Synthetic", kind: "synthetic", termsReviewedAt: new Date() },
    { name: "Manual research (reviewed)", kind: "manual_research", termsReviewedAt: new Date() },
  ]);
}

export async function makeUser(role: "admin" | "reviewer" | "provider", email: string, organizationId: string | null = null) {
  const [u] = await db().insert(s.users).values({ email, name: email, role, organizationId, passwordHash: await hashPassword("password-123456") }).returning();
  return u!;
}

let counter = 0;
export async function makeOrg(o: Partial<typeof s.organizations.$inferInsert> & { services?: string[]; verified?: string[]; withUser?: boolean } = {}) {
  const n = ++counter;
  const legalName = o.legalName ?? `Test Firm ${n}`;
  const { services = ["vat-returns"], verified = [], withUser = true, ...rest } = o;
  const [org] = await db()
    .insert(s.organizations)
    .values({
      slug: slugify(legalName),
      legalName,
      kind: "tax_agency",
      emirate: "dubai",
      listingStatus: "published",
      claimState: "claimed",
      normalizedName: normalizeName(legalName),
      languages: ["en"],
      website: `https://firm${n}.example`,
      ...rest,
    })
    .returning();
  await db().insert(s.organizationServices).values(services.map((c) => ({ organizationId: org!.id, serviceCode: c })));
  let user: typeof s.users.$inferSelect | undefined;
  if (withUser) user = await makeUser("provider", `owner${n}@firm${n}.example`, org!.id);
  if (verified.length) {
    const [reviewer] = await db().select().from(s.users).where(eq(s.users.role, "reviewer"));
    const r = reviewer ?? (await makeUser("reviewer", `rev${n}@example.invalid`));
    for (const type of verified) {
      const [c] = await db().insert(s.credentials).values({ credentialType: type, organizationId: org!.id, registrationNumber: `T-${n}`, status: "pending" }).returning();
      await verifyCredential(db(), userActor(r.id), c!.id, { method: "official_register", evidenceNote: "Checked on official register (test fixture)" });
    }
  }
  return { org: org!, user };
}

export class MemoryTransport implements MailTransport {
  sent: Mail[] = [];
  failNext = 0;
  async send(m: Mail) {
    if (this.failNext > 0) {
      this.failNext--;
      throw new Error("simulated SMTP failure");
    }
    this.sent.push(m);
  }
}

export const answers = (o: Record<string, unknown> = {}) => ({
  services: ["vat-returns"],
  emirate: "dubai",
  companyStage: "established",
  revenueBand: "1m-10m",
  employeesBand: "10-49",
  vatRegistered: "yes",
  urgency: "this-month",
  ...o,
});

/** Drizzle wraps Postgres errors; match against the message chain. */
export async function expectDbError(p: Promise<unknown>, re: RegExp) {
  try {
    await p;
  } catch (e) {
    const chain: string[] = [];
    let cur: unknown = e;
    while (cur && typeof cur === "object") {
      chain.push(String((cur as Error).message));
      cur = (cur as { cause?: unknown }).cause;
    }
    if (!chain.some((m) => re.test(m))) throw new Error(`Error did not match ${re}: ${chain.join(" | ")}`);
    return;
  }
  throw new Error(`Expected rejection matching ${re}`);
}
