import { and, eq, desc } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "@/db/client";
import { articles } from "@/db/schema";
import { audit, type Actor } from "./audit";
import { httpUrl } from "./validators";
import { copyViolations } from "./copy-rules";
import { sha256 } from "./crypto";
import { isoDate, parseIsoDate } from "./validators";

export const articleSourceSchema = z.object({
  title: z.string().min(3),
  url: httpUrl(),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  accessedAt: z.string().refine((v) => parseIsoDate(v) !== null, "Use a valid date"),
});

/**
 * Official publishers whose pages count as Tier 1 (review2 M3): UAE federal and emirate government
 * (*.gov.ae, u.ae), the free-zone regulators ADGM and DIFC, and the state news agency WAM.
 */
export const OFFICIAL_HOSTS = ["gov.ae", "u.ae", "adgm.com", "difc.ae", "difc.com", "wam.ae"] as const;

export function isOfficialSource(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase().replace(/\.$/, "");
    return u.protocol === "https:" && OFFICIAL_HOSTS.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

/** Fingerprint of everything a reader sees. A recorded review covers exactly this content (review2 M3). */
export function articleContentHash(a: Pick<typeof articles.$inferSelect, "slug" | "title" | "summary" | "category" | "bodyMarkdown" | "sources">): string {
  return sha256(JSON.stringify([a.slug, a.title, a.summary, a.category, a.bodyMarkdown, a.sources]));
}

const REVIEW_MAX_AGE_MS = 365 * 86400_000;

/**
 * Publication gate for regulatory content: a named reviewer with a credential and review date,
 * recorded for this exact text, and at least one Tier-1 source on an official domain.
 * Content must be human-written (no LLM public text). Also applied when reading published guides.
 */
export function publicationProblems(a: typeof articles.$inferSelect, now: Date): string[] {
  const problems: string[] = [];
  const sources = z.array(articleSourceSchema).safeParse(a.sources);
  if (!sources.success) problems.push("Sources are malformed");
  else if (!sources.data.some((s) => s.tier === 1 && isOfficialSource(s.url)))
    problems.push(`At least one official (Tier 1) source is required, on ${OFFICIAL_HOSTS.join(", ")}`);
  if (!a.reviewerName || !a.reviewerCredential || !a.reviewedAt || !a.reviewRecordedBy) problems.push("A named reviewer with credential and review date is required");
  else if (a.reviewedContentHash !== articleContentHash(a)) problems.push("The text changed after the review was recorded; record the review again");
  if (a.bodyMarkdown.trim().length < 300) problems.push("Body is too short to be useful");
  const copy = copyViolations(`${a.title}\n${a.summary}\n${a.bodyMarkdown}`);
  if (copy.length) problems.push(`Copy rules: ${copy.join(", ")}`);
  if (a.reviewedAt && now.getTime() - a.reviewedAt.getTime() > REVIEW_MAX_AGE_MS) problems.push("The review is more than a year old; review it again");
  return problems;
}

/**
 * Publishes the version the admin looked at. The gate runs inside the transaction with the row
 * locked, and `expectedUpdatedAt` refuses a version that changed after the page loaded (review2 M2).
 */
export async function publishArticle(db: DB, actor: Actor, id: string, expectedUpdatedAt: Date | null, now = new Date()) {
  await db.transaction(async (tx) => {
    const [a] = await tx.select().from(articles).where(eq(articles.id, id)).for("update");
    if (!a) throw new Error("Not found");
    if (expectedUpdatedAt && a.updatedAt.getTime() !== expectedUpdatedAt.getTime())
      throw new Error("The guide changed after you opened it. Check the latest version, then publish.");
    const problems = publicationProblems(a, now);
    if (problems.length) throw new Error(problems.join("; "));
    await tx.update(articles).set({ status: "published", publishedAt: a.publishedAt ?? now, updatedAt: now }).where(eq(articles.id, id));
    await audit(tx, actor, "article.published", "article", id, { contentHash: a.reviewedContentHash });
  });
}

/** Published guides that still pass the gate now: a review older than a year takes a guide off the site (review2 L3). */
export async function listPublished(db: DB, now = new Date()) {
  const rows = await db.select().from(articles).where(eq(articles.status, "published")).orderBy(desc(articles.publishedAt));
  return rows.filter((a) => publicationProblems(a, now).length === 0);
}

export async function getPublished(db: DB, slug: string, now = new Date()) {
  const [a] = await db.select().from(articles).where(and(eq(articles.slug, slug), eq(articles.status, "published")));
  return a && publicationProblems(a, now).length === 0 ? a : null;
}

export const reviewInputSchema = z.object({
  reviewerName: z.string().trim().min(3, "Enter the reviewer's full name").max(120),
  reviewerCredential: z.string().trim().min(3, "Enter the reviewer's credential").max(160),
  reviewedAt: isoDate("Use a valid review date"),
});

/**
 * Records that a named professional reviewed the CURRENT text (review2 M3). Stores a hash of that
 * text and who recorded it; any later edit breaks the match and blocks publication until recorded again.
 */
export async function recordReview(db: DB, actor: Actor, id: string, input: unknown, expectedUpdatedAt: Date | null, now = new Date()): Promise<SaveResult> {
  if (!actor.userId) throw new Error("Sign in required");
  const parsed = reviewInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.map((i) => i.message) };
  const r = parsed.data;
  if (r.reviewedAt > now) return { ok: false, errors: ["The review date cannot be in the future."] };
  if (now.getTime() - r.reviewedAt.getTime() > REVIEW_MAX_AGE_MS) return { ok: false, errors: ["The review is more than a year old; review it again."] };
  return db.transaction(async (tx) => {
    const [a] = await tx.select().from(articles).where(eq(articles.id, id)).for("update");
    if (!a) return { ok: false as const, errors: ["Guide not found"] };
    if (expectedUpdatedAt && a.updatedAt.getTime() !== expectedUpdatedAt.getTime())
      return { ok: false as const, errors: ["The guide changed after you opened it. Check the latest text, then record the review."] };
    const contentHash = articleContentHash(a);
    await tx
      .update(articles)
      .set({ ...r, reviewedContentHash: contentHash, reviewRecordedBy: actor.userId, updatedAt: now })
      .where(eq(articles.id, id));
    await audit(tx, actor, "article.review_recorded", "article", id, { reviewerName: r.reviewerName, reviewedAt: r.reviewedAt.toISOString(), contentHash });
    return { ok: true as const, id };
  });
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
      if (parsed.success && parsed.data.tier === 1 && !isOfficialSource(parsed.data.url))
        errors.push(`Source line ${i + 1}: tier 1 is only for official https pages (${OFFICIAL_HOSTS.join(", ")})`);
      else if (parsed.success) sources.push(parsed.data);
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
});

export type SaveResult = { ok: true; id: string } | { ok: false; errors: string[] };

/**
 * Creates or updates a guide. Saving a PUBLISHED guide returns it to draft: changed regulatory content
 * must be reviewed and published again (fail closed). Public text must pass the copy rules. The review
 * is recorded separately (recordReview) and covers only the text it was recorded for.
 */
export async function saveArticle(db: DB, actor: Actor, id: string | null, input: unknown, now = new Date()): Promise<SaveResult> {
  if (!actor.userId) throw new Error("Sign in required");
  const parsed = articleInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.map((i) => i.message) };
  const a = parsed.data;
  const { sources, errors } = parseSourcesText(a.sourcesText);
  const copy = copyViolations(`${a.title}\n${a.summary}\n${a.bodyMarkdown}`);
  if (copy.length) errors.push(`Remove wording the copy rules forbid (${copy.join(", ")}).`);
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
