import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db/client";
import { searchProviders, activePromotions, PAGE_SIZE, type SearchFilters } from "@/lib/providers";
import { SERVICES, EMIRATES, JURISDICTIONS, LANGUAGES, ORG_KIND_LABELS, CREDENTIAL_TYPES, SERVICE_BY_CODE, EMIRATE_BY_CODE, isEmirate, isService } from "@/lib/taxonomy";
import { ProviderCard, Empty } from "@/components/ui";
import { track } from "@/lib/analytics";
import { robotsFor } from "@/lib/seo";

type SP = Record<string, string | undefined>;

export const dynamic = "force-dynamic";

function parseFilters(sp: SP): SearchFilters {
  return {
    q: sp.q?.trim().slice(0, 80) || undefined,
    service: sp.service && isService(sp.service) ? sp.service : undefined,
    emirate: sp.emirate && isEmirate(sp.emirate) ? sp.emirate : undefined,
    jurisdiction: JURISDICTIONS.some((j) => j.code === sp.jurisdiction) ? sp.jurisdiction : undefined,
    language: LANGUAGES.some((l) => l.code === sp.language) ? sp.language : undefined,
    kind: sp.kind && Object.hasOwn(ORG_KIND_LABELS, sp.kind) ? sp.kind : undefined,
    credential: CREDENTIAL_TYPES.some((c) => c.code === sp.credential) ? sp.credential : undefined,
    verifiedOnly: sp.verified === "1",
    page: Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1),
  };
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const f = parseFilters(await searchParams);
  const parts = [f.service && SERVICE_BY_CODE[f.service]?.name, f.emirate && `in ${EMIRATE_BY_CODE[f.emirate]?.name}`].filter(Boolean);
  const filtered = Object.entries(f).some(([k, v]) => k !== "page" && v !== undefined && v !== false);
  return {
    title: parts.length ? `${parts.join(" ")} providers` : "UAE tax and e-invoicing providers",
    // Filtered combinations are not canonical pages; the service and location landing pages are.
    alternates: { canonical: "/providers" },
    robots: robotsFor(!filtered && (f.page ?? 1) === 1),
  };
}

export default async function ProvidersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const f = parseFilters(sp);
  const db = getDb();
  const [res, promoted] = await Promise.all([
    searchProviders(db, f),
    activePromotions(db, { placement: "search", service: f.service, emirate: f.emirate, now: new Date() }),
  ]);
  await track(db, "search_performed", { service: f.service, emirate: f.emirate, results: res.total });
  const pages = Math.max(1, Math.ceil(res.total / PAGE_SIZE));
  const qs = (patch: SP) => {
    const u = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/providers?${u}`;
  };
  return (
    <div className="container">
      <h1>Find a provider</h1>
      <div className="sidebar-layout">
        <form method="get" action="/providers" className="card" aria-label="Filters">
          <div className="field"><label htmlFor="q">Keyword</label><input id="q" name="q" type="search" defaultValue={f.q} /></div>
          <div className="field"><label htmlFor="service">Service</label>
            <select id="service" name="service" defaultValue={f.service ?? ""}><option value="">Any</option>{SERVICES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}</select></div>
          <div className="field"><label htmlFor="emirate">Emirate</label>
            <select id="emirate" name="emirate" defaultValue={f.emirate ?? ""}><option value="">Any</option>{EMIRATES.map((e) => <option key={e.code} value={e.code}>{e.name}</option>)}</select></div>
          <div className="field"><label htmlFor="jurisdiction">Free zone or area served</label>
            <select id="jurisdiction" name="jurisdiction" defaultValue={f.jurisdiction ?? ""}><option value="">Any</option>{JURISDICTIONS.map((j) => <option key={j.code} value={j.code}>{j.name}</option>)}</select></div>
          <div className="field"><label htmlFor="language">Language</label>
            <select id="language" name="language" defaultValue={f.language ?? ""}><option value="">Any</option>{LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}</select></div>
          <div className="field"><label htmlFor="kind">Type of firm</label>
            <select id="kind" name="kind" defaultValue={f.kind ?? ""}><option value="">Any</option>{Object.entries(ORG_KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div className="field"><label htmlFor="credential">Verified registration</label>
            <select id="credential" name="credential" defaultValue={f.credential ?? ""}><option value="">Any</option>{CREDENTIAL_TYPES.filter((c) => c.subject === "organization").map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select></div>
          <label className="option" style={{ marginBottom: 16 }}><input type="checkbox" name="verified" value="1" defaultChecked={f.verifiedOnly} /> Only providers with a verified registration</label>
          <div className="row"><button className="btn" type="submit">Apply filters</button><Link href="/providers">Clear</Link></div>
        </form>
        <section aria-live="polite">
          <p className="muted">{res.total} provider{res.total === 1 ? "" : "s"} found. Sorted by verified registration, then name. <Link href="/how-ranking-works">How ordering works</Link>.</p>
          {promoted.length > 0 && !f.q && !f.kind && !f.language && !f.jurisdiction && !f.credential && !f.verifiedOnly && (
            <section aria-label="Sponsored listings" className="stack" style={{ marginBottom: 24 }}>
              <p className="small muted" style={{ margin: 0 }}>Sponsored: these providers pay for this placement. It does not affect search order or match scores.</p>
              {promoted.map((p) => <ProviderCard key={`s-${p.id}`} p={p} sponsored />)}
            </section>
          )}
          {res.items.length === 0 ? (
            <Empty title="No providers match these filters">
              <p>Try removing a filter, or <Link href="/match">describe what you need</Link> and we will show the closest matches and explain any gaps.</p>
            </Empty>
          ) : (
            <div className="stack">
              {res.items.map((p) => <ProviderCard key={p.id} p={p} />)}
            </div>
          )}
          {pages > 1 && (
            <nav className="pagination" aria-label="Pagination">
              {f.page! > 1 && <Link className="btn btn-secondary btn-sm" href={qs({ page: String(f.page! - 1) })}>Previous</Link>}
              <span className="muted">Page {f.page} of {pages}</span>
              {f.page! < pages && <Link className="btn btn-secondary btn-sm" href={qs({ page: String(f.page! + 1) })}>Next</Link>}
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}
