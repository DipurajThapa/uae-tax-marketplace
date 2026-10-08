import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { getDb, closeDb } from "@/db/client";
import * as s from "@/db/schema";
import { saveArticle, publishArticle, getPublished, listPublished, parseSourcesText, recordReview, publicationProblems, isOfficialSource } from "@/lib/articles";
import { userActor } from "@/lib/audit";
import { resetDb, makeUser } from "./helpers";

const db = getDb();
beforeEach(resetDb);
afterAll(closeDb);

const body = "## What this covers\n\nThis is a test guide body written for an automated test. ".repeat(8);
const now = new Date("2026-10-08T10:00:00Z");
const base = {
  slug: "test-guide",
  title: "How registrations are shown in this directory",
  summary: "A short explanation of the three kinds of registration and how the directory checks each one.",
  category: "registrations",
  bodyMarkdown: body,
  sourcesText: "1 | 2026-10-01 | Official register page | https://tax.gov.ae/en/default.aspx",
};
const review = { reviewerName: "Test Reviewer", reviewerCredential: "FTA-listed tax agent", reviewedAt: "2026-10-01" };
const row = async (id: string) => (await db.select().from(s.articles).where(eq(s.articles.id, id)))[0]!;

async function draft(adminId: string, input: Record<string, unknown> = base) {
  const r = await saveArticle(db, userActor(adminId), null, input, now);
  if (!r.ok) throw new Error(r.errors.join());
  return r.id;
}

describe("ENG-09 guide editor", () => {
  it("creates a draft, publishes only through the gate, and unpublishes on edit", async () => {
    const admin = await makeUser("admin", "a@example.invalid");
    const id = await draft(admin.id, { ...base, sourcesText: "2 | 2026-10-01 | Big-4 summary | https://example.com/x" });
    await expect(publishArticle(db, userActor(admin.id), id, null, now)).rejects.toThrow(/Tier 1/);

    expect((await saveArticle(db, userActor(admin.id), id, base, now)).ok).toBe(true);
    await expect(publishArticle(db, userActor(admin.id), id, null, now)).rejects.toThrow(/reviewer/);
    expect((await recordReview(db, userActor(admin.id), id, review, null, now)).ok).toBe(true);
    await publishArticle(db, userActor(admin.id), id, (await row(id)).updatedAt, now);
    expect((await getPublished(db, "test-guide", now))?.title).toBe(base.title);

    await saveArticle(db, userActor(admin.id), id, { ...base, summary: base.summary + " Edited." }, now);
    expect(await getPublished(db, "test-guide", now)).toBeNull(); // edited content is off the site until re-published
    expect((await row(id)).status).toBe("draft");
  });

  it("review2 M3: a recorded review covers only the text it was recorded for", async () => {
    const admin = await makeUser("admin", "a@example.invalid");
    const id = await draft(admin.id);
    expect((await recordReview(db, userActor(admin.id), id, review, null, now)).ok).toBe(true);
    expect(publicationProblems(await row(id), now)).toEqual([]);
    // Editing after the review (even before publishing) invalidates it.
    await saveArticle(db, userActor(admin.id), id, { ...base, bodyMarkdown: body + " A new claim nobody reviewed." }, now);
    expect(publicationProblems(await row(id), now).join()).toMatch(/changed after the review/);
    await expect(publishArticle(db, userActor(admin.id), id, null, now)).rejects.toThrow(/changed after the review/);
    const [audit] = await db.select().from(s.auditLog).where(eq(s.auditLog.action, "article.review_recorded"));
    expect(audit!.actorUserId).toBe(admin.id);
  });

  it("review2 M2: publishing refuses a version other than the one the admin saw", async () => {
    const admin = await makeUser("admin", "a@example.invalid");
    const id = await draft(admin.id);
    await recordReview(db, userActor(admin.id), id, review, null, now);
    const seen = (await row(id)).updatedAt;
    const later = new Date(now.getTime() + 60_000);
    await recordReview(db, userActor(admin.id), id, { ...review, reviewerName: "Someone Else" }, null, later);
    await expect(publishArticle(db, userActor(admin.id), id, seen, later)).rejects.toThrow(/changed after you opened it/);
    expect((await recordReview(db, userActor(admin.id), id, review, seen, later)).ok).toBe(false);
  });

  it("review2 M3: tier 1 sources must be on an official domain", async () => {
    expect(isOfficialSource("https://tax.gov.ae/en/x")).toBe(true);
    expect(isOfficialSource("https://u.ae/en/information")).toBe(true);
    expect(isOfficialSource("https://www.adgm.com/x")).toBe(true);
    expect(isOfficialSource("https://gov.ae.example.com/x")).toBe(false);
    expect(isOfficialSource("https://notgov.ae/x")).toBe(false);
    expect(isOfficialSource("http://tax.gov.ae/x")).toBe(false);
    const admin = await makeUser("admin", "a@example.invalid");
    const r = await saveArticle(db, userActor(admin.id), null, { ...base, sourcesText: "1 | 2026-10-01 | Blog | https://example.com/x" }, now);
    expect(r.ok).toBe(false);
  });

  it("review2 L3: a review older than a year takes the guide off the site", async () => {
    const admin = await makeUser("admin", "a@example.invalid");
    const id = await draft(admin.id);
    await recordReview(db, userActor(admin.id), id, review, null, now);
    await publishArticle(db, userActor(admin.id), id, null, now);
    expect(await getPublished(db, "test-guide", now)).not.toBeNull();
    const nextYear = new Date("2027-10-02T00:00:00Z");
    expect(await getPublished(db, "test-guide", nextYear)).toBeNull();
    expect(await listPublished(db, nextYear)).toHaveLength(0);
    expect(await listPublished(db, now)).toHaveLength(1);
  });

  it("enforces copy rules, unique slugs, valid sources and real review dates", async () => {
    const admin = await makeUser("admin", "a@example.invalid");
    expect((await saveArticle(db, userActor(admin.id), null, { ...base, bodyMarkdown: body + " Results guaranteed." }, now)).ok).toBe(false);
    expect((await saveArticle(db, userActor(admin.id), null, { ...base, sourcesText: "1 | yesterday | x | javascript:alert(1)" }, now)).ok).toBe(false);
    expect((await saveArticle(db, userActor(admin.id), null, { ...base, sourcesText: "1 | 2026-02-31 | FTA | https://tax.gov.ae" }, now)).ok).toBe(false);
    const id = await draft(admin.id);
    expect((await saveArticle(db, userActor(admin.id), null, base, now)).ok).toBe(false); // slug taken
    expect((await recordReview(db, userActor(admin.id), id, { ...review, reviewedAt: "2999-01-01" }, null, now)).ok).toBe(false);
    expect((await recordReview(db, userActor(admin.id), id, { ...review, reviewedAt: "2026-02-31" }, null, now)).ok).toBe(false); // review2 L4
    expect((await recordReview(db, userActor(admin.id), id, { ...review, reviewerName: "" }, null, now)).ok).toBe(false);
  });

  it("parses sources lines", () => {
    const r = parseSourcesText("1 | 2026-10-01 | FTA | https://tax.gov.ae\nnot a source line");
    expect(r.sources).toHaveLength(1);
    expect(r.errors).toHaveLength(1);
  });
});
