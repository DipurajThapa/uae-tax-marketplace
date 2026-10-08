import { and, eq, gte, sql, lt } from "drizzle-orm";
import type { DB } from "@/db/client";
import { rateLimitHits } from "@/db/schema";

/** Sliding-window rate limit stored in Postgres (no extra infrastructure needed). */
export async function rateLimit(
  db: DB,
  bucket: string,
  key: string,
  limit: number,
  windowSeconds: number,
  now: Date = new Date(),
): Promise<{ allowed: boolean; remaining: number }> {
  const since = new Date(now.getTime() - windowSeconds * 1000);
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(rateLimitHits)
    .where(and(eq(rateLimitHits.bucket, bucket), eq(rateLimitHits.key, key), gte(rateLimitHits.createdAt, since)));
  const used = row?.n ?? 0;
  if (used >= limit) return { allowed: false, remaining: 0 };
  await db.insert(rateLimitHits).values({ bucket, key, createdAt: now });
  return { allowed: true, remaining: limit - used - 1 };
}

export async function pruneRateLimits(db: DB, olderThan: Date): Promise<void> {
  await db.delete(rateLimitHits).where(lt(rateLimitHits.createdAt, olderThan));
}
