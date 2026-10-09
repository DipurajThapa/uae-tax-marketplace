import Link from "next/link";
import { getDb } from "@/db/client";
import { searchProviders, activePromotions } from "@/lib/providers";
import { SERVICES, SERVICE_BY_CODE, EMIRATES, EMIRATE_BY_CODE, CREDENTIAL_BY_CODE } from "@/lib/taxonomy";
import { ProviderCard, Empty, JsonLd } from "@/components/ui";
import { Band, Breadcrumbs, Callout } from "@/components/page";
import { MoneyRules } from "@/components/money";
import { config } from "@/lib/config";

/** Shared body for /services/[code], /services/[code]/[emirate] and /locations/[emirate]. */
export async function Landing({ service, emirate }: { service?: string; emirate?: string }) {
  const db = getDb();
  const s = service ? SERVICE_BY_CODE[service] : undefined;
  const e = emirate ? EMIRATE_BY_CODE[emirate] : undefined;
  const [res, promoted] = await Promise.all([
    searchProviders(db, { service, emirate }),
    activePromotions(db, { placement: service ? "service_page" : "location_page", service, emirate, now: new Date() }),
  ]);
  const title = [s?.name ?? "Tax and e-invoicing providers", e ? `in ${e.name}` : "in the UAE"].join(" ");
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: title,
    itemListElement: res.items.filter((p) => !p.isSynthetic).map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${config.siteUrl}/providers/${p.slug}`, name: p.name })),
  };
  const matchHref = `/match${service ? `?service=${service}` : ""}`;
  const crumbs = service
    ? [{ label: "Services", href: "/services" }, ...(emirate ? [{ label: s?.name ?? service, href: `/services/${service}` }, { label: e?.name ?? emirate }] : [{ label: s?.name ?? service }])]
    : [{ label: "Locations", href: "/locations" }, { label: e?.name ?? emirate ?? "" }];
  const required = s?.requiredCredentialTypes ?? [];

  return (
    <div className="container">
      <JsonLd data={itemList} />
      <Breadcrumbs items={crumbs} />
      <header className="page-header">
        <p className="kicker">{service ? "Service" : "Location"}{e && service ? ` · ${e.name}` : ""}</p>
        <h1>{title}</h1>
        {s && <p className="lead">{s.description}</p>}
      </header>
      {required.length > 0 && (
        <Callout>
          <p>Only providers with a verified {required.map((t) => CREDENTIAL_BY_CODE[t]?.name).join(" or ")} can be matched for this service.</p>
        </Callout>
      )}
      <div className="page-actions">
        <Link className="btn btn-accent" href={matchHref}>Describe your needs to see who fits best</Link>
      </div>
      <p className="muted mt-2">{res.total} listed provider{res.total === 1 ? "" : "s"}. Free for businesses.</p>

      {service && (
        <nav className="filter-bar" aria-label="Filter by emirate">
          <p className="kicker">Filter by emirate</p>
          <div className="chip-nav">
            <Link className="chip" href={`/services/${service}`} aria-current={!emirate ? "page" : undefined}>All UAE</Link>
            {EMIRATES.map((x) => (
              <Link className="chip" key={x.code} href={`/services/${service}/${x.code}`} aria-current={emirate === x.code ? "page" : undefined}>{x.name}</Link>
            ))}
          </div>
        </nav>
      )}

      {promoted.length > 0 && (
        <section aria-label="Sponsored listings" className="sponsored-box">
          <p className="small"><span className="badge badge-sponsored">Sponsored</span> Paid placement, shown separately. It does not affect ordering or match scores.</p>
          <div className="grid grid-2">{promoted.map((p) => <ProviderCard key={`s-${p.id}`} p={p} sponsored />)}</div>
        </section>
      )}

      <div className="list-head">
        <h2>Listed providers</h2>
        <p className="mono muted mb-0">Firms with a verified registration first, then by name</p>
      </div>
      {res.items.length === 0 ? (
        <Empty title="No providers listed here yet">
          <p><Link href="/providers">Browse all providers</Link> or <Link href="/for-providers">list your firm</Link>.</p>
        </Empty>
      ) : (
        <div className="grid grid-2">{res.items.map((p) => <ProviderCard key={p.id} p={p} />)}</div>
      )}

      <Band tone="dark" label="How Taxdar makes money">
        <p className="kicker">Open about money</p>
        <h2>How Taxdar makes money</h2>
        <MoneyRules />
      </Band>

      <section className="grid grid-2 mt-4">
        <div className="card">
          <h2>Questions to ask before you engage a provider</h2>
          <ul>
            <li>Which of their registrations apply to the work you need, and can you see the registration number?</li>
            <li>Who will do the work, and what is their experience with businesses like yours?</li>
            <li>What is included in the fee, and what is billed separately?</li>
            <li>How will they keep you informed about deadlines and filings?</li>
          </ul>
        </div>
        <div className="card">
          {service ? (
            <>
              <h2>Related services</h2>
              {SERVICES.some((x) => x.category === s?.category && x.code !== service) ? (
                <ul>{SERVICES.filter((x) => x.category === s?.category && x.code !== service).map((x) => <li key={x.code}><Link href={`/services/${x.code}`}>{x.name}</Link></li>)}</ul>
              ) : (
                <p><Link href="/services">See all services</Link></p>
              )}
            </>
          ) : (
            <>
              <h2>Services in {e?.name}</h2>
              <ul>{SERVICES.map((x) => <li key={x.code}><Link href={`/services/${x.code}/${emirate}`}>{x.name}</Link></li>)}</ul>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
