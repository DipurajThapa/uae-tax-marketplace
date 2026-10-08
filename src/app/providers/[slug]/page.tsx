import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { getProviderBySlug } from "@/lib/providers";
import { CredentialLine, JsonLd } from "@/components/ui";
import {
  CREDENTIAL_BY_CODE,
  EMIRATE_BY_CODE,
  INDUSTRY_BY_CODE,
  JURISDICTION_BY_CODE,
  LANGUAGE_BY_CODE,
  ORG_KIND_LABELS,
  SERVICE_BY_CODE,
} from "@/lib/taxonomy";
import { config } from "@/lib/config";
import { track } from "@/lib/analytics";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

const METHOD_LABEL: Record<string, string> = {
  official_register: "checked against the official register",
  document_review: "checked against documents supplied by the firm",
  self_declared: "declared by the firm, not yet checked",
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProviderBySlug(getDb(), slug);
  if (!p) return { title: "Provider not found", robots: { index: false } };
  const name = p.org.tradeName ?? p.org.legalName;
  const services = p.services.slice(0, 3).map((s) => SERVICE_BY_CODE[s]?.name).filter(Boolean).join(", ");
  return {
    title: `${name}: ${ORG_KIND_LABELS[p.org.kind]} in ${EMIRATE_BY_CODE[p.org.emirate]?.name}`,
    description: `${name} offers ${services}. See services, languages and which registrations have been checked.`,
    alternates: { canonical: `/providers/${slug}` },
    robots: p.org.isSynthetic ? { index: false, follow: false } : undefined,
  };
}

export default async function ProviderPage({ params }: Params) {
  const { slug } = await params;
  const db = getDb();
  const p = await getProviderBySlug(db, slug);
  if (!p) notFound();
  await track(db, "profile_viewed", { orgId: p.org.id });
  const name = p.org.tradeName ?? p.org.legalName;
  const verified = p.credentials.filter((c) => c.status === "verified");
  const canReceive = p.org.claimState === "claimed" && p.org.acceptingEnquiries;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AccountingService",
    name,
    legalName: p.org.legalName,
    url: `${config.siteUrl}/providers/${slug}`,
    ...(p.org.website ? { sameAs: [p.org.website] } : {}),
    address: { "@type": "PostalAddress", addressRegion: EMIRATE_BY_CODE[p.org.emirate]?.name, addressLocality: p.org.city ?? undefined, addressCountry: "AE" },
    areaServed: p.jurisdictions.map((j) => JURISDICTION_BY_CODE[j]?.name).filter(Boolean),
    knowsLanguage: p.org.languages,
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Services",
      itemListElement: p.services.map((s) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: SERVICE_BY_CODE[s]?.name } })),
    },
    // Only verified credentials are published as structured data.
    hasCredential: verified.map((c) => ({
      "@type": "EducationalOccupationalCredential",
      name: CREDENTIAL_BY_CODE[c.credentialType]?.name,
      recognizedBy: { "@type": "Organization", name: CREDENTIAL_BY_CODE[c.credentialType]?.issuer },
    })),
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Providers", item: `${config.siteUrl}/providers` },
      { "@type": "ListItem", position: 2, name: EMIRATE_BY_CODE[p.org.emirate]?.name, item: `${config.siteUrl}/locations/${p.org.emirate}` },
      { "@type": "ListItem", position: 3, name, item: `${config.siteUrl}/providers/${slug}` },
    ],
  };

  return (
    <div className="container">
      {!p.org.isSynthetic && <JsonLd data={jsonLd} />}
      <JsonLd data={breadcrumbs} />
      <nav className="small muted" aria-label="Breadcrumb"><Link href="/providers">Providers</Link> › <Link href={`/locations/${p.org.emirate}`}>{EMIRATE_BY_CODE[p.org.emirate]?.name}</Link> › {name}</nav>
      <div className="row between" style={{ marginTop: 8 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>{name}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {ORG_KIND_LABELS[p.org.kind]} · {p.org.city ? `${p.org.city}, ` : ""}{EMIRATE_BY_CODE[p.org.emirate]?.name}
            {p.org.tradeName && p.org.tradeName !== p.org.legalName ? ` · Legal name: ${p.org.legalName}` : ""}
          </p>
        </div>
        {p.org.isSynthetic && <span className="badge badge-neutral">Demo data: not a real business</span>}
      </div>

      <div className="sidebar-layout" style={{ marginTop: 24, gridTemplateColumns: "1fr 320px" }}>
        <div className="stack">
          <section className="card" aria-labelledby="reg">
            <h2 id="reg">Registrations and qualifications</h2>
            {p.credentials.length === 0 && <p className="muted">This provider has not submitted any registration yet.</p>}
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }} className="stack">
              {p.credentials.map((c) => (
                <li key={c.id}>
                  <CredentialLine type={c.credentialType} status={c.status} registrationNumber={c.registrationNumber} verifiedAt={c.verifiedAt} />
                  <p className="small muted" style={{ margin: "2px 0 0 0" }}>
                    {c.status === "verified"
                      ? `Issued by ${CREDENTIAL_BY_CODE[c.credentialType]?.issuer}; ${METHOD_LABEL[c.method]}. Next check due ${c.recheckDueAt?.toISOString().slice(0, 10) ?? "n/a"}.`
                      : c.status === "disputed"
                        ? "Someone reported a problem with this registration. It is hidden until a reviewer resolves it."
                        : c.status === "expired"
                          ? "Its scheduled re-check is overdue, so it is not shown as verified."
                          : METHOD_LABEL[c.method] + "."}
                  </p>
                </li>
              ))}
            </ul>
            <p className="small" style={{ marginTop: 12 }}><Link href="/how-we-verify">How we verify registrations</Link></p>
          </section>

          {p.org.description && (
            <section className="card">
              <h2>About</h2>
              <p style={{ whiteSpace: "pre-line" }}>{p.org.description}</p>
              <p className="small muted" style={{ marginBottom: 0 }}>Written by the provider.</p>
            </section>
          )}

          <section className="card">
            <h2>Services</h2>
            <ul>
              {p.services.map((s) => (
                <li key={s}><Link href={`/services/${s}`}>{SERVICE_BY_CODE[s]?.name ?? s}</Link></li>
              ))}
            </ul>
            {p.industries.length > 0 && (
              <>
                <h3>Industry experience (as stated by the provider)</h3>
                <div className="chips">{p.industries.map((i) => <span className="chip" key={i}>{INDUSTRY_BY_CODE[i]?.name ?? i}</span>)}</div>
              </>
            )}
          </section>

          {p.people.length > 0 && (
            <section className="card">
              <h2>People</h2>
              <ul style={{ listStyle: "none", padding: 0 }} className="stack">
                {p.people.map((person) => (
                  <li key={person.id}>
                    <strong>{person.fullName}</strong>{person.title ? `, ${person.title}` : ""}
                    {person.credentials.map((c) => <CredentialLine key={c.id} type={c.credentialType} status={c.status} registrationNumber={c.registrationNumber} verifiedAt={c.verifiedAt} />)}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="stack">
          <div className="card">
            <h2>Contact</h2>
            {canReceive ? (
              <>
                <p className="small">Tell us what you need and send your enquiry to this provider (and up to two others, if you like).</p>
                <Link className="btn" href={`/match?provider=${encodeURIComponent(slug)}`}>Start an enquiry</Link>
              </>
            ) : p.org.claimState !== "claimed" ? (
              <p className="small">This listing has not been claimed by the business, so it cannot receive enquiries through the directory yet.</p>
            ) : (
              <p className="small">This provider is not taking new enquiries at the moment.</p>
            )}
            <dl className="dl small" style={{ marginTop: 16 }}>
              {p.org.website && (<><dt>Website</dt><dd><a href={p.org.website} rel="nofollow noopener" target="_blank">{p.org.website.replace(/^https?:\/\//, "")}</a></dd></>)}
              <dt>Languages</dt><dd>{p.org.languages.map((l) => LANGUAGE_BY_CODE[l]?.name ?? l).join(", ") || "Not stated"}</dd>
              <dt>Areas served</dt><dd>{p.jurisdictions.map((j) => JURISDICTION_BY_CODE[j]?.name ?? j).join(", ") || "Not stated"}</dd>
              {p.org.sizeBand && (<><dt>Team size</dt><dd>{p.org.sizeBand}</dd></>)}
              {p.org.foundedYear && (<><dt>Founded</dt><dd>{p.org.foundedYear}</dd></>)}
            </dl>
          </div>
          <div className="card small">
            <p><Link href={`/compare?ids=${p.org.slug}`}>Compare with other providers</Link></p>
            {p.org.claimState === "unclaimed" && <p><Link href={`/claim/${slug}`}>Is this your business? Claim this listing</Link></p>}
            <p style={{ marginBottom: 0 }}><Link href={`/report/${slug}`}>Report incorrect information</Link></p>
          </div>
          <p className="small muted">Listing last reviewed {p.org.lastReviewedAt ? p.org.lastReviewedAt.toISOString().slice(0, 10) : "not yet"}.</p>
        </aside>
      </div>
    </div>
  );
}
