import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { articles } from "@/db/schema";
import { saveArticle, publishArticle, publicationProblems, setArticleStatus, recordReview } from "@/lib/articles";
import { renderMarkdown } from "@/lib/markdown";
import { userActor } from "@/lib/audit";
import { requireStaff, requireAdmin, attempt, done, fail, isUuid, FlashMessages, StatusBadge, type Flash } from "../../_shared";
import { ArticleFields, readArticleForm } from "../_form";

export const metadata = { title: "Admin: edit guide" };

/** The version the form was rendered from, so an action never applies to text the user did not see. */
function versionOf(fd: FormData): Date | null {
  const d = new Date(String(fd.get("version") ?? ""));
  return Number.isNaN(d.getTime()) ? null : d;
}

export default async function EditGuide({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Flash> }) {
  const user = await requireStaff();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const flash = await searchParams;
  const [a] = await getDb().select().from(articles).where(eq(articles.id, id));
  if (!a) notFound();
  const back = `/admin/guides/${id}`;
  const now = new Date();
  const problems = publicationProblems(a, now);
  const version = a.updatedAt.toISOString();

  async function save(fd: FormData) {
    "use server";
    const u = await requireStaff();
    const r = await saveArticle(getDb(), userActor(u.id), id, readArticleForm(fd));
    if (!r.ok) fail(back, r.errors.join(" "));
    done(back, "Saved. A published guide goes back to draft when edited.");
  }
  async function review(fd: FormData) {
    "use server";
    const u = await requireStaff();
    const expected = versionOf(fd);
    if (!expected) fail(back, "Reload the page and try again.");
    const r = await recordReview(getDb(), userActor(u.id), id, {
      reviewerName: String(fd.get("reviewerName") ?? ""),
      reviewerCredential: String(fd.get("reviewerCredential") ?? ""),
      reviewedAt: String(fd.get("reviewedAt") ?? ""),
    }, expected);
    if (!r.ok) fail(back, r.errors.join(" "));
    done(back, "Review recorded for the current text");
  }
  async function publish(fd: FormData) {
    "use server";
    const u = await requireAdmin(); // publishing public regulatory content is admin-only
    const expected = versionOf(fd);
    if (!expected) fail(back, "Reload the page and try again.");
    const r = await attempt(() => publishArticle(getDb(), userActor(u.id), id, expected));
    if (!r.ok) fail(back, r.error);
    done(back, "Published");
  }
  async function archive() {
    "use server";
    const u = await requireStaff();
    const r = await attempt(() => setArticleStatus(getDb(), userActor(u.id), id, "archived"));
    if (!r.ok) fail(back, r.error);
    done(back, "Archived: no longer public");
  }

  return (
    <div className="stack">
      <p className="small"><Link href="/admin/guides">← All guides</Link></p>
      <h1>{a.title} <StatusBadge value={a.status} /></h1>
      <FlashMessages {...flash} />
      {a.status === "published" && <p><Link href={`/guides/${a.slug}`} target="_blank">View public page</Link></p>}
      <section className="card">
        <h2>Ready to publish?</h2>
        {problems.length === 0 ? <p>All checks pass.</p> : <ul>{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
        <div className="row">
          {user.role === "admin" && a.status !== "published" && (
            <form action={publish}>
              <input type="hidden" name="version" value={version} />
              <button className="btn" type="submit" disabled={problems.length > 0}>Publish</button>
            </form>
          )}
          {a.status !== "archived" && <form action={archive}><button className="btn btn-secondary" type="submit">Archive</button></form>}
        </div>
      </section>
      <section className="card" aria-labelledby="review-h">
        <h2 id="review-h">Professional review</h2>
        {a.reviewerName && a.reviewedAt ? (
          <p className="small">
            Recorded: {a.reviewerName} ({a.reviewerCredential}), reviewed {a.reviewedAt.toISOString().slice(0, 10)}.{" "}
            {problems.some((p) => p.startsWith("The text changed")) ? <strong>The text changed since; the review must be recorded again.</strong> : "It covers the current text."}
          </p>
        ) : (
          <p className="small muted">No review recorded yet.</p>
        )}
        <form action={review}>
          <input type="hidden" name="version" value={version} />
          <div className="grid grid-3">
            <div className="field"><label htmlFor="reviewerName">Reviewer name</label><input id="reviewerName" name="reviewerName" required defaultValue={a.reviewerName ?? ""} /></div>
            <div className="field"><label htmlFor="reviewerCredential">Reviewer credential</label><input id="reviewerCredential" name="reviewerCredential" required defaultValue={a.reviewerCredential ?? ""} placeholder="e.g. FTA-listed tax agent" /></div>
            <div className="field"><label htmlFor="reviewedAt">Review date</label><input id="reviewedAt" name="reviewedAt" type="date" required max={now.toISOString().slice(0, 10)} defaultValue={a.reviewedAt?.toISOString().slice(0, 10) ?? ""} /></div>
          </div>
          <p className="small muted">Record this only after the named professional has reviewed the text exactly as it is saved now. Any later edit needs a new review.</p>
          <button className="btn btn-secondary" type="submit">Record review of this text</button>
        </form>
      </section>
      <form action={save} className="card">
        <ArticleFields a={a} />
        <button className="btn" type="submit">Save</button>
      </form>
      <section className="card">
        <h2>Preview</h2>
        <h3>{a.title}</h3>
        <p className="lead">{a.summary}</p>
        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(a.bodyMarkdown) }} />
      </section>
    </div>
  );
}
