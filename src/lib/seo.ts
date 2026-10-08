import { and, eq, sql } from "drizzle-orm";
import type { DB } from "@/db/client";
import { organizations, organizationServices } from "@/db/schema";
import { config } from "./config";

/** A landing page is indexable only with enough real, published providers to be useful (no thin pages). */
export const MIN_INDEXABLE_PROVIDERS = 3;

export async function realProviderCount(db: DB, f: { service?: string; emirate?: string }): Promise<number> {
  const conds = [eq(organizations.listingStatus, "published"), eq(organizations.isSynthetic, false)];
  if (f.emirate) conds.push(eq(organizations.emirate, f.emirate));
  if (f.service)
    conds.push(sql`exists (select 1 from ${organizationServices} os where os.organization_id = ${organizations.id} and os.service_code = ${f.service})`);
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(organizations).where(and(...conds));
  return r?.n ?? 0;
}

export async function isIndexable(db: DB, f: { service?: string; emirate?: string }): Promise<boolean> {
  if (!config.allowIndexing) return false;
  return (await realProviderCount(db, f)) >= MIN_INDEXABLE_PROVIDERS;
}

export const robotsFor = (indexable: boolean) => (indexable ? undefined : { index: false, follow: true });
