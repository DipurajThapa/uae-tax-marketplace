import { Breadcrumbs, Callout } from "@/components/page";

export type LegalSectionDef = { id: string; title: string; body: React.ReactNode };

/**
 * Layout for Privacy and Terms: header, draft notice, a contents list that stays in view on wide
 * screens, and numbered sections. Content stays in the page files so counsel edits one place.
 */
export function LegalPage({ title, mark, lead, updated, sections }: { title: string; mark: string; lead: string; updated: string; sections: LegalSectionDef[] }) {
  return (
    <div className="container">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: title }]} />
      <header className="page-header">
        <p className="kicker">Legal · {updated}</p>
        <h1>
          {title.replace(mark, "").trim()} <span className="hl-mark">{mark}</span>
        </h1>
        <p className="lead">{lead}</p>
      </header>
      <Callout role="note">
        <p className="mb-0"><strong>Draft for counsel review.</strong> This text has not been approved and the site is not public.</p>
      </Callout>
      <div className="legal mt-4">
        <nav className="toc card" aria-label="On this page">
          <p className="kicker">On this page</p>
          <ol>
            {sections.map((s) => <li key={s.id}><a href={`#${s.id}`}>{s.title}</a></li>)}
          </ol>
        </nav>
        <div className="legal-body">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`}>
              <h2 id={`${s.id}-h`}><span className="num" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>{s.title}</h2>
              {s.body}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
