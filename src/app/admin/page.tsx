import Link from "next/link";
import { and, gte, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { analyticsEvents } from "@/db/schema";
import { verificationQueueCounts } from "@/lib/verification";
import { revenueSummary, periodMonth } from "@/lib/billing";
import { requireStaff, param, pct } from "./_shared";

export const metadata = { title: "Admin dashboard" };

const FUNNEL_DAYS = 30;

/** Funnel steps. `base` is the step each one converts from (no_match is the alternative outcome to matches_shown). */
const FUNNEL: { name: string; label: string; base?: string }[] = [
  { name: "assessment_started", label: "Assessment started" },
  { name: "assessment_completed", label: "Assessment completed", base: "assessment_started" },
  { name: "matches_shown", label: "Matches shown", base: "assessment_completed" },
  { name: "no_match", label: "No match found", base: "assessment_completed" },
  { name: "enquiry_submitted", label: "Enquiry submitted", base: "matches_shown" },
  { name: "search_performed", label: "Directory search performed" },
  { name: "profile_viewed", label: "Provider profile viewed", base: "search_performed" },
];

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireStaff();
  const sp = await searchParams;
  const now = new Date();
  const monthParam = param(sp.month, 7);
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam) ? monthParam : periodMonth(now);
  const db = getDb();

  const since = new Date(now.getTime() - FUNNEL_DAYS * 86400_000);
  const [counts, revenue, funnelRows] = await Promise.all([
    verificationQueueCounts(db),
    user.role === "admin" ? revenueSummary(db, month) : Promise.resolve(null),
    db
      .select({ name: analyticsEvents.name, n: sql<number>`count(*)::int` })
      .from(analyticsEvents)
      .where(and(inArray(analyticsEvents.name, FUNNEL.map((f) => f.name)), gte(analyticsEvents.createdAt, since)))
      .groupBy(analyticsEvents.name),
  ]);
  const funnel = new Map(funnelRows.map((r) => [r.name, r.n]));
  const n = (name: string) => funnel.get(name) ?? 0;

  const kpis: { label: string; value: number; href: string }[] = [
    { label: "Credential submissions pending", value: counts.submissions, href: "/admin/verification" },
    { label: "Open disputes", value: counts.disputes, href: "/admin/disputes" },
    { label: "Claims pending", value: counts.claims, href: "/admin/claims" },
    { label: "Expired credentials", value: counts.expired, href: "/admin/verification#expired" },
    { label: "Draft listings", value: counts.drafts, href: "/admin/providers?status=draft" },
    { label: "Dead notifications", value: counts.deadNotifications, href: "/admin/notifications?status=dead" },
  ];

  return (
    <div className="stack">
      <h1>Dashboard</h1>

      <section aria-labelledby="queues">
        <h2 id="queues">Work queues</h2>
        <div className="kpis">
          {kpis.map((k) => (
            <Link key={k.label} href={k.href} className="kpi card-link">
              <div className="v">{k.value}</div>
              <div className="l">{k.label}</div>
            </Link>
          ))}
        </div>
      </section>

      {revenue && (
        <section aria-labelledby="revenue">
          <h2 id="revenue">Revenue summary for {month}</h2>
          <div className="alert alert-warn" role="note" style={{ marginBottom: 12 }}>
            <strong>Test mode: no real payments.</strong> These figures come from the internal test ledger and are not real revenue.
          </div>
          <form method="get" className="row" style={{ marginBottom: 12 }}>
            <label htmlFor="month" style={{ margin: 0 }}>Month</label>
            <input id="month" name="month" type="text" defaultValue={month} pattern="\d{4}-\d{2}" placeholder="YYYY-MM" style={{ maxWidth: 140 }} />
            <button className="btn btn-sm btn-secondary" type="submit">Show month</button>
          </form>
          <div className="grid grid-2">
            <div className="table-wrap">
              <table>
                <caption className="small muted" style={{ textAlign: "left", padding: "8px 12px" }}>Active and trialing subscriptions (test mode)</caption>
                <thead>
                  <tr><th scope="col">Plan</th><th scope="col">Subscriptions</th><th scope="col">Monthly list price total (AED, test)</th></tr>
                </thead>
                <tbody>
                  {revenue.subscriptions.length === 0 ? (
                    <tr><td colSpan={3} className="muted">No active subscriptions</td></tr>
                  ) : (
                    revenue.subscriptions.map((s) => (
                      <tr key={s.plan}><td>{s.plan}</td><td>{s.n}</td><td>{s.mrr}</td></tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="table-wrap">
              <table>
                <caption className="small muted" style={{ textAlign: "left", padding: "8px 12px" }}>Leads in {month} (test mode)</caption>
                <tbody>
                  <tr><th scope="row">Lead charges</th><td>{revenue.leads.total}</td></tr>
                  <tr><th scope="row">Included in plan allowance</th><td>{revenue.leads.included}</td></tr>
                  <tr><th scope="row">Overage (AED, test, excl. waived)</th><td>{revenue.leads.overageAed}</td></tr>
                  <tr><th scope="row">Waived</th><td>{revenue.leads.waived}</td></tr>
                  <tr><th scope="row">Recipients accepted / routed</th><td>{revenue.acceptance.n} / {revenue.acceptance.all} ({pct(revenue.acceptance.n, revenue.acceptance.all)})</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <section aria-labelledby="funnel">
        <h2 id="funnel">Funnel, last {FUNNEL_DAYS} days</h2>
        <p className="small muted">From first-party analytics events (no personal data). Conversion is measured against the step named in “Compared with”.</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th scope="col">Step</th><th scope="col">Events</th><th scope="col">Compared with</th><th scope="col">Step conversion</th></tr>
            </thead>
            <tbody>
              {FUNNEL.map((f) => (
                <tr key={f.name}>
                  <th scope="row">{f.label} <span className="muted small">({f.name})</span></th>
                  <td>{n(f.name)}</td>
                  <td>{f.base ? FUNNEL.find((x) => x.name === f.base)?.label : "—"}</td>
                  <td>{f.base ? pct(n(f.name), n(f.base)) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
