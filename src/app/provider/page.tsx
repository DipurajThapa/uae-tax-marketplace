import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { enquiries, enquiryRecipients } from "@/db/schema";
import { requireProvider } from "@/lib/session";
import { getProviderById } from "@/lib/providers";
import { effectivePlan, leadsThisPeriod } from "@/lib/billing";
import { CREDENTIAL_BY_CODE, EMIRATE_BY_CODE, SERVICE_BY_CODE } from "@/lib/taxonomy";
import { CredentialLine, Empty } from "@/components/ui";
import { CLAIM_STATE, Flash, LISTING_STATUS, RecipientStatus, fmtAed, fmtDate } from "./_ui";

export const metadata = { title: "Overview", robots: { index: false } };

export default async function ProviderOverview({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const user = await requireProvider();
  const { notice, error } = await searchParams;
  const db = getDb();
  const now = new Date();
  const detail = await getProviderById(db, user.organizationId);
  if (!detail) notFound();
  const { org } = detail;

  const [plan, used, recent] = await Promise.all([
    effectivePlan(db, org.id, now),
    leadsThisPeriod(db, [org.id], now),
    db
      .select({ rec: enquiryRecipients, ref: enquiries.publicRef, services: enquiries.serviceCodes, emirate: enquiries.emirate, enqStatus: enquiries.status })
      .from(enquiryRecipients)
      .innerJoin(enquiries, eq(enquiries.id, enquiryRecipients.enquiryId))
      .where(and(eq(enquiryRecipients.organizationId, user.organizationId)))
      .orderBy(desc(enquiryRecipients.createdAt))
      .limit(5),
  ]);
  const leadsUsed = used.get(org.id) ?? 0;
  const listing = LISTING_STATUS[org.listingStatus] ?? { label: org.listingStatus, cls: "badge-neutral", meaning: "" };
  const claim = CLAIM_STATE[org.claimState] ?? { label: org.claimState, meaning: "" };

  // Why enquiries may not arrive right now (mirrors the eligibility checks in lib/matching).
  const blockers: string[] = [];
  if (org.listingStatus !== "published") blockers.push("Your listing is not published.");
  if (org.claimState !== "claimed") blockers.push("Your listing is not claimed yet.");
  if (!org.acceptingEnquiries) blockers.push("You have switched off new enquiries in your profile.");
  if (leadsUsed >= plan.maxLeadsPerMonth) blockers.push("You have reached your plan's monthly lead limit.");
  const verifiedTypes = new Set(detail.credentials.filter((c) => c.status === "verified").map((c) => c.credentialType));
  for (const p of detail.people) for (const c of p.credentials) if (c.status === "verified") verifiedTypes.add(c.credentialType);
  const gatedServices = detail.services.filter((s) => {
    const req = SERVICE_BY_CODE[s]?.requiredCredentialTypes ?? [];
    return req.length > 0 && !req.some((t) => verifiedTypes.has(t));
  });

  return (
    <div className="stack">
      <h1>Overview</h1>
      <Flash notice={notice} error={error} />

      <div className="grid grid-2">
        <section className="card" aria-labelledby="listing-h">
          <h2 id="listing-h">Listing</h2>
          <dl className="dl">
            <dt>Status</dt>
            <dd>
              <span className={`badge ${listing.cls}`}>{listing.label}</span>
            </dd>
            <dt>Claim</dt>
            <dd>{claim.label}</dd>
            <dt>Accepting enquiries</dt>
            <dd>{org.acceptingEnquiries ? "Yes" : "No"}</dd>
          </dl>
          <p className="small" style={{ marginTop: 12 }}>
            {listing.meaning} {claim.meaning}
          </p>
          {org.listingStatus === "published" && (
            <p className="small">
              <Link href={`/providers/${org.slug}`}>View your public listing</Link>
            </p>
          )}
          {blockers.length > 0 ? (
            <div className="alert alert-warn small" role="note">
              <strong>New enquiries cannot reach you right now:</strong>
              <ul style={{ margin: "6px 0 0", paddingLeft: 20 }}>
                {blockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="small muted">Businesses can choose you when your services match their needs.</p>
          )}
        </section>

        <section className="card" aria-labelledby="plan-h">
          <h2 id="plan-h">Plan this month</h2>
          <div className="kpis" style={{ marginBottom: 12 }}>
            <div className="kpi">
              <div className="v">{plan.name}</div>
              <div className="l">Plan in force</div>
            </div>
            <div className="kpi">
              <div className="v">
                {leadsUsed} / {plan.includedLeadsPerMonth}
              </div>
              <div className="l">Leads used / included</div>
            </div>
          </div>
          <p className="small muted">
            Monthly limit: {plan.maxLeadsPerMonth} leads.
            {plan.overageLeadPriceAed > 0 ? ` Leads beyond the included number are charged at ${fmtAed(plan.overageLeadPriceAed)} each.` : ""} Billing is in test mode: no payment is taken.
          </p>
          <Link href="/provider/billing" className="btn btn-secondary btn-sm">
            Plan &amp; billing
          </Link>
        </section>
      </div>

      <section className="card" aria-labelledby="creds-h">
        <div className="row between">
          <h2 id="creds-h" style={{ margin: 0 }}>
            Registrations
          </h2>
          <Link href="/provider/credentials" className="btn btn-secondary btn-sm">
            Manage registrations
          </Link>
        </div>
        <p className="small muted">A badge shows on your public listing only once a registration is verified against an official source.</p>
        {detail.credentials.length === 0 ? (
          <p className="small">No registrations submitted yet.</p>
        ) : (
          <div className="stack" style={{ gap: 6 }}>
            {detail.credentials.map((c) => (
              <CredentialLine key={c.id} type={c.credentialType} status={c.status} registrationNumber={c.registrationNumber} verifiedAt={c.verifiedAt} />
            ))}
          </div>
        )}
        {gatedServices.length > 0 && (
          <div className="alert alert-info small" role="note" style={{ marginTop: 12 }}>
            You will not be matched for{" "}
            {gatedServices.map((s) => SERVICE_BY_CODE[s]?.name ?? s).join(", ")} until one of these registrations is verified:{" "}
            {[...new Set(gatedServices.flatMap((s) => SERVICE_BY_CODE[s]?.requiredCredentialTypes ?? []))]
              .map((t) => CREDENTIAL_BY_CODE[t]?.name ?? t)
              .join(" or ")}
            .
          </div>
        )}
      </section>

      <section aria-labelledby="recent-h">
        <div className="row between" style={{ marginBottom: 8 }}>
          <h2 id="recent-h" style={{ margin: 0 }}>
            Recent enquiries
          </h2>
          <Link href="/provider/enquiries">All enquiries</Link>
        </div>
        {recent.length === 0 ? (
          <Empty title="No enquiries yet">
            <p className="small muted">Enquiries arrive only from businesses that chose your firm, and only while your listing is published and claimed.</p>
          </Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Reference</th>
                  <th scope="col">Received</th>
                  <th scope="col">Services</th>
                  <th scope="col">Emirate</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.rec.id}>
                    <td>
                      <Link href={`/provider/enquiries/${r.rec.id}`}>{r.ref}</Link>
                    </td>
                    <td>{fmtDate(r.rec.createdAt)}</td>
                    <td>{r.services.map((s) => SERVICE_BY_CODE[s]?.name ?? s).join(", ")}</td>
                    <td>{EMIRATE_BY_CODE[r.emirate]?.name ?? r.emirate}</td>
                    <td>
                      <RecipientStatus status={r.rec.status} erased={r.enqStatus === "erased"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
