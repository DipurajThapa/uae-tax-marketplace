import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db/client";
import { getProviderBySlug } from "@/lib/providers";
import { CredentialStatus } from "@/components/ui";
import { SERVICES, CREDENTIAL_TYPES, LANGUAGE_BY_CODE, EMIRATE_BY_CODE, ORG_KIND_LABELS, JURISDICTION_BY_CODE } from "@/lib/taxonomy";
import { PageHeader } from "@/components/page";

export const metadata: Metadata = { title: "Compare providers", robots: { index: false, follow: true } };
export const dynamic = "force-dynamic";

export default async function Compare({ searchParams }: { searchParams: Promise<{ ids?: string; add?: string }> }) {
  const sp = await searchParams;
  const slugs = [...new Set([...(sp.ids ?? "").split(","), ...(sp.add ? [sp.add] : [])].map((s) => s.trim()).filter(Boolean))].slice(0, 4);
  const db = getDb();
  const providers = (await Promise.all(slugs.map((s) => getProviderBySlug(db, s.slice(0, 100))))).filter((p) => p !== null);
  const services = SERVICES.filter((s) => providers.some((p) => p.services.includes(s.code)));
  const credTypes = CREDENTIAL_TYPES.filter((c) => providers.some((p) => p.credentials.some((x) => x.credentialType === c.code)));
  const ids = providers.map((p) => p.org.slug);
  const without = (slug: string) => `/compare?ids=${ids.filter((x) => x !== slug).join(",")}`;
  return (
    <div className="container">
      <PageHeader kicker="Directory" title="Compare providers" lead="Side by side: services, languages, areas served and checked registrations." />
      <form method="get" action="/compare" className="row" style={{ marginBottom: 16 }}>
        <input type="hidden" name="ids" value={ids.join(",")} />
        <label htmlFor="add" className="skip">Provider profile address</label>
        <input id="add" name="add" type="text" placeholder="Add a provider by its profile name, e.g. alpha-tax-agency" style={{ maxWidth: 420 }} />
        <button className="btn btn-secondary" type="submit" disabled={ids.length >= 4}>Add</button>
        <span className="small muted">Up to 4. You can also use “Compare” on any profile.</span>
      </form>
      {providers.length === 0 ? (
        <div className="card">Nothing to compare yet. <Link href="/providers">Browse providers</Link> and use “Compare with other providers”.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <caption className="skip">Provider comparison</caption>
            <thead>
              <tr><th scope="col">Provider</th>{providers.map((p) => <th scope="col" key={p.org.id}><Link href={`/providers/${p.org.slug}`}>{p.org.tradeName ?? p.org.legalName}</Link>{p.org.isSynthetic && <> <span className="badge badge-neutral">Demo data</span></>}<br /><Link className="small" href={without(p.org.slug)}>Remove</Link></th>)}</tr>
            </thead>
            <tbody>
              <tr><th scope="row">Type</th>{providers.map((p) => <td key={p.org.id}>{ORG_KIND_LABELS[p.org.kind]}</td>)}</tr>
              <tr><th scope="row">Based in</th>{providers.map((p) => <td key={p.org.id}>{EMIRATE_BY_CODE[p.org.emirate]?.name}</td>)}</tr>
              {credTypes.map((c) => (
                <tr key={c.code}><th scope="row">{c.name}</th>{providers.map((p) => { const x = p.credentials.find((y) => y.credentialType === c.code); return <td key={p.org.id}>{x ? <CredentialStatus status={x.status} /> : <span className="muted">n/a</span>}</td>; })}</tr>
              ))}
              {services.map((s) => (
                <tr key={s.code}><th scope="row">{s.name}</th>{providers.map((p) => <td key={p.org.id}>{p.services.includes(s.code) ? "Yes" : <span className="muted">No</span>}</td>)}</tr>
              ))}
              <tr><th scope="row">Languages</th>{providers.map((p) => <td key={p.org.id}>{p.org.languages.map((l) => LANGUAGE_BY_CODE[l]?.name ?? l).join(", ")}</td>)}</tr>
              <tr><th scope="row">Areas served</th>{providers.map((p) => <td key={p.org.id}>{p.jurisdictions.map((j) => JURISDICTION_BY_CODE[j]?.name ?? j).join(", ") || "Not stated"}</td>)}</tr>
              <tr><th scope="row">Team size</th>{providers.map((p) => <td key={p.org.id}>{p.org.sizeBand ?? "Not stated"}</td>)}</tr>
              <tr><th scope="row">Can receive enquiries</th>{providers.map((p) => <td key={p.org.id}>{p.org.claimState === "claimed" && p.org.acceptingEnquiries ? "Yes" : "No"}</td>)}</tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
