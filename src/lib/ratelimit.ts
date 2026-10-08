import { and, eq, gte, sql, lt } from "drizzle-orm";
import type { DB } from "@/db/client";
import { rateLimitHits } from "@/db/schema";

/**
 * Sliding-window rate limit stored in Postgres. Atomic: a transaction-scoped advisory lock on
 * (bucket,key) serialises check-and-insert, so concurrent calls cannot exceed the limit.
 */
export async function rateLimit(
  db: DB,
  bucket: string,
  key: string,
  limit: number,
  windowSeconds: number,
  now: Date = new Date(),
): Promise<{ allowed: boolean; remaining: number }> {
  const since = new Date(now.getTime() - windowSeconds * 1000);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${bucket + "|" + key}, 0))`);
    const [row] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(rateLimitHits)
      .where(and(eq(rateLimitHits.bucket, bucket), eq(rateLimitHits.key, key), gte(rateLimitHits.createdAt, since)));
    const used = row?.n ?? 0;
    if (used >= limit) return { allowed: false, remaining: 0 };
    await tx.insert(rateLimitHits).values({ bucket, key, createdAt: now });
    return { allowed: true, remaining: limit - used - 1 };
  });
}

export async function pruneRateLimits(db: DB, olderThan: Date): Promise<void> {
  await db.delete(rateLimitHits).where(lt(rateLimitHits.createdAt, olderThan));
}
