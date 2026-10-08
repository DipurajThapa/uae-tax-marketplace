import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { articles } from "@/db/schema";
import { saveArticle, publishArticle, publicationProblems, setArticleStatus } from "@/lib/articles";
import { renderMarkdown } from "@/lib/markdown";
import { userActor } from "@/lib/audit";
import { requireStaff, requireAdmin, attempt, done, fail, isUuid, FlashMessages, StatusBadge, type Flash } from "../../_shared";
import { ArticleFields, readArticleForm } from "../_form";

export const metadata = { title: "Admin: edit guide" };

export default async function EditGuide({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Flash> }) {
  const user = await requireStaff();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const flash = await searchParams;
  const [a] = await getDb().select().from(articles).where(eq(articles.id, id));
  if (!a) notFound();
  const back = `/admin/guides/${id}`;
  const problems = publicationProblems(a);

  async function save(fd: FormData) {
    "use server";
    const u = await requireStaff();
    const r = await saveArticle(getDb(), userActor(u.id), id, readArticleForm(fd));
    if (!r.ok) fail(back, r.errors.join(" "));
    done(back, "Saved. A published guide goes back to draft when edited.");
  }
  async function publish() {
    "use server";
    const u = await requireAdmin(); // publishing public regulatory content is admin-only
    const r = await attempt(() => publishArticle(getDb(), userActor(u.id), id));
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
            <form action={publish}><button className="btn" type="submit" disabled={problems.length > 0}>Publish</button></form>
          )}
          {a.status !== "archived" && <form action={archive}><button className="btn btn-secondary" type="submit">Archive</button></form>}
        </div>
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
