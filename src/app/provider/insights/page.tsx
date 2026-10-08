import Link from "next/link";
import { getDb } from "@/db/client";
import { requireProvider } from "@/lib/session";
import { effectivePlan } from "@/lib/billing";
import { providerStats } from "@/lib/provider-analytics";

export const metadata = { title: "Insights", robots: { index: false } };

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);
const hours = (v: number | null) => (v === null ? "—" : v < 1 ? "under 1 hour" : `${Math.round(v)} h`);

function Tile({ value, label, note }: { value: string; label: string; note?: string }) {
  return (
    <div className="kpi">
      <div className="v">{value}</div>
      <div className="l">{label}</div>
      {note && <div className="small muted">{note}</div>}
    </div>
  );
}

export default async function Insights() {
  const user = await requireProvider();
  const db = getDb();
  const now = new Date();
  const [plan, s] = await Promise.all([effectivePlan(db, user.organizationId, now), providerStats(db, user.organizationId, now, 30)]);
  const full = plan.features.analytics;
  return (
    <div className="stack">
      <h1>Insights</h1>
      <p className="muted">Last 30 days. Counts only: no buyer details are shown here.</p>
      <div className="kpis" role="list" aria-label="Key figures for the last 30 days">
        <div role="listitem"><Tile value={String(s.enquiries)} label="Enquiries received" /></div>
        <div role="listitem"><Tile value={String(s.awaiting)} label="Awaiting your reply" /></div>
        {full ? (
          <>
            <div role="listitem"><Tile value={String(s.profileViews)} label="Profile views" /></div>
            <div role="listitem"><Tile value={String(s.matchImpressions)} label="Times shown in matches" /></div>
            <div role="listitem"><Tile value={pct(s.acceptanceRate)} label="Acceptance rate" note="of enquiries you answered" /></div>
            <div role="listitem"><Tile value={hours(s.medianResponseHours)} label="Median time to respond" /></div>
          </>
        ) : null}
      </div>
      {full ? (
        <section className="card">
          <h2>Details</h2>
          <div className="table-wrap">
            <table>
              <caption className="skip">Figures for the last 30 days</caption>
              <tbody>
                <tr><th scope="row">Profile views</th><td>{s.profileViews}</td></tr>
                <tr><th scope="row">Shown in buyers&apos; matches</th><td>{s.matchImpressions}</td></tr>
                <tr><th scope="row">Enquiries per time shown</th><td>{pct(s.enquiriesPerImpression)}</td></tr>
                <tr><th scope="row">Accepted / declined / awaiting</th><td>{s.accepted} / {s.declined} / {s.awaiting}</td></tr>
                <tr><th scope="row">Leads waived after review</th><td>{s.waived}</td></tr>
              </tbody>
            </table>
          </div>
          <p className="small muted" style={{ marginBottom: 0 }}>Ways to improve how often you are matched: complete your services, areas served and languages in your profile, and add verified registrations. Match scores are explained on <Link href="/how-ranking-works">How matching works</Link>.</p>
        </section>
      ) : (
        <div className="alert alert-info">Profile views, match appearances, acceptance rate and response time are included in paid plans. <Link href="/provider/billing">See plans</Link>.</div>
      )}
    </div>
  );
}
