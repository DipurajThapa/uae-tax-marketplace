import { and, eq, desc } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "@/db/client";
import { articles } from "@/db/schema";
import { audit, type Actor } from "./audit";
import { httpUrl } from "./validators";
import { copyViolations } from "./copy-rules";

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
  const copy = copyViolations(`${a.title}\n${a.summary}\n${a.bodyMarkdown}`);
  if (copy.length) problems.push(`Copy rules: ${copy.join(", ")}`);
  if (a.reviewedAt && Date.now() - a.reviewedAt.getTime() > 365 * 86400_000) problems.push("The review is more than a year old; review it again");
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

// ---------- Editor (ENG-09) ----------

/** One source per line: "tier | YYYY-MM-DD | title | https://url". */
export function parseSourcesText(text: string): { sources: z.infer<typeof articleSourceSchema>[]; errors: string[] } {
  const sources: z.infer<typeof articleSourceSchema>[] = [];
  const errors: string[] = [];
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line, i) => {
      const [tier, accessedAt, title, url] = line.split("|").map((x) => x.trim());
      const parsed = articleSourceSchema.safeParse({ tier: Number(tier), accessedAt, title, url });
      if (parsed.success) sources.push(parsed.data);
      else errors.push(`Source line ${i + 1}: use "tier | YYYY-MM-DD | title | https://url" (tier 1 = official)`);
    });
  return { sources, errors };
}

export const sourcesToText = (sources: unknown) =>
  z
    .array(articleSourceSchema)
    .catch([])
    .parse(sources)
    .map((s) => `${s.tier} | ${s.accessedAt} | ${s.title} | ${s.url}`)
    .join("\n");

export const articleInputSchema = z.object({
  slug: z.string().trim().min(3).max(80).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens"),
  title: z.string().trim().min(10, "Title is too short").max(140),
  summary: z.string().trim().min(40, "Write a 1–2 sentence summary (at least 40 characters)").max(300),
  category: z.enum(["corporate_tax", "vat", "einvoicing", "registrations", "choosing_a_provider"]),
  bodyMarkdown: z.string().trim().max(40_000),
  sourcesText: z.string().max(5_000).default(""),
  reviewerName: z.string().trim().max(120).optional().transform((v) => v || null),
  reviewerCredential: z.string().trim().max(160).optional().transform((v) => v || null),
  reviewedAt: z.string().optional().transform((v, ctx) => {
    if (!v) return null;
    const d = new Date(`${v}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "Use a valid review date" });
      return z.NEVER;
    }
    return d;
  }),
});

export type SaveResult = { ok: true; id: string } | { ok: false; errors: string[] };

/**
 * Creates or updates a guide. Saving a PUBLISHED guide returns it to draft: changed regulatory content
 * must be reviewed and published again (fail closed). Public text must pass the copy rules.
 */
export async function saveArticle(db: DB, actor: Actor, id: string | null, input: unknown, now = new Date()): Promise<SaveResult> {
  if (!actor.userId) throw new Error("Sign in required");
  const parsed = articleInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.map((i) => i.message) };
  const a = parsed.data;
  const { sources, errors } = parseSourcesText(a.sourcesText);
  const copy = copyViolations(`${a.title}\n${a.summary}\n${a.bodyMarkdown}`);
  if (copy.length) errors.push(`Remove wording the copy rules forbid (${copy.join(", ")}).`);
  if (a.reviewedAt && a.reviewedAt > now) errors.push("The review date cannot be in the future.");
  if (errors.length) return { ok: false, errors };
  const [clash] = await db.select({ id: articles.id }).from(articles).where(eq(articles.slug, a.slug));
  if (clash && clash.id !== id) return { ok: false, errors: ["Another guide already uses this address (slug)."] };
  const values = {
    slug: a.slug,
    title: a.title,
    summary: a.summary,
    category: a.category,
    bodyMarkdown: a.bodyMarkdown,
    sources,
    reviewerName: a.reviewerName,
    reviewerCredential: a.reviewerCredential,
    reviewedAt: a.reviewedAt,
    updatedAt: now,
  };
  return db.transaction(async (tx) => {
    if (!id) {
      const [row] = await tx.insert(articles).values({ ...values, status: "draft", createdAt: now }).returning({ id: articles.id });
      await audit(tx, actor, "article.created", "article", row!.id, { slug: a.slug });
      return { ok: true as const, id: row!.id };
    }
    const [before] = await tx.select().from(articles).where(eq(articles.id, id)).for("update");
    if (!before) return { ok: false as const, errors: ["Guide not found"] };
    const status = before.status === "published" ? "draft" : before.status === "archived" ? "archived" : before.status;
    await tx.update(articles).set({ ...values, status }).where(eq(articles.id, id));
    await audit(tx, actor, "article.updated", "article", id, { slug: a.slug, unpublished: before.status === "published" });
    return { ok: true as const, id };
  });
}

export async function setArticleStatus(db: DB, actor: Actor, id: string, status: "draft" | "archived" | "in_review", now = new Date()) {
  await db.transaction(async (tx) => {
    const updated = await tx.update(articles).set({ status, updatedAt: now }).where(eq(articles.id, id)).returning({ id: articles.id });
    if (updated.length === 0) throw new Error("Guide not found");
    await audit(tx, actor, `article.${status}`, "article", id);
  });
}
