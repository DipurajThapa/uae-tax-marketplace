import Link from "next/link";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { enquiries, enquiryRecipients, leadCharges, plans, subscriptions } from "@/db/schema";
import { requireProvider } from "@/lib/session";
import { billing, effectivePlan, leadsThisPeriod, periodMonth } from "@/lib/billing";
import { userActor } from "@/lib/audit";
import { Flash, back, chargeLabel, fmtAed, fmtDate } from "../_ui";

export const metadata = { title: "Plan & billing", robots: { index: false } };

const PATH = "/provider/billing";
const planCodeSchema = z.string().trim().min(1).max(40).regex(/^[a-z0-9_-]+$/);

async function switchPlan(formData: FormData) {
  "use server";
  const user = await requireProvider();
  const parsed = planCodeSchema.safeParse(formData.get("plan"));
  if (!parsed.success) back(PATH, "error", "Choose a plan.");
  const db = getDb();
  let name = parsed.data;
  try {
    const [plan] = await db.select().from(plans).where(and(eq(plans.code, parsed.data), eq(plans.active, true)));
    if (!plan) throw new Error("inactive");
    name = plan.name;
    await billing().subscribe(db, userActor(user.id), user.organizationId, plan.code, new Date());
  } catch {
    back(PATH, "error", "That plan is not available. No change was made.");
  }
  back(PATH, "notice", `You are now on the ${name} plan (test mode: no payment was taken).`);
}

async function cancelPlan() {
  "use server";
  const user = await requireProvider();
  const db = getDb();
  let found = false;
  try {
    // Only this organisation's own subscriptions can be cancelled.
    const subs = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(and(eq(subscriptions.organizationId, user.organizationId), inArray(subscriptions.status, ["active", "trialing", "past_due"])));
    for (const s of subs) await billing().cancel(db, userActor(user.id), s.id, new Date());
    found = subs.length > 0;
  } catch {
    back(PATH, "error", "The subscription could not be cancelled. Please try again.");
  }
  if (!found) back(PATH, "error", "There is no paid subscription to cancel.");
  back(PATH, "notice", "Subscription cancelled. Your firm is back on the free plan.");
}

export default async function ProviderBilling({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const user = await requireProvider();
  const { notice, error } = await searchParams;
  const db = getDb();
  const now = new Date();
  const month = periodMonth(now);

  const [current, allPlans, [sub], used, charges] = await Promise.all([
    effectivePlan(db, user.organizationId, now),
    db.select().from(plans).where(eq(plans.active, true)).orderBy(asc(plans.monthlyPriceAed)),
    db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.organizationId, user.organizationId), inArray(subscriptions.status, ["active", "trialing", "past_due"])))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1),
    leadsThisPeriod(db, [user.organizationId], now),
    db
      .select({ charge: leadCharges, ref: enquiries.publicRef, recipientId: enquiryRecipients.id })
      .from(leadCharges)
      .innerJoin(enquiryRecipients, eq(enquiryRecipients.id, leadCharges.enquiryRecipientId))
      .innerJoin(enquiries, eq(enquiries.id, enquiryRecipients.enquiryId))
      .where(and(eq(leadCharges.organizationId, user.organizationId), eq(leadCharges.periodMonth, month)))
      .orderBy(desc(leadCharges.createdAt)),
  ]);
  const leadsUsed = used.get(user.organizationId) ?? 0;
  const overageTotal = charges.filter((c) => !c.charge.included && c.charge.status !== "waived").reduce((n, c) => n + Number(c.charge.amountAed), 0);

  return (
    <div className="stack">
      <h1>Plan &amp; billing</h1>
      <div className="alert alert-warn" role="note" style={{ fontSize: "1.05rem" }}>
        <strong>TEST MODE: no payment is taken.</strong> Introductory pricing; billing is not live yet. Plan changes are recorded so we can test the
        service, but no card is charged and no invoice is issued.
      </div>
      <Flash notice={notice} error={error} />

      <section className="card" aria-labelledby="current-h">
        <h2 id="current-h">Plan in force</h2>
        <dl className="dl">
          <dt>Plan</dt>
          <dd>{current.name}</dd>
          <dt>Price</dt>
          <dd>{current.monthlyPriceAed === 0 ? "Free" : `${fmtAed(current.monthlyPriceAed)} per month`}</dd>
          <dt>Leads this month</dt>
          <dd>
            {leadsUsed} used · {current.includedLeadsPerMonth} included · limit {current.maxLeadsPerMonth}
          </dd>
          {sub && (
            <>
              <dt>Subscription</dt>
              <dd>
                {sub.status === "past_due" ? "Payment overdue (free plan applies until resolved)" : sub.status === "trialing" ? "Trial" : "Active"} · period{" "}
                {fmtDate(sub.currentPeriodStart)} to {fmtDate(sub.currentPeriodEnd)}
              </dd>
            </>
          )}
        </dl>
        {sub && (
          <form action={cancelPlan} style={{ marginTop: 16 }}>
            <button className="btn btn-danger btn-sm" type="submit">
              Cancel subscription
            </button>
            <span className="small muted" style={{ marginLeft: 12 }}>
              Your firm moves to the free plan straight away.
            </span>
          </form>
        )}
      </section>

      <section aria-labelledby="plans-h">
        <h2 id="plans-h">Plans</h2>
        <p className="small muted">Introductory pricing; billing is not live yet. Lead allowances are limits, not a forecast of how many enquiries you will receive.</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Plan</th>
                <th scope="col">Price per month</th>
                <th scope="col">Leads included</th>
                <th scope="col">Price per extra lead</th>
                <th scope="col">Monthly lead limit</th>
                <th scope="col">Promotions</th>
                <th scope="col">
                  <span className="skip">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {allPlans.map((p) => {
                const isCurrent = p.code === current.code;
                return (
                  <tr key={p.code} aria-current={isCurrent ? "true" : undefined}>
                    <th scope="row">
                      {p.name} {isCurrent && <span className="badge badge-ok">Current</span>}
                    </th>
                    <td>{p.monthlyPriceAed === 0 ? "Free" : fmtAed(p.monthlyPriceAed)}</td>
                    <td>{p.includedLeadsPerMonth}</td>
                    <td>{p.maxLeadsPerMonth > p.includedLeadsPerMonth ? fmtAed(p.overageLeadPriceAed) : "Not available"}</td>
                    <td>{p.maxLeadsPerMonth}</td>
                    <td>{p.canPromote ? "Yes" : "No"}</td>
                    <td>
                      {!isCurrent && (
                        <form action={switchPlan}>
                          <input type="hidden" name="plan" value={p.code} />
                          <button className="btn btn-secondary btn-sm" type="submit" aria-label={`Switch to ${p.name} (test mode, no payment)`}>
                            Switch (test mode)
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="charges-h">
        <h2 id="charges-h">Lead charges for {month}</h2>
        {charges.length === 0 ? (
          <p className="small">No leads this month.</p>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Enquiry</th>
                    <th scope="col">Charge</th>
                    <th scope="col">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {charges.map((c) => (
                    <tr key={c.charge.id}>
                      <td>{fmtDate(c.charge.createdAt)}</td>
                      <td>
                        <Link href={`/provider/enquiries/${c.recipientId}`}>{c.ref}</Link>
                      </td>
                      <td>{chargeLabel(c.charge)}</td>
                      <td className="small">{c.charge.reason ?? "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="small">
              Overage total this month: <strong>{fmtAed(overageTotal)}</strong> (test mode: not collected).
            </p>
          </>
        )}
      </section>
    </div>
  );
}
