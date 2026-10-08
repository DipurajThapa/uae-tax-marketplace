import Link from "next/link";
import { getDb } from "@/db/client";
import { facetCounts } from "@/lib/providers";
import { SERVICES, SERVICE_CATEGORIES, EMIRATES } from "@/lib/taxonomy";
import { BRAND } from "@/lib/brand";
import { JsonLd } from "@/components/ui";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function Home() {
  const facets = await facetCounts(getDb());
  const categories = Object.entries(SERVICE_CATEGORIES);
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "WebSite", name: BRAND.name, url: config.siteUrl, potentialAction: { "@type": "SearchAction", target: `${config.siteUrl}/providers?q={query}`, "query-input": "required name=query" } }} />
      <section className="hero">
        <div className="container">
          <h1>Find UAE tax and e-invoicing professionals whose registrations you can check</h1>
          <p className="lead">Compare Corporate Tax, VAT and e-invoicing providers by service, location and language. See which registrations we have checked, and how. Then send one enquiry to up to three providers you choose.</p>
          <form action="/providers" method="get" className="row" role="search" style={{ marginTop: 20, maxWidth: 720 }}>
            <label htmlFor="q" className="skip">Search providers</label>
            <input id="q" name="q" type="search" placeholder="Firm name or keyword" style={{ flex: "1 1 260px" }} />
            <select name="service" aria-label="Service" style={{ flex: "1 1 220px" }}>
              <option value="">Any service</option>
              {SERVICES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
            <button className="btn" type="submit">Search</button>
          </form>
          <p className="small muted" style={{ marginTop: 12 }}>Not sure what you need? <Link href="/match">Answer a few questions and see matching providers</Link>.</p>
        </div>
      </section>

      <section className="container" style={{ marginTop: 40 }}>
        <h2>Browse by service</h2>
        <div className="grid grid-3">
          {categories.map(([cat, label]) => (
            <div className="card" key={cat}>
              <h3>{label}</h3>
              <ul className="small" style={{ paddingLeft: 18, margin: 0 }}>
                {SERVICES.filter((s) => s.category === cat).map((s) => (
                  <li key={s.code}>
                    <Link href={`/services/${s.code}`}>{s.name}</Link> <span className="muted">({facets.services.get(s.code) ?? 0})</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="container" style={{ marginTop: 40 }}>
        <h2>How it works</h2>
        <ol className="grid grid-3" style={{ listStyle: "none", padding: 0 }}>
          <li className="card"><h3>1. Describe what you need</h3><p className="muted">Choose services and answer a few questions about your business. Ranges are enough.</p></li>
          <li className="card"><h3>2. Compare matching providers</h3><p className="muted">Each match shows why it matched and which registrations we have checked. Paid placements are labelled and never change match scores.</p></li>
          <li className="card"><h3>3. Contact the ones you choose</h3><p className="muted">Your details go only to the providers you select. You can withdraw and erase your enquiry at any time.</p></li>
        </ol>
      </section>

      <section className="container" style={{ marginTop: 40 }}>
        <div className="grid grid-2">
          <div className="card">
            <h2>Registrations we check</h2>
            <p>The Federal Tax Authority registers tax agents and tax agencies. The Ministry of Finance accredits e-invoicing service providers. These are different roles, and we show each one separately.</p>
            <p>A badge appears only after a reviewer has checked the registration against the official source or a document, and it is re-checked on a schedule.</p>
            <Link href="/how-we-verify">How we verify</Link>
          </div>
          <div className="card">
            <h2>Browse by emirate</h2>
            <div className="chips">
              {EMIRATES.map((e) => <Link className="chip" key={e.code} href={`/locations/${e.code}`}>{e.name} ({facets.emirates.get(e.code) ?? 0})</Link>)}
            </div>
            <h2 style={{ marginTop: 24 }}>Are you a provider?</h2>
            <p>List your firm for free and receive enquiries from businesses that choose you.</p>
            <Link className="btn btn-secondary" href="/for-providers">List your firm</Link>
          </div>
        </div>
      </section>
    </>
  );
}
