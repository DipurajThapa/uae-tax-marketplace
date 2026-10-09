import Link from "next/link";

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

/** Breadcrumb trail. The last item is the current page and is not a link. */
export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((it, i) => (
          <li key={i}>{it.href ? <Link href={it.href}>{it.label}</Link> : <span aria-current="page">{it.label}</span>}</li>
        ))}
      </ol>
    </nav>
  );
}

/** Highlighted notice with a warning mark: required registrations, draft status and similar. */
export function Callout({ children, role }: { children: React.ReactNode; role?: string }) {
  return (
    <div className="callout" role={role}>
      <svg className="callout-icon" width="32" height="32" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M24 4 L44 42 H4 Z" fill="#111" />
        <rect x="22" y="16" width="4" height="14" fill="#ffe14d" />
        <rect x="22" y="33" width="4" height="4" fill="#ffe14d" />
      </svg>
      <div>{children}</div>
    </div>
  );
}

/** Full-width band that breaks out of the page column: "dark" or "brand" backgrounds. */
export function Band({ tone, children, label }: { tone: "dark" | "brand"; children: React.ReactNode; label?: string }) {
  return (
    <section className={`band band-${tone}`} aria-label={label}>
      <div className="container">{children}</div>
    </section>
  );
}
