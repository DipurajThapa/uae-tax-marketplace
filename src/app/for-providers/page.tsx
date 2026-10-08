import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { plans } from "@/db/schema";
import { CREDENTIAL_TYPES } from "@/lib/taxonomy";

export const metadata: Metadata = {
  title: "List your firm",
  description:
    "For tax agencies, accounting firms and e-invoicing providers in the UAE: how listing, registration checks and enquiries work, and introductory plans.",
  alternates: { canonical: "/for-providers" },
};

const fmtAed = (n: number) => `AED ${n.toLocaleString("en-US")}`;

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
          <h1>List your firm where UAE businesses look for tax and e-invoicing help</h1>
          <p className="lead">
            For tax agencies, accounting and advisory firms, and e-invoicing service providers. Create a factual listing, have your registrations checked, and
            receive enquiries from businesses that chose your firm.
          </p>
          <div className="row" style={{ marginTop: 20 }}>
            <Link className="btn" href="/for-providers/register">
              List your firm
            </Link>
            <Link className="btn btn-secondary" href="/providers">
              Already listed? Find your listing and claim it
            </Link>
          </div>
        </div>
      </section>

      <div className="container stack" style={{ marginTop: 32 }}>
        <section aria-labelledby="who-h">
          <h2 id="who-h">Who can list</h2>
          <div className="grid grid-3">
            <div className="card">
              <h3>Tax agencies</h3>
              <p className="small muted" style={{ margin: 0 }}>
                Firms that act for businesses in their dealings with the tax authority. Add your firm-level registration so it can be checked.
              </p>
            </div>
            <div className="card">
              <h3>Accounting and advisory firms</h3>
              <p className="small muted" style={{ margin: 0 }}>
                Bookkeeping, financial statements, VAT and Corporate Tax compliance work, and advisory services.
              </p>
            </div>
            <div className="card">
              <h3>E-invoicing providers</h3>
              <p className="small muted" style={{ margin: 0 }}>
                Readiness projects, ERP integration and accredited e-invoicing services. Accreditation is shown only once checked.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="verify-h">
          <h2 id="verify-h">How verification works</h2>
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
          <p className="small">
            <Link href="/how-we-verify">Read more about how we verify</Link>
          </p>
        </section>

        <section aria-labelledby="enq-h">
          <h2 id="enq-h">How enquiries arrive</h2>
          <ul>
            <li>A business answers a short set of questions about its needs and sees a list of firms whose services match.</li>
            <li>
              It chooses which firms to contact. Your firm receives an enquiry <strong>only if the business chose you</strong>, and it agrees to share its
              details with the firms it chose.
            </li>
            <li>
              Enquiries reach you <strong>only once you have claimed your listing</strong>, it is published, and you are accepting enquiries.
            </li>
            <li>You see the contact details and answers in your dashboard, then accept or decline.</li>
            <li>If the business withdraws its enquiry, its details are erased and we ask you to delete your copy.</li>
          </ul>
          <p className="small">
            <Link href="/how-ranking-works">How matching and ranking work</Link>. Paid placements are labelled and never change match scores.
          </p>
        </section>

        <section aria-labelledby="plans-h">
          <h2 id="plans-h">Plans</h2>
          <p>
            <span className="badge badge-warn">Introductory pricing; billing is not live yet</span>
          </p>
          {planRows.length === 0 ? (
            <p className="muted">Plan details are not available right now.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <caption className="skip">Plans, introductory pricing; billing is not live yet</caption>
                <thead>
                  <tr>
                    <th scope="col">Plan</th>
                    <th scope="col">Price (AED per month)</th>
                    <th scope="col">Leads included</th>
                    <th scope="col">Price per extra lead</th>
                    <th scope="col">Monthly lead limit</th>
                    <th scope="col">Promotions allowed</th>
                  </tr>
                </thead>
                <tbody>
                  {planRows.map((p) => (
                    <tr key={p.code}>
                      <th scope="row">{p.name}</th>
                      <td>{p.monthlyPriceAed === 0 ? "Free" : fmtAed(p.monthlyPriceAed)}</td>
                      <td>{p.includedLeadsPerMonth}</td>
                      <td>{p.maxLeadsPerMonth > p.includedLeadsPerMonth ? fmtAed(p.overageLeadPriceAed) : "Not available"}</td>
                      <td>{p.maxLeadsPerMonth}</td>
                      <td>{p.canPromote ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="small muted" style={{ marginTop: 8 }}>
            A lead is an enquiry from a business that chose your firm. Lead numbers are limits per calendar month, not a forecast: how many enquiries you
            receive depends on which businesses choose you. Promotions are labelled as sponsored and shown separately from matched results.
          </p>
        </section>

        <section className="card center" aria-labelledby="cta-h">
          <h2 id="cta-h">Get started</h2>
          <p className="muted">New listings are reviewed before they appear in the directory.</p>
          <div className="row" style={{ justifyContent: "center" }}>
            <Link className="btn" href="/for-providers/register">
              List your firm
            </Link>
            <Link className="btn btn-secondary" href="/providers">
              Already listed? Find your listing and claim it
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
