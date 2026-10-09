import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { getProviderBySlug } from "@/lib/providers";
import { effectivePlan } from "@/lib/billing";
import { CredentialLine, FirmMark, JsonLd } from "@/components/ui";
import { Band, Breadcrumbs } from "@/components/page";
import { MONEY } from "@/components/money";
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
import { robotsFor } from "@/lib/seo";
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
    robots: robotsFor(!p.org.isSynthetic),
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
  // Direct contact details are a paid-plan feature; free listings are reached through enquiries.
  const showContact = p.org.claimState === "claimed" && (await effectivePlan(db, p.org.id, new Date())).features.showContactDetails;

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

  const people = p.people.filter((person) => person.credentials.some((c) => c.status === "verified"));
  return (
    <>
      <div className="container">
        {!p.org.isSynthetic && <JsonLd data={jsonLd} />}
        <JsonLd data={breadcrumbs} />
        <Breadcrumbs items={[{ label: "Providers", href: "/providers" }, { label: EMIRATE_BY_CODE[p.org.emirate]?.name ?? p.org.emirate, href: `/locations/${p.org.emirate}` }, { label: name }]} />
        <header className="profile-head">
          <FirmMark kind={p.org.kind} size={88} />
          <div className="who">
            <p className="kicker">{ORG_KIND_LABELS[p.org.kind]} · {p.org.city ? `${p.org.city}, ` : ""}{EMIRATE_BY_CODE[p.org.emirate]?.name}</p>
            <h1>{name}</h1>
            {p.org.tradeName && p.org.tradeName !== p.org.legalName && <p className="muted mb-0 mt-1">Legal name: {p.org.legalName}</p>}
          </div>
          <div className="row">
            {p.org.isSynthetic && <span className="badge badge-neutral">Demo data: not a real business</span>}
            <a className="btn btn-accent" href="#contact">Contact</a>
            <Link className="btn btn-secondary" href={`/compare?ids=${p.org.slug}`}>Compare</Link>
          </div>
        </header>
        {(verified.length > 0 || people.length > 0) && (
          <div className="badge-row" aria-label="Verified registrations">
            {verified.map((c) => <span key={c.id} className="badge badge-ok">Verified · {CREDENTIAL_BY_CODE[c.credentialType]?.name}</span>)}
            {people.length > 0 && <span className="badge badge-ok">{people.length} {people.length === 1 ? "person" : "people"} with a verified registration</span>}
          </div>
        )}

        <div className="sidebar-layout sidebar-right mt-4">
          <div className="stack">
            <section className="card card-flush" aria-labelledby="reg">
              <div className="card-head"><h2 id="reg">Registrations and qualifications</h2></div>
              {p.credentials.length === 0 && <p className="muted" style={{ padding: "16px 22px", margin: 0 }}>This provider has not submitted any registration yet.</p>}
              <ul className="reg-list">
                {p.credentials.map((c) => (
                  <li key={c.id}>
                    <CredentialLine type={c.credentialType} status={c.status} registrationNumber={c.registrationNumber} verifiedAt={c.verifiedAt} />
                    <p className="small muted">
                      {c.status === "verified"
                        ? `Issued by ${CREDENTIAL_BY_CODE[c.credentialType]?.issuer}; ${METHOD_LABEL[c.method]}. Next check due ${c.recheckDueAt?.toISOString().slice(0, 10) ?? "n/a"}.`
                        : c.status === "disputed"
                          ? "A reviewer is investigating a reported problem with this registration. It is not shown as verified until the review ends."
                          : c.status === "expired"
                            ? "Its scheduled re-check is overdue, so it is not shown as verified."
                            : c.status === "pending"
                              ? "Submitted by the firm; a reviewer has not finished checking it."
                              : c.status === "revoked"
                                ? "A reviewer could not confirm this registration. It is not verified."
                                : "Declared by the firm, not checked. It is not verified."}
                    </p>
                  </li>
                ))}
                <li className="small">
                  A registration shows as “Verified” only after a named reviewer confirms it. An overdue re-check, an open dispute or a failed check
                  removes it. <Link href="/how-we-verify">How we verify registrations</Link>
                </li>
              </ul>
            </section>

            {p.org.description && (
              <section className="card" aria-labelledby="about">
                <h2 id="about">About</h2>
                <p style={{ whiteSpace: "pre-line" }}>{p.org.description}</p>
                <p className="kicker mb-0">Written by the provider</p>
              </section>
            )}

            <section className="card" aria-labelledby="services">
              <h2 id="services">Services</h2>
              <div className="chip-nav">
                {p.services.map((s) => <Link className="chip" key={s} href={`/services/${s}`}>{SERVICE_BY_CODE[s]?.name ?? s}</Link>)}
              </div>
              {p.industries.length > 0 && (
                <>
                  <h3 className="mt-3">Industry experience (as stated by the provider)</h3>
                  <div className="chips">{p.industries.map((i) => <span className="chip" key={i}>{INDUSTRY_BY_CODE[i]?.name ?? i}</span>)}</div>
                </>
              )}
            </section>

            {p.people.length > 0 && (
              <section className="card card-flush" aria-labelledby="people">
                <div className="card-head"><h2 id="people">People</h2></div>
                <ul className="reg-list">
                  <li className="small muted">A firm&apos;s registration and its people&apos;s registrations are separate, so each is shown and checked on its own.</li>
                  {p.people.map((person) => (
                    <li key={person.id} className="stack" style={{ gap: 6 }}>
                      <p className="mb-0"><strong>{person.fullName}</strong>{person.title ? `, ${person.title}` : ""}</p>
                      {person.credentials.map((c) => <CredentialLine key={c.id} type={c.credentialType} status={c.status} registrationNumber={c.registrationNumber} verifiedAt={c.verifiedAt} />)}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside className="stack">
            <div className="contact-box" id="contact">
              <h2>Contact</h2>
              {canReceive ? (
                <>
                  <p>Tell us what you need and send your enquiry to this provider (and up to two others, if you like).</p>
                  <Link className="btn" href={`/match?provider=${encodeURIComponent(slug)}`}>Start an enquiry</Link>
                  <p className="small mt-2 mb-0">Free for businesses. Only the firms you choose see your details.</p>
                </>
              ) : p.org.claimState !== "claimed" ? (
                <p className="mb-0">This listing has not been claimed by the business, so it cannot receive enquiries through the directory yet.</p>
              ) : (
                <p className="mb-0">This provider is not taking new enquiries at the moment.</p>
              )}
            </div>
            <div className="card">
              <dl className="dl small">
                {p.org.website && (<><dt>Website</dt><dd><a href={p.org.website} rel="nofollow noopener" target="_blank">{p.org.website.replace(/^https?:\/\//, "")}</a></dd></>)}
                {showContact && p.org.publicEmail && (<><dt>Email</dt><dd><a href={`mailto:${p.org.publicEmail}`}>{p.org.publicEmail}</a></dd></>)}
                {showContact && p.org.publicPhone && (<><dt>Phone</dt><dd><a href={`tel:${p.org.publicPhone.replace(/[^+0-9]/g, "")}`}>{p.org.publicPhone}</a></dd></>)}
                <dt>Languages</dt><dd>{p.org.languages.map((l) => LANGUAGE_BY_CODE[l]?.name ?? l).join(", ") || "Not stated"}</dd>
                <dt>Areas served</dt><dd>{p.jurisdictions.map((j) => JURISDICTION_BY_CODE[j]?.name ?? j).join(", ") || "Not stated"}</dd>
                {p.org.sizeBand && (<><dt>Team size</dt><dd>{p.org.sizeBand}</dd></>)}
                {p.org.foundedYear && (<><dt>Founded</dt><dd>{p.org.foundedYear}</dd></>)}
              </dl>
              <p className="small muted mt-2 mb-0">Direct email and phone appear only on paid plans. Claimed listings receive enquiries through Taxdar on every plan.</p>
            </div>
            <div className="card small">
              <p><Link href={`/compare?ids=${p.org.slug}`}>Compare with other providers</Link></p>
              <p className="mb-0"><Link href={`/report/${slug}`}>Report incorrect information</Link></p>
            </div>
            <div className="note-box small">
              <p className="kicker">Badges are never for sale</p>
              <p>{MONEY.never} <Link href="/how-ranking-works#money">How Taxdar makes money</Link></p>
            </div>
            <p className="small muted">Listing last reviewed {p.org.lastReviewedAt ? p.org.lastReviewedAt.toISOString().slice(0, 10) : "not yet"}.</p>
          </aside>
        </div>
      </div>

      {p.org.claimState === "unclaimed" && (
        <div className="container">
          <Band tone="brand" label="Claim this listing">
            <div className="band-row">
              <div>
                <p className="kicker">Is this your business?</p>
                <h2>Claim this listing to receive enquiries</h2>
                <p>Claiming is free. A reviewer confirms you represent the firm before the listing can receive enquiries.</p>
              </div>
              <Link className="btn btn-accent" href={`/claim/${slug}`}>Claim this listing</Link>
            </div>
          </Band>
        </div>
      )}
    </>
  );
}
