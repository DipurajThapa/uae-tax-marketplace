import Link from "next/link";
import { and, asc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db/client";
import { organizations } from "@/db/schema";
import { EMIRATE_BY_CODE, ORG_KIND_LABELS } from "@/lib/taxonomy";
import { requireStaff, param, fmtDate, StatusBadge } from "../_shared";

export const metadata = { title: "Admin: providers" };

const STATUSES = ["draft", "published", "suspended", "removed"] as const;
const CLAIMS = ["unclaimed", "claim_pending", "claimed"] as const;
const PAGE = 50;

export default async function AdminProviders({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireStaff();
  const sp = await searchParams;
  const status = param(sp.status, 20);
  const claim = param(sp.claim, 20);
  const synthetic = param(sp.synthetic, 5);
  const q = param(sp.q, 80);
  const page = Math.max(1, Math.min(Number.parseInt(param(sp.page, 4), 10) || 1, 1000));

  const conds: SQL[] = [];
  if ((STATUSES as readonly string[]).includes(status)) conds.push(eq(organizations.listingStatus, status as (typeof STATUSES)[number]));
  if ((CLAIMS as readonly string[]).includes(claim)) conds.push(eq(organizations.claimState, claim as (typeof CLAIMS)[number]));
  if (synthetic === "yes") conds.push(eq(organizations.isSynthetic, true));
  if (synthetic === "no") conds.push(eq(organizations.isSynthetic, false));
  if (q) {
    const term = `%${q.replace(/[%_\\]/g, (m) => "\\" + m)}%`;
    conds.push(or(ilike(organizations.legalName, term), ilike(organizations.tradeName, term), ilike(organizations.slug, term), ilike(organizations.website, term))!);
  }
  const where = conds.length ? and(...conds) : undefined;

  const db = getDb();
  const [[{ total } = { total: 0 }], rows] = await Promise.all([
    db.select({ total: sql<number>`count(*)::int` }).from(organizations).where(where),
    db.select().from(organizations).where(where).orderBy(asc(organizations.legalName)).limit(PAGE).offset((page - 1) * PAGE),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const qs = (p: number) => {
    const u = new URLSearchParams();
    if (status) u.set("status", status);
    if (claim) u.set("claim", claim);
    if (synthetic) u.set("synthetic", synthetic);
    if (q) u.set("q", q);
    u.set("page", String(p));
    return `/admin/providers?${u.toString()}`;
  };

  return (
    <div className="stack">
      <h1>Providers</h1>
      <form method="get" className="card" aria-label="Filter providers">
        <div className="grid grid-3">
          <div className="field">
            <label htmlFor="q">Search</label>
            <input id="q" name="q" type="search" defaultValue={q} placeholder="Name, slug or website" />
          </div>
          <div className="field">
            <label htmlFor="status">Listing status</label>
            <select id="status" name="status" defaultValue={status}>
              <option value="">Any</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="claim">Claim state</label>
            <select id="claim" name="claim" defaultValue={claim}>
              <option value="">Any</option>
              {CLAIMS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="synthetic">Synthetic (demo) data</label>
            <select id="synthetic" name="synthetic" defaultValue={synthetic}>
              <option value="">Any</option>
              <option value="yes">Synthetic only</option>
              <option value="no">Real only</option>
            </select>
          </div>
        </div>
        <div className="row">
          <button className="btn" type="submit">Apply filters</button>
          <Link href="/admin/providers" className="btn btn-ghost">Clear filters</Link>
        </div>
      </form>

      <p className="muted small">{total} organisation{total === 1 ? "" : "s"} found.</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Kind</th>
              <th scope="col">Emirate</th>
              <th scope="col">Listing</th>
              <th scope="col">Claim</th>
              <th scope="col">Synthetic</th>
              <th scope="col">Last reviewed</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7} className="muted">No organisations match these filters.</td></tr>
            ) : (
              rows.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/admin/providers/${o.id}`}>{o.legalName}</Link>
                    {o.tradeName && <div className="small muted">{o.tradeName}</div>}
                  </td>
                  <td>{ORG_KIND_LABELS[o.kind] ?? o.kind}</td>
                  <td>{EMIRATE_BY_CODE[o.emirate]?.name ?? o.emirate}</td>
                  <td><StatusBadge value={o.listingStatus} /></td>
                  <td><StatusBadge value={o.claimState} /></td>
                  <td>{o.isSynthetic ? "Yes" : "No"}</td>
                  <td>{fmtDate(o.lastReviewedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <nav className="pagination" aria-label="Pages">
          {page > 1 && <Link href={qs(page - 1)}>Previous page</Link>}
          <span className="muted">Page {page} of {pages}</span>
          {page < pages && <Link href={qs(page + 1)}>Next page</Link>}
        </nav>
      )}
    </div>
  );
}
