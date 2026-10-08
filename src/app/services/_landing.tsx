import Link from "next/link";
import { getDb } from "@/db/client";
import { searchProviders, activePromotions } from "@/lib/providers";
import { SERVICES, SERVICE_BY_CODE, EMIRATES, EMIRATE_BY_CODE, CREDENTIAL_BY_CODE } from "@/lib/taxonomy";
import { ProviderCard, Empty, JsonLd } from "@/components/ui";
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
  return (
    <div className="container">
      <JsonLd data={itemList} />
      <nav className="small muted" aria-label="Breadcrumb">
        <Link href={service ? "/services" : "/locations"}>{service ? "Services" : "Locations"}</Link>
        {service && emirate && <> › <Link href={`/services/${service}`}>{s?.name}</Link></>} › {e && service ? e.name : (s?.name ?? e?.name)}
      </nav>
      <h1>{title}</h1>
      {s && <p className="lead" style={{ maxWidth: 760 }}>{s.description}</p>}
      {s && s.requiredCredentialTypes.length > 0 && (
        <div className="alert alert-info" style={{ maxWidth: 760 }}>
          Only providers with a verified {s.requiredCredentialTypes.map((t) => CREDENTIAL_BY_CODE[t]?.name).join(" or ")} can be matched for this service.
        </div>
      )}
      <p className="muted">{res.total} listed provider{res.total === 1 ? "" : "s"}. <Link href={matchHref}>Describe your needs to see who fits best</Link>.</p>

      {promoted.length > 0 && (
        <section aria-label="Sponsored listings" className="stack" style={{ marginBottom: 24 }}>
          <p className="small muted" style={{ margin: 0 }}>Sponsored: paid placement, shown separately. It does not affect ordering or match scores.</p>
          {promoted.map((p) => <ProviderCard key={`s-${p.id}`} p={p} sponsored />)}
        </section>
      )}
      {res.items.length === 0 ? (
        <Empty title="No providers listed here yet">
          <p><Link href="/providers">Browse all providers</Link> or <Link href="/for-providers">list your firm</Link>.</p>
        </Empty>
      ) : (
        <div className="grid grid-2">{res.items.map((p) => <ProviderCard key={p.id} p={p} />)}</div>
      )}

      <section className="grid grid-2" style={{ marginTop: 32 }}>
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
              <h2>{s?.name} by emirate</h2>
              <div className="chips">{EMIRATES.map((x) => <Link className="chip" key={x.code} href={`/services/${service}/${x.code}`}>{x.name}</Link>)}</div>
              <h2 style={{ marginTop: 16 }}>Related services</h2>
              <ul>{SERVICES.filter((x) => x.category === s?.category && x.code !== service).map((x) => <li key={x.code}><Link href={`/services/${x.code}`}>{x.name}</Link></li>)}</ul>
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
