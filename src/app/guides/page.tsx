import Link from "next/link";
import { getDb } from "@/db/client";
import { listPublished } from "@/lib/articles";
import { PageHeader } from "@/components/page";

export const metadata = { title: "Guides", alternates: { canonical: "/guides" } };
export const dynamic = "force-dynamic";

export default async function Guides() {
  const items = await listPublished(getDb());
  return (
    <div className="container narrow">
      <PageHeader kicker="Explained" title="Guides" lead="Each guide is written by a person, reviewed by a named professional, and cites the official sources it relies on." />
      {items.length === 0 ? (
        <div className="card">No guides are published yet. Guides are published only after professional review against official sources.</div>
      ) : (
        <ul className="stack" style={{ listStyle: "none", padding: 0 }}>
          {items.map((a) => (
            <li key={a.id} className="card"><h2 className="card-title"><Link href={`/guides/${a.slug}`}>{a.title}</Link></h2><p className="muted" style={{ margin: 0 }}>{a.summary}</p></li>
          ))}
        </ul>
      )}
    </div>
  );
}
