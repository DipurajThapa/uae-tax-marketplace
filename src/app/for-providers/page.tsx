import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { plans } from "@/db/schema";
import { CREDENTIAL_TYPES } from "@/lib/taxonomy";
import { PageHeader, Section } from "@/components/page";
import { MoneyRules, PlanCards } from "@/components/money";

export const metadata: Metadata = {
  title: "List your firm",
  description:
    "For tax agencies, accounting firms and e-invoicing providers in the UAE: how listing, registration checks and enquiries work, what Taxdar charges, and the plans.",
  alternates: { canonical: "/for-providers" },
};

export default async function ForProviders() {
  let planRows: (typeof plans.$inferSelect)[] = [];
  try {
    planRows = await getDb().select().from(plans).where(eq(plans.active, true)).orderBy(asc(plans.monthlyPriceAed));
  } catch {
    planRows = [];
  }
  const firmChecks = CREDENTIAL_TYPES.filter((t) => t.subject === "organization");

  return (
    <>
      <section className="hero">
        <div className="container">
          <PageHeader
            kicker="For tax agents, agencies and e-invoicing providers"
            title="Get found for the work you are registered to do"
            lead="Create a factual listing, have your registrations checked, and receive enquiries from UAE businesses that chose your firm. A basic listing is free."
          >
            <Link className="btn btn-accent" href="/for-providers/register">List your firm free</Link>
            <Link className="btn btn-secondary" href="/providers">Already listed? Claim your listing</Link>
          </PageHeader>
        </div>
      </section>

      <div className="container mt-4">
        <Section id="money-h" kicker="The business model" title="How Taxdar makes money">
          <MoneyRules />
        </Section>

        <Section id="plans-h" kicker="Pricing" title="Plans">
          <p><span className="badge badge-warn">Introductory pricing; billing is not live yet</span></p>
          {planRows.length === 0 ? (
            <p className="muted">Plan details are not available right now.</p>
          ) : (
            <PlanCards
              rows={planRows}
              action={(p) => (
                <Link className={p.monthlyPriceAed === 0 ? "btn btn-accent" : "btn btn-secondary"} href="/for-providers/register">
                  {p.monthlyPriceAed === 0 ? "Start free" : `Start free, then choose ${p.name}`}
                </Link>
              )}
            />
          )}
          <p className="small muted mt-2">
            An enquiry is a message from a business that chose your firm. Enquiry numbers are monthly limits, not a forecast: how many you receive depends on
            which businesses choose you. Every listing starts on the free plan; you can change plan from your dashboard.
          </p>
        </Section>

        <Section id="who-h" kicker="Eligibility" title="Who can list">
          <div className="grid grid-3">
            <div className="card">
              <h3>Tax agencies</h3>
              <p className="small muted mb-0">Firms that act for businesses in their dealings with the tax authority. Add your firm-level registration so it can be checked.</p>
            </div>
            <div className="card">
              <h3>Accounting and advisory firms</h3>
              <p className="small muted mb-0">Bookkeeping, financial statements, VAT and Corporate Tax compliance work, and advisory services.</p>
            </div>
            <div className="card">
              <h3>E-invoicing providers</h3>
              <p className="small muted mb-0">Readiness projects, ERP integration and accredited e-invoicing services. Accreditation is shown only once checked.</p>
            </div>
          </div>
        </Section>

        <Section id="verify-h" kicker="Trust" title="How verification works">
          <ol>
            <li>You submit your firm&apos;s registration numbers when you list, or later from your dashboard.</li>
            <li>
              A member of our team checks each one by hand against an official source, such as a public register or an official document, and records where
              and when it was checked.
            </li>
            <li>Only then does a registration badge appear on your listing. Until it is checked, your listing says the registration is not verified.</li>
            <li>Badges are re-checked on a schedule. A badge is removed when a re-check is due, a registration expires, or someone disputes it and the review is open.</li>
          </ol>
          {firmChecks.length > 0 && (
            <p className="small muted">
              Firm-level registrations we can check: {firmChecks.map((t) => `${t.name} (${t.issuer})`).join("; ")}. Listing here is not an approval or
              endorsement of your firm, or of this directory, by any government body.
            </p>
          )}
          <p className="small"><Link href="/how-we-verify">Read more about how we verify</Link></p>
        </Section>

        <Section id="enq-h" kicker="Leads" title="How enquiries arrive">
          <ul>
            <li>A business answers a short set of questions about its needs and sees a list of firms whose services match.</li>
            <li>
              It chooses which firms to contact. Your firm receives an enquiry <strong>only if the business chose you</strong>, and it agrees to share its
              details with the firms it chose.
            </li>
            <li>Enquiries reach you <strong>only once you have claimed your listing</strong>, it is published, and you are accepting enquiries.</li>
            <li>You see the contact details and answers in your dashboard, then accept or decline.</li>
            <li>If the business withdraws its enquiry, its details are erased and we ask you to delete your copy.</li>
          </ul>
          <p className="small"><Link href="/how-ranking-works">How matching and ranking work</Link>.</p>
        </Section>

        <section className="card center mt-4" aria-labelledby="cta-h">
          <h2 id="cta-h">Get started</h2>
          <p className="muted">New listings are reviewed before they appear in the directory.</p>
          <div className="page-actions" style={{ justifyContent: "center" }}>
            <Link className="btn btn-accent" href="/for-providers/register">List your firm free</Link>
            <Link className="btn btn-secondary" href="/providers">Already listed? Claim your listing</Link>
          </div>
        </section>
      </div>
    </>
  );
}
