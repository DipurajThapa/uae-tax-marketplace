import Link from "next/link";
import type { plans } from "@/db/schema";

/**
 * How Taxdar makes money, stated once and reused on every page that touches it, so the wording never
 * drifts. Keep it in line with /how-ranking-works and the matching code (src/lib/matching.ts).
 */
export const MONEY = {
  businesses: "Free for businesses. You never pay to search, compare or send an enquiry.",
  providers: "Providers pay. A free listing is always available; paid plans include more enquiries each month, and some allow labelled sponsored placements.",
  never: "Money never buys a higher match score, a better position in results or a registration badge. Badges come only from our checks.",
  limit: "Each plan has a monthly enquiry limit. A provider that reaches it is left out of matches until the next month.",
} as const;

export function MoneyRules({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "money money-compact" : "money"} id="money">
      <div className="money-col">
        <p className="kicker">Businesses</p>
        <p>{MONEY.businesses}</p>
      </div>
      <div className="money-col">
        <p className="kicker">Providers</p>
        <p>{MONEY.providers}</p>
      </div>
      <div className="money-col money-never">
        <p className="kicker">Never for sale</p>
        <p>{MONEY.never}</p>
      </div>
      {!compact && (
        <p className="small muted money-note">
          {MONEY.limit} <Link href="/how-ranking-works">How matching and ranking work</Link>.
        </p>
      )}
    </div>
  );
}

type Plan = typeof plans.$inferSelect;
const aed = (n: number) => `AED ${n.toLocaleString("en-US")}`;

/** Pricing cards from the plans table (one source for the public page and the dashboard). Stack on phones. */
export function PlanCards({ rows, currentCode, action }: { rows: Plan[]; currentCode?: string; action?: (p: Plan) => React.ReactNode }) {
  return (
    <ul className="plans" aria-label="Plans">
      {rows.map((p) => {
        const f = p.features as { showContactDetails?: boolean; analytics?: boolean };
        const current = p.code === currentCode;
        return (
          <li key={p.code} className={current ? "plan plan-current" : "plan"} aria-current={current ? "true" : undefined}>
            <p className="plan-name">{p.name}{current && <span className="badge badge-ok">Your plan</span>}</p>
            <p className="plan-price">
              {p.monthlyPriceAed === 0 ? "Free" : aed(p.monthlyPriceAed)}
              {p.monthlyPriceAed > 0 && <span className="small"> / month</span>}
            </p>
            <ul className="plan-features">
              <li><strong>{p.includedLeadsPerMonth}</strong> enquiries included each month</li>
              <li>
                {p.maxLeadsPerMonth > p.includedLeadsPerMonth
                  ? <>Extra enquiries {aed(p.overageLeadPriceAed)} each, up to <strong>{p.maxLeadsPerMonth}</strong> a month</>
                  : <>Monthly limit: <strong>{p.maxLeadsPerMonth}</strong> enquiries</>}
              </li>
              <li>{f.showContactDetails ? "Contact details shown on your profile" : "Contact through enquiries only"}</li>
              <li>{f.analytics ? "Full insights: profile views and match appearances" : "Basic insights"}</li>
              <li>{p.canPromote ? "Sponsored placements available (always labelled)" : "No sponsored placements"}</li>
            </ul>
            {action && <div className="plan-action">{action(p)}</div>}
          </li>
        );
      })}
    </ul>
  );
}
