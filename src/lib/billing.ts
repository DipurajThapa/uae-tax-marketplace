import { and, eq, inArray, sql, desc } from "drizzle-orm";
import type { DB } from "@/db/client";
import { plans, subscriptions, leadCharges, enquiryRecipients, organizations } from "@/db/schema";
import { audit, SYSTEM as SYSTEM_ACTOR, type Actor } from "./audit";

/**
 * Commercial model. Prices are owner-adjustable ASSUMPTIONS (DECISIONS.md D-007),
 * not market evidence. Only the internal "test" billing provider exists: no money moves.
 */
export type PlanDef = {
  code: string;
  name: string;
  monthlyPriceAed: number;
  includedLeadsPerMonth: number;
  overageLeadPriceAed: number;
  maxLeadsPerMonth: number;
  canPromote: boolean;
  features: { maxDescriptionChars: number; showContactDetails: boolean; analytics: boolean };
};

export const DEFAULT_PLANS: PlanDef[] = [
  { code: "free", name: "Free listing", monthlyPriceAed: 0, includedLeadsPerMonth: 3, overageLeadPriceAed: 0, maxLeadsPerMonth: 3, canPromote: false, features: { maxDescriptionChars: 600, showContactDetails: false, analytics: false } },
  { code: "professional", name: "Professional", monthlyPriceAed: 499, includedLeadsPerMonth: 10, overageLeadPriceAed: 150, maxLeadsPerMonth: 30, canPromote: false, features: { maxDescriptionChars: 2000, showContactDetails: true, analytics: true } },
  { code: "premium", name: "Premium", monthlyPriceAed: 1499, includedLeadsPerMonth: 40, overageLeadPriceAed: 120, maxLeadsPerMonth: 100, canPromote: true, features: { maxDescriptionChars: 4000, showContactDetails: true, analytics: true } },
];

export const periodMonth = (d: Date) => d.toISOString().slice(0, 7);

const ACTIVE = ["active", "trialing"] as const;

/** The plan in force for an organisation at `now`. past_due or canceled subscriptions fall back to free. */
export async function effectivePlan(db: DB, organizationId: string, now: Date): Promise<PlanDef> {
  const rows = await db
    .select({ plan: plans, sub: subscriptions })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.code, subscriptions.planCode))
    .where(and(eq(subscriptions.organizationId, organizationId), inArray(subscriptions.status, [...ACTIVE])))
    .orderBy(desc(subscriptions.createdAt));
  const current = rows.find((r) => r.sub.currentPeriodStart <= now && r.sub.currentPeriodEnd > now);
  if (current) return toDef(current.plan);
  const [free] = await db.select().from(plans).where(eq(plans.code, "free"));
  return free ? toDef(free) : DEFAULT_PLANS[0]!;
}

function toDef(p: typeof plans.$inferSelect): PlanDef {
  return { ...p, features: p.features as PlanDef["features"] };
}

export async function leadsThisPeriod(db: DB, organizationIds: string[], now: Date): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (organizationIds.length === 0) return out;
  const rows = await db
    .select({ org: leadCharges.organizationId, n: sql<number>`count(*)::int` })
    .from(leadCharges)
    .where(and(inArray(leadCharges.organizationId, organizationIds), eq(leadCharges.periodMonth, periodMonth(now)), sql`${leadCharges.status} <> 'waived'`))
    .groupBy(leadCharges.organizationId);
  for (const r of rows) out.set(r.org, r.n);
  return out;
}

export async function capacityRemaining(db: DB, organizationIds: string[], now: Date): Promise<Map<string, number>> {
  const used = await leadsThisPeriod(db, organizationIds, now);
  const out = new Map<string, number>();
  for (const id of organizationIds) {
    const plan = await effectivePlan(db, id, now);
    out.set(id, Math.max(0, plan.maxLeadsPerMonth - (used.get(id) ?? 0)));
  }
  return out;
}

type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

export class CapacityExceededError extends Error {
  constructor(public organizationId: string) {
    super("Provider reached its monthly enquiry limit");
  }
}

/**
 * Serialises lead accounting per provider. Call at the START of the transaction, before inserting rows
 * that reference organisations, and lock in sorted order so multi-provider enquiries cannot deadlock.
 * NO KEY UPDATE does not conflict with the KEY SHARE locks taken by foreign-key inserts.
 */
export async function lockOrganizationsForCharging(tx: Tx, organizationIds: string[]): Promise<void> {
  for (const id of [...organizationIds].sort())
    await tx.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, id)).for("no key update");
}

/**
 * Records the lead charge for a routed enquiry. Within allowance → included at 0; beyond → overage price.
 * The caller must hold lockOrganizationsForCharging for this organisation.
 */
export async function recordLeadCharge(tx: Tx, recipientId: string, organizationId: string, now: Date): Promise<void> {
  const plan = await effectivePlan(tx as unknown as DB, organizationId, now);
  const [row] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(leadCharges)
    .where(and(eq(leadCharges.organizationId, organizationId), eq(leadCharges.periodMonth, periodMonth(now)), sql`${leadCharges.status} <> 'waived'`));
  const used = row?.n ?? 0;
  if (used >= plan.maxLeadsPerMonth) throw new CapacityExceededError(organizationId);
  const included = used < plan.includedLeadsPerMonth;
  await tx.insert(leadCharges).values({
    enquiryRecipientId: recipientId,
    organizationId,
    amountAed: included ? "0" : String(plan.overageLeadPriceAed),
    included,
    periodMonth: periodMonth(now),
  });
}

/** Provider disputes a lead (e.g. fake contact). Admin decides; waived charges free up capacity. */
export async function setChargeStatus(db: DB, actor: Actor, chargeId: string, status: "waived" | "disputed" | "pending" | "invoiced", reason: string) {
  await db.transaction(async (tx) => {
    const [charge] = await tx.select().from(leadCharges).where(eq(leadCharges.id, chargeId)).for("update");
    if (!charge) throw new Error("Charge not found");
    if (charge.status === "waived" && status !== "waived") {
      // Re-activating a waived charge must not push the provider over its plan cap (review M11).
      await lockOrganizationsForCharging(tx, [charge.organizationId]);
      const plan = await effectivePlan(tx as unknown as DB, charge.organizationId, new Date());
      const [row] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(leadCharges)
        .where(and(eq(leadCharges.organizationId, charge.organizationId), eq(leadCharges.periodMonth, charge.periodMonth), sql`${leadCharges.status} <> 'waived'`));
      if ((row?.n ?? 0) >= plan.maxLeadsPerMonth) throw new Error("Re-activating this charge would exceed the provider's monthly limit");
    }
    await tx.update(leadCharges).set({ status, reason }).where(eq(leadCharges.id, chargeId));
    await audit(tx, actor, `lead_charge.${status}`, "lead_charge", chargeId, { reason });
  });
}

// ---------- Test-mode billing provider ----------

export interface BillingProvider {
  readonly name: string;
  subscribe(db: DB, actor: Actor, organizationId: string, planCode: string, now: Date): Promise<string>;
  /** organizationId, when given, scopes the change so a provider can only touch its own subscription. */
  cancel(db: DB, actor: Actor, subscriptionId: string, now: Date, organizationId?: string): Promise<void>;
  markPastDue(db: DB, actor: Actor, subscriptionId: string): Promise<void>;
}

const addMonths = (d: Date, n: number) => {
  const x = new Date(d);
  x.setUTCMonth(x.getUTCMonth() + n);
  return x;
};

/** Records subscriptions in the database without charging anyone. Clearly labelled as test mode. */
export const testBillingProvider: BillingProvider = {
  name: "test",
  async subscribe(db, actor, organizationId, planCode, now) {
    const [plan] = await db.select().from(plans).where(eq(plans.code, planCode));
    if (!plan || !plan.active) throw new Error("Unknown or inactive plan");
    return db.transaction(async (tx) => {
      await tx
        .update(subscriptions)
        .set({ status: "canceled", canceledAt: now })
        .where(and(eq(subscriptions.organizationId, organizationId), inArray(subscriptions.status, [...ACTIVE, "past_due"])));
      const [sub] = await tx
        .insert(subscriptions)
        .values({ organizationId, planCode, status: "active", billingProvider: "test", externalRef: `test_${now.getTime()}`, currentPeriodStart: now, currentPeriodEnd: addMonths(now, 1) })
        .returning({ id: subscriptions.id });
      await audit(tx, actor, "subscription.created", "organization", organizationId, { planCode, provider: "test" });
      return sub!.id;
    });
  },
  async cancel(db, actor, subscriptionId, now, organizationId) {
    await db.transaction(async (tx) => {
      const scope = organizationId ? and(eq(subscriptions.id, subscriptionId), eq(subscriptions.organizationId, organizationId)) : eq(subscriptions.id, subscriptionId);
      const updated = await tx.update(subscriptions).set({ status: "canceled", canceledAt: now }).where(scope).returning({ id: subscriptions.id });
      if (updated.length === 0) throw new Error("Subscription not found");
      await audit(tx, actor, "subscription.canceled", "subscription", subscriptionId);
    });
  },
  async markPastDue(db, actor, subscriptionId) {
    await db.transaction(async (tx) => {
      await tx.update(subscriptions).set({ status: "past_due" }).where(eq(subscriptions.id, subscriptionId));
      await audit(tx, actor, "subscription.past_due", "subscription", subscriptionId);
    });
  },
};

export const billing = (): BillingProvider => testBillingProvider;

/**
 * Test-mode renewal (review L2): an active test subscription whose period has ended rolls over to the
 * next period instead of silently falling back to the free plan. Canceled and past_due ones do not renew.
 * A live provider would drive this from its own webhooks instead.
 */
export async function renewTestSubscriptions(db: DB, now: Date): Promise<number> {
  const due = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.billingProvider, "test"), inArray(subscriptions.status, [...ACTIVE]), sql`${subscriptions.currentPeriodEnd} <= ${now}`));
  for (const sub of due) {
    let start = sub.currentPeriodEnd;
    let end = addMonths(start, 1);
    while (end <= now) {
      start = end;
      end = addMonths(start, 1);
    }
    await db.transaction(async (tx) => {
      await tx.update(subscriptions).set({ currentPeriodStart: start, currentPeriodEnd: end }).where(eq(subscriptions.id, sub.id));
      await audit(tx, SYSTEM_ACTOR, "subscription.renewed", "subscription", sub.id, { periodEnd: end.toISOString(), provider: "test" });
    });
  }
  return due.length;
}

/** Monthly revenue view for admin reporting (test-mode figures, never presented as real revenue). */
export async function revenueSummary(db: DB, month: string) {
  const subs = await db
    .select({ plan: subscriptions.planCode, n: sql<number>`count(*)::int`, mrr: sql<number>`coalesce(sum(${plans.monthlyPriceAed}),0)::int` })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.code, subscriptions.planCode))
    .where(
      and(
        inArray(subscriptions.status, [...ACTIVE]),
        sql`${subscriptions.currentPeriodStart} < (to_date(${month}, 'YYYY-MM') + interval '1 month')`,
        sql`${subscriptions.currentPeriodEnd} > to_date(${month}, 'YYYY-MM')`,
      ),
    )
    .groupBy(subscriptions.planCode);
  const [leads] = await db
    .select({
      total: sql<number>`count(*)::int`,
      included: sql<number>`count(*) filter (where ${leadCharges.included})::int`,
      overageAed: sql<number>`coalesce(sum(${leadCharges.amountAed}) filter (where ${leadCharges.status} <> 'waived'),0)::float`,
      waived: sql<number>`count(*) filter (where ${leadCharges.status} = 'waived')::int`,
    })
    .from(leadCharges)
    .where(eq(leadCharges.periodMonth, month));
  const [accepted] = await db
    .select({ n: sql<number>`count(*) filter (where ${enquiryRecipients.status} = 'accepted')::int`, all: sql<number>`count(*)::int` })
    .from(enquiryRecipients)
    .where(sql`to_char(${enquiryRecipients.createdAt}, 'YYYY-MM') = ${month}`);
  return { subscriptions: subs, leads: leads!, acceptance: accepted! };
}
