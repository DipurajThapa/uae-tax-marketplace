import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { getDb, closeDb } from "@/db/client";
import * as s from "@/db/schema";
import { saveArticle, publishArticle, getPublished, parseSourcesText } from "@/lib/articles";
import { userActor } from "@/lib/audit";
import { resetDb, makeUser } from "./helpers";

const db = getDb();
beforeEach(resetDb);
afterAll(closeDb);

const body = "## What this covers\n\nThis is a test guide body written for an automated test. ".repeat(8);
const base = {
  slug: "test-guide",
  title: "How registrations are shown in this directory",
  summary: "A short explanation of the three kinds of registration and how the directory checks each one.",
  category: "registrations",
  bodyMarkdown: body,
  sourcesText: "1 | 2026-10-01 | Official register page | https://tax.gov.ae/en/default.aspx",
  reviewerName: "Test Reviewer",
  reviewerCredential: "FTA-listed tax agent",
  reviewedAt: "2026-10-01",
};

describe("ENG-09 guide editor", () => {
  it("creates a draft, publishes only through the gate, and unpublishes on edit", async () => {
    const admin = await makeUser("admin", "a@example.invalid");
    const draft = await saveArticle(db, userActor(admin.id), null, { ...base, reviewerName: "", sourcesText: "2 | 2026-10-01 | Big-4 summary | https://example.com/x" });
    if (!draft.ok) throw new Error(draft.errors.join());
    await expect(publishArticle(db, userActor(admin.id), draft.id)).rejects.toThrow(/Tier 1|reviewer/);

    expect((await saveArticle(db, userActor(admin.id), draft.id, base)).ok).toBe(true);
    await publishArticle(db, userActor(admin.id), draft.id);
    expect((await getPublished(db, "test-guide"))?.title).toBe(base.title);

    await saveArticle(db, userActor(admin.id), draft.id, { ...base, summary: base.summary + " Edited." });
    expect(await getPublished(db, "test-guide")).toBeNull(); // edited content is off the site until re-published
    const [row] = await db.select().from(s.articles).where(eq(s.articles.id, draft.id));
    expect(row!.status).toBe("draft");
  });

  it("enforces copy rules, unique slugs, valid sources and no future review dates", async () => {
    const admin = await makeUser("admin", "a@example.invalid");
    expect((await saveArticle(db, userActor(admin.id), null, { ...base, bodyMarkdown: body + " Results guaranteed." })).ok).toBe(false);
    expect((await saveArticle(db, userActor(admin.id), null, { ...base, reviewedAt: "2999-01-01" })).ok).toBe(false);
    expect((await saveArticle(db, userActor(admin.id), null, { ...base, sourcesText: "1 | yesterday | x | javascript:alert(1)" })).ok).toBe(false);
    expect((await saveArticle(db, userActor(admin.id), null, base)).ok).toBe(true);
    expect((await saveArticle(db, userActor(admin.id), null, base)).ok).toBe(false); // slug taken
  });

  it("parses sources lines", () => {
    const r = parseSourcesText("1 | 2026-10-01 | FTA | https://tax.gov.ae\nnot a source line");
    expect(r.sources).toHaveLength(1);
    expect(r.errors).toHaveLength(1);
  });
});
