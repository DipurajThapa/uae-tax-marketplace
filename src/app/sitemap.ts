import type { MetadataRoute } from "next";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { organizations } from "@/db/schema";
import { config } from "@/lib/config";
import { SERVICES, EMIRATES } from "@/lib/taxonomy";
import { isIndexable } from "@/lib/seo";
import { listPublished } from "@/lib/articles";

export const dynamic = "force-dynamic";

/** Lists only pages that are indexable: real published providers and non-thin landing pages. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!config.allowIndexing) return [];
  const db = getDb();
  const base = config.siteUrl;
  const out: MetadataRoute.Sitemap = ["", "/providers", "/services", "/locations", "/guides", "/how-we-verify", "/how-ranking-works", "/for-providers", "/match"].map((p) => ({ url: `${base}${p}` }));
  const orgs = await db
    .select({ slug: organizations.slug, updatedAt: organizations.updatedAt })
    .from(organizations)
    .where(and(eq(organizations.listingStatus, "published"), eq(organizations.isSynthetic, false)));
  for (const o of orgs) out.push({ url: `${base}/providers/${o.slug}`, lastModified: o.updatedAt });
  for (const s of SERVICES) {
    if (await isIndexable(db, { service: s.code })) out.push({ url: `${base}/services/${s.code}` });
    for (const e of EMIRATES) if (await isIndexable(db, { service: s.code, emirate: e.code })) out.push({ url: `${base}/services/${s.code}/${e.code}` });
  }
  for (const e of EMIRATES) if (await isIndexable(db, { emirate: e.code })) out.push({ url: `${base}/locations/${e.code}` });
  for (const a of await listPublished(db)) out.push({ url: `${base}/guides/${a.slug}`, lastModified: a.updatedAt });
  return out;
}
