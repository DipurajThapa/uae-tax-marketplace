import { WEIGHTS, MAX_RECIPIENTS } from "@/lib/matching";
import { PageHeader } from "@/components/page";
import { MoneyRules } from "@/components/money";

export const metadata = { title: "How matching and ranking work", alternates: { canonical: "/how-ranking-works" } };

export default function HowRanking() {
  return (
    <div className="container narrow">
      <PageHeader kicker="Explained" title="How matching and ranking work" lead="Who can be matched, where each score comes from, and what money can and cannot change." />
      <h2>Who can be matched</h2>
      <p>A provider appears in your matches only if it:</p>
      <ul>
        <li>offers at least one of the services you chose;</li>
        <li>holds a verified registration wherever a service requires one (for example, tax agent representation before the FTA, or acting as an accredited e-invoicing service provider);</li>
        <li>has claimed its listing and is taking new enquiries this month.</li>
      </ul>
      <h2>How the score is made</h2>
      <p>Each match gets a score out of 100 from your answers only:</p>
      <ul>
        <li>Services covered: up to {WEIGHTS.services} points</li>
        <li>Verified registrations: up to {WEIGHTS.verification} points</li>
        <li>Location (your emirate or zone): up to {WEIGHTS.location} points</li>
        <li>Language: up to {WEIGHTS.language} points</li>
        <li>Industry experience stated by the provider: up to {WEIGHTS.industry} points</li>
        <li>Firm size compared with your business: up to {WEIGHTS.size} points</li>
      </ul>
      <p>Every match shows the reasons behind its score. Ties are ordered alphabetically.</p>
      <h2>Paid placements</h2>
      <p>Providers on some paid plans can buy sponsored placements. These are always labelled “Sponsored”, shown apart from the results, and never change any match score or search order.</p>
      <h2>Plans and monthly limits</h2>
      <p>Each provider can receive a limited number of enquiries per month, and the limit depends on its plan: free listings have a lower limit than paid plans. A provider that has reached its limit is left out of matches until the next month. Apart from that limit, a plan never affects who matches or how they are scored.</p>
      <h2>How Taxdar makes money</h2>
      <MoneyRules />
      <h2 className="mt-4">Your choice</h2>
      <p>You choose up to {MAX_RECIPIENTS} providers. Your details go only to them, and only after you agree.</p>
    </div>
  );
}
