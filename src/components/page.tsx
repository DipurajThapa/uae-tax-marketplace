/** Shared page scaffolding so every page opens the same way: kicker, title, intro, actions. */
export function PageHeader({ kicker, title, lead, children }: { kicker?: string; title: React.ReactNode; lead?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="page-header">
      {kicker && <p className="kicker">{kicker}</p>}
      <h1>{title}</h1>
      {lead && <p className="lead">{lead}</p>}
      {children && <div className="page-actions">{children}</div>}
    </header>
  );
}

/** A titled page section with an optional kicker. `id` labels the section for assistive tech. */
export function Section({ id, kicker, title, children, className }: { id: string; kicker?: string; title: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section aria-labelledby={id} className={["page-section", className].filter(Boolean).join(" ")}>
      {kicker && <p className="kicker">{kicker}</p>}
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  );
}
