import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { subscriptions, plans, organizations, leadCharges, enquiryRecipients, enquiries } from "@/db/schema";
import { billing, setChargeStatus, revenueSummary, periodMonth } from "@/lib/billing";
import { userActor } from "@/lib/audit";
import { requireAdmin, attempt, done, fail, text, oneOf, uuidField, param, fmtDate, fmtDateTime, FlashMessages, StatusBadge, TestModeBanner } from "../_shared";

export const metadata = { title: "Admin: billing (test mode)" };

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const backTo = (month: string) => (MONTH_RE.test(month) ? `/admin/billing?month=${month}` : "/admin/billing");

async function chargeStatus(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const back = backTo(text(formData, "month", 7));
  const chargeId = uuidField(formData, "chargeId");
  if (!chargeId) fail(back, "Unknown lead charge");
  const status = oneOf(formData, "status", ["waived", "disputed", "pending"] as const);
  if (!status) fail(back, "Choose waived, disputed or pending");
  const reason = text(formData, "reason", 500);
  if (reason.length < 3) fail(back, "A reason is required");
  const r = await attempt(() => setChargeStatus(getDb(), userActor(user.id), chargeId, status, reason));
  if (!r.ok) fail(back, r.error);
  done(back, `Lead charge set to ${status} (test mode)`);
}

async function subscribe(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const back = backTo(text(formData, "month", 7));
  const orgId = uuidField(formData, "organizationId");
  if (!orgId) fail(back, "Choose an organisation");
  const planCode = text(formData, "planCode", 50);
  if (!/^[a-z0-9_-]+$/.test(planCode)) fail(back, "Choose a plan");
  const db = getDb();
  const [org] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, orgId));
  if (!org) fail(back, "Organisation not found");
  const r = await attempt(() => billing().subscribe(db, userActor(user.id), orgId, planCode, new Date()));
  if (!r.ok) fail(back, r.error);
  done(back, `Test-mode subscription to ${planCode} started. No payment was taken.`);
}

async function subscriptionAction(kind: "cancel" | "past_due", formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const back = backTo(text(formData, "month", 7));
  const subId = uuidField(formData, "subscriptionId");
  if (!subId) fail(back, "Unknown subscription");
  const db = getDb();
  const [sub] = await db.select({ status: subscriptions.status }).from(subscriptions).where(eq(subscriptions.id, subId));
  if (!sub) fail(back, "Subscription not found");
  if (sub.status === "canceled") fail(back, "That subscription is already canceled");
  if (kind === "past_due" && sub.status === "past_due") fail(back, "That subscription is already past due");
  const actor = userActor(user.id);
  const r =
    kind === "cancel"
      ? await attempt(() => billing().cancel(db, actor, subId, new Date()))
      : kind === "past_due"
        ? await attempt(() => billing().markPastDue(db, actor, subId))
        : ({ ok: false, error: "Unknown action" } as const);
  if (!r.ok) fail(back, r.error);
  done(back, kind === "cancel" ? "Subscription canceled (test mode)" : "Subscription marked past due (test mode)");
}

export default async function AdminBilling({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const monthParam = param(sp.month, 7);
  const month = MONTH_RE.test(monthParam) ? monthParam : periodMonth(new Date());
  const notice = param(sp.notice, 300) || undefined;
  const error = param(sp.error, 300) || undefined;
  const db = getDb();
  const [subs, planRows, orgs, charges, summary] = await Promise.all([
    db
      .select({ s: subscriptions, orgName: organizations.legalName, planName: plans.name })
      .from(subscriptions)
      .innerJoin(organizations, eq(organizations.id, subscriptions.organizationId))
      .innerJoin(plans, eq(plans.code, subscriptions.planCode))
      .orderBy(desc(subscriptions.createdAt))
      .limit(300),
    db.select().from(plans).where(eq(plans.active, true)).orderBy(asc(plans.monthlyPriceAed)),
    db.select({ id: organizations.id, legalName: organizations.legalName, isSynthetic: organizations.isSynthetic }).from(organizations).orderBy(asc(organizations.legalName)),
    db
      .select({ c: leadCharges, orgName: organizations.legalName, ref: enquiries.publicRef, enquiryId: enquiries.id })
      .from(leadCharges)
      .innerJoin(organizations, eq(organizations.id, leadCharges.organizationId))
      .innerJoin(enquiryRecipients, eq(enquiryRecipients.id, leadCharges.enquiryRecipientId))
      .innerJoin(enquiries, eq(enquiries.id, enquiryRecipients.enquiryId))
      .where(eq(leadCharges.periodMonth, month))
      .orderBy(desc(leadCharges.createdAt)),
    revenueSummary(db, month),
  ]);

  return (
    <div className="stack">
      <h1>Billing <span className="badge badge-warn">TEST MODE</span></h1>
      <TestModeBanner />
      <FlashMessages notice={notice} error={error} />

      <form method="get" className="row">
        <label htmlFor="month" style={{ margin: 0 }}>Month</label>
        <input id="month" name="month" type="text" defaultValue={month} pattern="\d{4}-\d{2}" placeholder="YYYY-MM" style={{ maxWidth: 140 }} />
        <button className="btn btn-sm btn-secondary" type="submit">Show month</button>
      </form>

      <section className="kpis" aria-label={`Test-mode summary for ${month}`}>
        <div className="kpi"><div className="v">{summary.leads.total}</div><div className="l">Lead charges in {month} (test)</div></div>
        <div className="kpi"><div className="v">{summary.leads.included}</div><div className="l">Included in allowance (test)</div></div>
        <div className="kpi"><div className="v">AED {summary.leads.overageAed}</div><div className="l">Overage, excl. waived (test)</div></div>
        <div className="kpi"><div className="v">{summary.leads.waived}</div><div className="l">Waived (test)</div></div>
      </section>

      <section className="card" aria-labelledby="start">
        <h2 id="start">Start a test-mode subscription</h2>
        <p className="small muted">TEST MODE: records a subscription in the internal ledger. Any current subscription for the organisation is canceled. No one is charged.</p>
        <form action={subscribe} className="grid grid-3" style={{ alignItems: "end" }}>
          <input type="hidden" name="month" value={month} />
          <div className="field">
            <label htmlFor="organizationId">Organisation</label>
            <select id="organizationId" name="organizationId" required defaultValue="">
              <option value="" disabled>Choose an organisation</option>
              {orgs.map((o) => <option key={o.id} value={o.id}>{o.legalName}{o.isSynthetic ? " (demo)" : ""}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="planCode">Plan</label>
            <select id="planCode" name="planCode" required defaultValue="">
              <option value="" disabled>Choose a plan</option>
              {planRows.map((p) => <option key={p.code} value={p.code}>{p.name} (AED {p.monthlyPriceAed}/month, test)</option>)}
            </select>
          </div>
          <div className="field">
            <button className="btn" type="submit">Start test subscription</button>
          </div>
        </form>
      </section>

      <section aria-labelledby="subs">
        <h2 id="subs">Subscriptions (test mode)</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Organisation</th>
                <th scope="col">Plan</th>
                <th scope="col">Status</th>
                <th scope="col">Provider</th>
                <th scope="col">Period</th>
                <th scope="col">Canceled</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subs.length === 0 ? (
                <tr><td colSpan={7} className="muted">No subscriptions.</td></tr>
              ) : (
                subs.map(({ s, orgName, planName }) => (
                  <tr key={s.id}>
                    <td><Link href={`/admin/providers/${s.organizationId}`}>{orgName}</Link></td>
                    <td>{planName}</td>
                    <td><StatusBadge value={s.status} /></td>
                    <td>{s.billingProvider}</td>
                    <td className="small">{fmtDate(s.currentPeriodStart)} to {fmtDate(s.currentPeriodEnd)}</td>
                    <td className="small">{fmtDateTime(s.canceledAt)}</td>
                    <td>
                      {s.status !== "canceled" && (
                        <form className="row" style={{ gap: 6 }}>
                          <input type="hidden" name="subscriptionId" value={s.id} />
                          <input type="hidden" name="month" value={month} />
                          {s.status !== "past_due" && (
                            <button className="btn btn-sm btn-secondary" type="submit" formAction={subscriptionAction.bind(null, "past_due")} aria-label={`Mark ${orgName} subscription past due`}>
                              Mark past due
                            </button>
                          )}
                          <button className="btn btn-sm btn-danger" type="submit" formAction={subscriptionAction.bind(null, "cancel")} aria-label={`Cancel ${orgName} subscription`}>
                            Cancel
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="charges">
        <h2 id="charges">Lead charges for {month} (test mode)</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Created</th>
                <th scope="col">Organisation</th>
                <th scope="col">Enquiry</th>
                <th scope="col">Amount (AED, test)</th>
                <th scope="col">Status</th>
                <th scope="col">Reason</th>
                <th scope="col">Change status</th>
              </tr>
            </thead>
            <tbody>
              {charges.length === 0 ? (
                <tr><td colSpan={7} className="muted">No lead charges in {month}.</td></tr>
              ) : (
                charges.map(({ c, orgName, ref, enquiryId }) => (
                  <tr key={c.id}>
                    <td className="small">{fmtDateTime(c.createdAt)}</td>
                    <td><Link href={`/admin/providers/${c.organizationId}`}>{orgName}</Link></td>
                    <td><Link href={`/admin/enquiries/${enquiryId}`}>{ref}</Link></td>
                    <td>{c.amountAed} {c.included ? "(included)" : "(overage)"}</td>
                    <td><StatusBadge value={c.status} /></td>
                    <td className="small">{c.reason ?? "—"}</td>
                    <td>
                      <form action={chargeStatus} className="stack" style={{ minWidth: 200 }}>
                        <input type="hidden" name="chargeId" value={c.id} />
                        <input type="hidden" name="month" value={month} />
                        <div>
                          <label htmlFor={`status-${c.id}`} className="small">New status</label>
                          <select id={`status-${c.id}`} name="status" required defaultValue="">
                            <option value="" disabled>Choose</option>
                            <option value="waived">waived</option>
                            <option value="disputed">disputed</option>
                            <option value="pending">pending</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor={`reason-${c.id}`} className="small">Reason</label>
                          <input id={`reason-${c.id}`} name="reason" type="text" required minLength={3} maxLength={500} />
                        </div>
                        <button className="btn btn-sm btn-secondary" type="submit">Update charge</button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
