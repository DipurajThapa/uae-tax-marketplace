import { articles } from "@/db/schema";
import { OFFICIAL_HOSTS, sourcesToText } from "@/lib/articles";

export const CATEGORIES = [
  ["registrations", "Registrations and roles"],
  ["corporate_tax", "Corporate Tax"],
  ["vat", "VAT"],
  ["einvoicing", "E-invoicing"],
  ["choosing_a_provider", "Choosing a provider"],
] as const;

export function readArticleForm(fd: FormData) {
  const v = (k: string) => String(fd.get(k) ?? "");
  return {
    slug: v("slug"),
    title: v("title"),
    summary: v("summary"),
    category: v("category"),
    bodyMarkdown: v("bodyMarkdown"),
    sourcesText: v("sourcesText"),
  };
}

/** Shared create/edit fields. Labels are explicit because this is YMYL content. */
export function ArticleFields({ a }: { a?: typeof articles.$inferSelect }) {
  return (
    <>
      <div className="field"><label htmlFor="title">Title</label><input id="title" name="title" defaultValue={a?.title} required maxLength={140} /></div>
      <div className="field"><label htmlFor="slug">Address (slug)</label><input id="slug" name="slug" defaultValue={a?.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" /><div className="help">Shown at /guides/your-slug. Lowercase letters, numbers and hyphens.</div></div>
      <div className="field"><label htmlFor="category">Category</label>
        <select id="category" name="category" defaultValue={a?.category ?? "registrations"}>{CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
      <div className="field"><label htmlFor="summary">Summary</label><textarea id="summary" name="summary" defaultValue={a?.summary} required maxLength={300} /><div className="help">1–2 sentences that answer the question directly (shown first and used for search snippets).</div></div>
      <div className="field"><label htmlFor="bodyMarkdown">Body (Markdown)</label><textarea id="bodyMarkdown" name="bodyMarkdown" defaultValue={a?.bodyMarkdown} rows={18} style={{ fontFamily: "ui-monospace, monospace" }} /><div className="help">Headings (##), lists, **bold** and [links](https://…). Every rule, number or date must be backed by a source below. Written by a person, not generated.</div></div>
      <div className="field"><label htmlFor="sourcesText">Sources</label><textarea id="sourcesText" name="sourcesText" defaultValue={a ? sourcesToText(a.sources) : ""} rows={5} style={{ fontFamily: "ui-monospace, monospace" }} />
        <div className="help">One per line: <code>tier | YYYY-MM-DD | title | https://url</code>. Tier 1 = an official https page on {OFFICIAL_HOSTS.join(", ")}. At least one Tier 1 source is needed to publish.</div></div>
    </>
  );
}
