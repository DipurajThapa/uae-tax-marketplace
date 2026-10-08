import Link from "next/link";
import { desc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { articles } from "@/db/schema";
import { saveArticle } from "@/lib/articles";
import { userActor } from "@/lib/audit";
import { requireStaff, done, fail, fmtDate, FlashMessages, StatusBadge, type Flash } from "../_shared";
import { ArticleFields, readArticleForm } from "./_form";

export const metadata = { title: "Admin: guides" };
const BACK = "/admin/guides";

async function create(fd: FormData) {
  "use server";
  const user = await requireStaff();
  const r = await saveArticle(getDb(), userActor(user.id), null, readArticleForm(fd));
  if (!r.ok) fail(BACK, r.errors.join(" "));
  done(`/admin/guides/${r.id}`, "Draft saved");
}

export default async function AdminGuides({ searchParams }: { searchParams: Promise<Flash> }) {
  await requireStaff();
  const flash = await searchParams;
  const rows = await getDb().select().from(articles).orderBy(desc(articles.updatedAt));
  return (
    <div className="stack">
      <h1>Guides</h1>
      <FlashMessages {...flash} />
      <p className="muted">Guides are written by people, reviewed by a named professional and cite official sources. A guide is published only when all three are in place; editing a published guide takes it back to draft until it is published again.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Title</th><th>Status</th><th>Reviewed</th><th>Updated</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={4} className="muted">No guides yet.</td></tr>}
            {rows.map((a) => (
              <tr key={a.id}>
                <td><Link href={`/admin/guides/${a.id}`}>{a.title}</Link><br /><span className="small muted">/guides/{a.slug}</span></td>
                <td><StatusBadge value={a.status} /></td>
                <td>{a.reviewerName ? `${a.reviewerName}, ${fmtDate(a.reviewedAt)}` : "—"}</td>
                <td>{fmtDate(a.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details className="card">
        <summary><strong>New guide</strong></summary>
        <form action={create} style={{ marginTop: 16 }}>
          <ArticleFields />
          <button className="btn" type="submit">Save draft</button>
        </form>
      </details>
    </div>
  );
}
