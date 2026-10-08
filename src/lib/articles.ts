import { and, eq, desc } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "@/db/client";
import { articles } from "@/db/schema";
import { audit, type Actor } from "./audit";
import { httpUrl } from "./validators";

export const articleSourceSchema = z.object({
  title: z.string().min(3),
  url: httpUrl(),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  accessedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/**
 * Publication gate for regulatory content: a named reviewer with a credential, a review date,
 * and at least one Tier-1 (official) source. Content must be human-written (no LLM public text).
 */
export function publicationProblems(a: typeof articles.$inferSelect): string[] {
  const problems: string[] = [];
  const sources = z.array(articleSourceSchema).safeParse(a.sources);
  if (!sources.success) problems.push("Sources are malformed");
  else if (!sources.data.some((s) => s.tier === 1)) problems.push("At least one official (Tier 1) source is required");
  if (!a.reviewerName || !a.reviewerCredential || !a.reviewedAt) problems.push("A named reviewer with credential and review date is required");
  if (a.bodyMarkdown.trim().length < 300) problems.push("Body is too short to be useful");
  return problems;
}

export async function publishArticle(db: DB, actor: Actor, id: string, now = new Date()) {
  const [a] = await db.select().from(articles).where(eq(articles.id, id));
  if (!a) throw new Error("Not found");
  const problems = publicationProblems(a);
  if (problems.length) throw new Error(problems.join("; "));
  await db.transaction(async (tx) => {
    await tx.update(articles).set({ status: "published", publishedAt: a.publishedAt ?? now, updatedAt: now }).where(eq(articles.id, id));
    await audit(tx, actor, "article.published", "article", id);
  });
}

export const listPublished = (db: DB) => db.select().from(articles).where(eq(articles.status, "published")).orderBy(desc(articles.publishedAt));
export async function getPublished(db: DB, slug: string) {
  const [a] = await db.select().from(articles).where(and(eq(articles.slug, slug), eq(articles.status, "published")));
  return a ?? null;
}
