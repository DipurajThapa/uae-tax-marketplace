import { and, eq, inArray, sql, ilike, or, lte, gt, asc, type SQL } from "drizzle-orm";
import type { DB } from "@/db/client";
import {
  organizations,
  organizationServices,
  organizationJurisdictions,
  organizationIndustries,
  credentials,
  professionals,
  promotions,
} from "@/db/schema";
import { config } from "./config";
import { capacityRemaining } from "./billing";
import type { Candidate } from "./matching";
import { CREDENTIAL_BY_CODE } from "./taxonomy";

export type SearchFilters = {
  q?: string;
  service?: string;
  emirate?: string;
  jurisdiction?: string;
  language?: string;
  kind?: string;
  verifiedOnly?: boolean;
  credential?: string;
  page?: number;
};

export const PAGE_SIZE = 20;

/** Rows that may be shown publicly: published listings; synthetic rows only where explicitly allowed. */
export function publicVisibility(): SQL {
  const base = eq(organizations.listingStatus, "published");
  return config.allowSyntheticData ? base : and(base, eq(organizations.isSynthetic, false))!;
}

export type ProviderSummary = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  emirate: string;
  city: string | null;
  languages: string[];
  services: string[];
  isSynthetic: boolean;
  claimState: string;
  credentials: { type: string; status: string; registrationNumber: string | null; verifiedAt: Date | null }[];
};

export async function searchProviders(db: DB, f: SearchFilters): Promise<{ total: number; items: ProviderSummary[] }> {
  const conds: SQL[] = [publicVisibility()];
  if (f.q) {
    const term = `%${f.q.replace(/[%_\\]/g, (m) => "\\" + m).slice(0, 80)}%`;
    conds.push(or(ilike(organizations.legalName, term), ilike(organizations.tradeName, term), ilike(organizations.description, term))!);
  }
  if (f.emirate) conds.push(eq(organizations.emirate, f.emirate));
  if (f.kind) conds.push(sql`${organizations.kind} = ${f.kind}`);
  if (f.language) conds.push(sql`${f.language} = ANY(${organizations.languages})`);
  if (f.service)
    conds.push(sql`exists (select 1 from ${organizationServices} os where os.organization_id = ${organizations.id} and os.service_code = ${f.service})`);
  if (f.jurisdiction)
    conds.push(sql`exists (select 1 from ${organizationJurisdictions} oj where oj.organization_id = ${organizations.id} and oj.jurisdiction_code = ${f.jurisdiction})`);
  if (f.verifiedOnly)
    conds.push(sql`exists (select 1 from ${credentials} c where c.organization_id = ${organizations.id} and c.status = 'verified')`);
  if (f.credential)
    conds.push(sql`exists (select 1 from ${credentials} c where c.organization_id = ${organizations.id} and c.status = 'verified' and c.credential_type = ${f.credential})`);

  const where = and(...conds);
  const [{ total } = { total: 0 }] = await db.select({ total: sql<number>`count(*)::int` }).from(organizations).where(where);
  const page = Math.max(1, Math.min(f.page ?? 1, 500));
  // Ordering is neutral (verified first, then name). Paid placement never reorders organic results.
  const rows = await db
    .select()
    .from(organizations)
    .where(where)
    .orderBy(
      sql`(exists (select 1 from ${credentials} c where c.organization_id = ${organizations.id} and c.status = 'verified')) desc`,
      asc(organizations.legalName),
    )
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);
  return { total, items: await hydrate(db, rows) };
}

async function hydrate(db: DB, rows: (typeof organizations.$inferSelect)[]): Promise<ProviderSummary[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [svc, creds] = await Promise.all([
    db.select().from(organizationServices).where(inArray(organizationServices.organizationId, ids)),
    db.select().from(credentials).where(inArray(credentials.organizationId, ids)),
  ]);
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.tradeName ?? r.legalName,
    kind: r.kind,
    emirate: r.emirate,
    city: r.city,
    languages: r.languages,
    isSynthetic: r.isSynthetic,
    claimState: r.claimState,
    services: svc.filter((s) => s.organizationId === r.id).map((s) => s.serviceCode),
    credentials: creds
      .filter((c) => c.organizationId === r.id)
      .map((c) => ({ type: c.credentialType, status: c.status, registrationNumber: c.registrationNumber, verifiedAt: c.verifiedAt })),
  }));
}

export async function getProviderBySlug(db: DB, slug: string, opts: { includeUnpublished?: boolean } = {}) {
  const where = opts.includeUnpublished ? eq(organizations.slug, slug) : and(eq(organizations.slug, slug), publicVisibility());
  const [org] = await db.select().from(organizations).where(where);
  if (!org) return null;
  return getProviderDetail(db, org);
}

export async function getProviderById(db: DB, id: string) {
  const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
  return org ? getProviderDetail(db, org) : null;
}

async function getProviderDetail(db: DB, org: typeof organizations.$inferSelect) {
  const [svc, juris, inds, creds, people] = await Promise.all([
    db.select().from(organizationServices).where(eq(organizationServices.organizationId, org.id)),
    db.select().from(organizationJurisdictions).where(eq(organizationJurisdictions.organizationId, org.id)),
    db.select().from(organizationIndustries).where(eq(organizationIndustries.organizationId, org.id)),
    db.select().from(credentials).where(eq(credentials.organizationId, org.id)),
    db.select().from(professionals).where(eq(professionals.organizationId, org.id)),
  ]);
  const peopleIds = people.map((p) => p.id);
  const personCreds = peopleIds.length
    ? await db.select().from(credentials).where(inArray(credentials.professionalId, peopleIds))
    : [];
  return {
    org,
    services: svc.map((s) => s.serviceCode),
    jurisdictions: juris.map((j) => j.jurisdictionCode),
    industries: inds.map((i) => i.industryCode),
    credentials: creds,
    people: people.map((p) => ({ ...p, credentials: personCreds.filter((c) => c.professionalId === p.id) })),
  };
}

export type ProviderDetail = NonNullable<Awaited<ReturnType<typeof getProviderById>>>;

/** Loads matching candidates for the requested services, with capacity computed from the plan in force. */
export async function loadCandidates(db: DB, serviceCodes: string[], now: Date): Promise<Candidate[]> {
  if (serviceCodes.length === 0) return [];
  const orgs = await db
    .select()
    .from(organizations)
    .where(
      and(
        publicVisibility(),
        sql`exists (select 1 from ${organizationServices} os where os.organization_id = ${organizations.id} and os.service_code in ${serviceCodes})`,
      ),
    );
  if (orgs.length === 0) return [];
  const ids = orgs.map((o) => o.id);
  const [svc, juris, inds, creds, people, cap] = await Promise.all([
    db.select().from(organizationServices).where(inArray(organizationServices.organizationId, ids)),
    db.select().from(organizationJurisdictions).where(inArray(organizationJurisdictions.organizationId, ids)),
    db.select().from(organizationIndustries).where(inArray(organizationIndustries.organizationId, ids)),
    db.select().from(credentials).where(inArray(credentials.organizationId, ids)),
    db.select({ id: professionals.id, org: professionals.organizationId }).from(professionals).where(inArray(professionals.organizationId, ids)),
    capacityRemaining(db, ids, now),
  ]);
  const personIds = people.map((p) => p.id);
  const personCreds = personIds.length ? await db.select().from(credentials).where(inArray(credentials.professionalId, personIds)) : [];
  return orgs.map((o) => {
    const myPeople = new Set(people.filter((p) => p.org === o.id).map((p) => p.id));
    return {
      id: o.id,
      name: o.tradeName ?? o.legalName,
      slug: o.slug,
      emirate: o.emirate,
      listingStatus: o.listingStatus,
      acceptingEnquiries: o.acceptingEnquiries,
      claimed: o.claimState === "claimed",
      capacityRemaining: cap.get(o.id) ?? 0,
      services: svc.filter((s) => s.organizationId === o.id).map((s) => s.serviceCode),
      jurisdictions: juris.filter((j) => j.organizationId === o.id).map((j) => j.jurisdictionCode),
      industries: inds.filter((i) => i.organizationId === o.id).map((i) => i.industryCode),
      languages: o.languages,
      sizeBand: o.sizeBand,
      credentials: [
        ...creds.filter((c) => c.organizationId === o.id).map((c) => ({ type: c.credentialType, status: c.status, holder: "organization" as const })),
        ...personCreds
          .filter((c) => c.professionalId && myPeople.has(c.professionalId))
          .map((c) => ({ type: c.credentialType, status: c.status, holder: "professional" as const })),
      ],
    };
  });
}

/** Active, clearly-labelled sponsored placements. Never mixed into organic ranking. */
export async function activePromotions(db: DB, p: { placement: string; service?: string; emirate?: string; now: Date }) {
  const conds: SQL[] = [
    eq(promotions.active, true),
    eq(promotions.placement, p.placement),
    lte(promotions.startsAt, p.now),
    gt(promotions.endsAt, p.now),
    publicVisibility(),
  ];
  if (p.service) conds.push(or(eq(promotions.serviceCode, p.service), sql`${promotions.serviceCode} is null`)!);
  if (p.emirate) conds.push(or(eq(promotions.emirate, p.emirate), sql`${promotions.emirate} is null`)!);
  const rows = await db
    .select({ org: organizations })
    .from(promotions)
    .innerJoin(organizations, eq(organizations.id, promotions.organizationId))
    .where(and(...conds))
    .orderBy(asc(organizations.legalName))
    .limit(3);
  return hydrate(db, rows.map((r) => r.org));
}

/** A badge is shown only for verified credentials; anything else is displayed as "not verified". */
export function credentialBadges(creds: { type: string; status: string }[]) {
  return creds
    .filter((c) => c.status === "verified")
    .map((c) => ({ code: c.type, label: CREDENTIAL_BY_CODE[c.type]?.name ?? c.type, regulated: !!CREDENTIAL_BY_CODE[c.type]?.regulated }));
}

export async function facetCounts(db: DB) {
  const svc = await db
    .select({ code: organizationServices.serviceCode, n: sql<number>`count(*)::int` })
    .from(organizationServices)
    .innerJoin(organizations, eq(organizations.id, organizationServices.organizationId))
    .where(publicVisibility())
    .groupBy(organizationServices.serviceCode);
  const em = await db
    .select({ code: organizations.emirate, n: sql<number>`count(*)::int` })
    .from(organizations)
    .where(publicVisibility())
    .groupBy(organizations.emirate);
  return { services: new Map(svc.map((r) => [r.code, r.n])), emirates: new Map(em.map((r) => [r.code, r.n])) };
}
