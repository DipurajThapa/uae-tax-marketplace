import Link from "next/link";
import { getDb } from "@/db/client";
import { facetCounts } from "@/lib/providers";
import { SERVICES, SERVICE_CATEGORIES, EMIRATES } from "@/lib/taxonomy";
import { BRAND } from "@/lib/brand";
import { JsonLd } from "@/components/ui";
import { config } from "@/lib/config";
import { RadarScene, RoleIcon, StepIcon } from "@/components/illustrations";
import { MoneyRules } from "@/components/money";

export const dynamic = "force-dynamic";

export default async function Home() {
  const facets = await facetCounts(getDb());
  const categories = Object.entries(SERVICE_CATEGORIES);
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Organization", name: BRAND.name, alternateName: BRAND.nameAr, description: BRAND.description, url: config.siteUrl, logo: `${config.siteUrl}/icon.svg` }} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "WebSite", name: BRAND.name, alternateName: BRAND.nameAr, url: config.siteUrl, potentialAction: { "@type": "SearchAction", target: `${config.siteUrl}/providers?q={query}`, "query-input": "required name=query" } }} />
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
          <p className="kicker">Corporate Tax · VAT · E-invoicing</p>
          <h1>Find UAE tax and e-invoicing professionals whose registrations <span className="hl-mark">you can check</span></h1>
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
          <div className="hero-art">
            <RadarScene />
            <span className="hero-tag hero-tag-1">Tax agent · checked</span>
            <span className="hero-tag hero-tag-2">VAT · Dubai</span>
            <span className="hero-tag hero-tag-3">E-invoicing · Arabic</span>
          </div>
        </div>
      </section>
      <div className="ticker" aria-hidden="true">
        <div className="ticker-track">
          {[0, 1].map((copy) => SERVICES.slice(0, 8).map((s) => <span key={`${copy}-${s.code}`}>{s.name} ✦</span>))}
        </div>
      </div>

      <section className="container mt-4">
        <p className="kicker">Explore</p>
        <h2>Browse by service</h2>
        <div className="grid grid-3">
          {categories.map(([cat, label]) => (
            <div className="card lift" key={cat}>
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

      <section className="container mt-4">
        <p className="kicker">How it works</p>
        <h2>Two minutes. Three steps. Your choice.</h2>
        <ol className="grid grid-3" style={{ listStyle: "none", padding: 0 }}>
          <li className="card lift"><StepIcon step={1} /><h3>1. Describe what you need</h3><p className="muted">Choose services and answer a few questions about your business. Ranges are enough.</p></li>
          <li className="card lift"><StepIcon step={2} /><h3>2. Compare matching providers</h3><p className="muted">Each match shows why it matched and which registrations we have checked. Paid placements are labelled and never change match scores.</p></li>
          <li className="card lift"><StepIcon step={3} /><h3>3. Contact the ones you choose</h3><p className="muted">Your details go only to the providers you select. You can withdraw and erase your enquiry at any time.</p></li>
        </ol>
      </section>

      <section className="container mt-4" aria-labelledby="money-h">
        <p className="kicker">Open about money</p>
        <h2 id="money-h">How Taxdar makes money</h2>
        <MoneyRules />
      </section>

      <section className="container mt-4">
        <div className="grid grid-2">
          <div className="card">
            <h2>Registrations we check</h2>
            <p>The Federal Tax Authority registers tax agents and tax agencies. The Ministry of Finance accredits e-invoicing service providers. These are different roles, and we show each one separately.</p>
            <ul className="roles">
              <li><RoleIcon kind="agent" /><span><strong>Tax agent</strong>: a person who can act for you before the FTA</span></li>
              <li><RoleIcon kind="agency" /><span><strong>Tax agency</strong>: the firm that agents work through</span></li>
              <li><RoleIcon kind="einvoicing" /><span><strong>E-invoicing provider</strong>: accredited software, not a tax representative</span></li>
            </ul>
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
            <Link className="btn btn-accent" href="/for-providers">List your firm</Link>
          </div>
        </div>
      </section>
    </>
  );
}
