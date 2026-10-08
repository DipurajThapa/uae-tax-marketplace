import Link from "next/link";
import { desc, eq, ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import { claims, organizations } from "@/db/schema";
import { approveClaim, rejectClaim } from "@/lib/claims";
import { userActor } from "@/lib/audit";
import { domainOf } from "@/lib/text";
import { requireStaff, attempt, done, fail, text, uuidField, fmtDateTime, FlashMessages, StatusBadge, type Flash } from "../_shared";

export const metadata = { title: "Admin: claims" };

const BACK = "/admin/claims";

async function decide(outcome: "approve" | "reject", formData: FormData) {
  "use server";
  const user = await requireStaff();
  const claimId = uuidField(formData, "claimId");
  if (!claimId) fail(BACK, "Unknown claim");
  const note = text(formData, "note", 1000);
  if (note.length < 3) fail(BACK, "A review note is required");
  const db = getDb();
  const actor = userActor(user.id);
  const r =
    outcome === "approve"
      ? await attempt(() => approveClaim(db, actor, claimId, note))
      : outcome === "reject"
        ? await attempt(() => rejectClaim(db, actor, claimId, note))
        : ({ ok: false, error: "Unknown decision" } as const);
  if (!r.ok) fail(BACK, r.error);
  done(BACK, outcome === "approve" ? "Claim approved. The claimant was emailed a set-password link." : "Claim rejected. The claimant was notified.");
}

export default async function AdminClaims({ searchParams }: { searchParams: Promise<Flash> }) {
  await requireStaff();
  const flash = await searchParams;
  const db = getDb();
  const [pending, recent] = await Promise.all([
    db.select({ c: claims, org: organizations }).from(claims).innerJoin(organizations, eq(organizations.id, claims.organizationId)).where(eq(claims.state, "pending")).orderBy(claims.createdAt),
    db.select({ c: claims, org: organizations }).from(claims).innerJoin(organizations, eq(organizations.id, claims.organizationId)).where(ne(claims.state, "pending")).orderBy(desc(claims.reviewedAt)).limit(30),
  ]);

  return (
    <div className="stack">
      <h1>Claims</h1>
      <FlashMessages {...flash} />
      <h2>Pending ({pending.length})</h2>
      {pending.length === 0 && <p className="muted">No pending claims.</p>}
      {pending.map(({ c, org }) => (
        <article key={c.id} className="card" aria-labelledby={`claim-${c.id}`}>
          <div className="row between">
            <h3 id={`claim-${c.id}`} style={{ margin: 0 }}>
              Claim for <Link href={`/admin/providers/${org.id}`}>{org.tradeName ?? org.legalName}</Link>
            </h3>
            {c.emailDomainMatchesWebsite ? (
              <span className="badge badge-ok">Email domain matches website</span>
            ) : (
              <span className="badge badge-bad">Email domain does NOT match website</span>
            )}
          </div>
          <dl className="dl" style={{ marginTop: 12 }}>
            <dt>Submitted</dt><dd>{fmtDateTime(c.createdAt)}</dd>
            <dt>Claimant</dt><dd>{c.claimantName} ({c.claimantRole})</dd>
            <dt>Claimant email</dt><dd>{c.claimantEmail} <span className="muted small">domain: {domainOf(c.claimantEmail) ?? "—"}</span></dd>
            <dt>Listing website</dt>
            <dd>
              {org.website ? <a href={org.website} rel="noopener noreferrer nofollow" target="_blank">{org.website}</a> : <span className="muted">No website on file</span>}
              {org.website && <span className="muted small"> domain: {domainOf(org.website) ?? "—"}</span>}
            </dd>
            <dt>Listing public email</dt><dd>{org.publicEmail ?? "—"}</dd>
            <dt>Listing status</dt><dd><StatusBadge value={org.listingStatus} /> <StatusBadge value={org.claimState} /></dd>
            <dt>Evidence</dt><dd style={{ whiteSpace: "pre-wrap" }}>{c.evidenceNote}</dd>
          </dl>
          <form style={{ marginTop: 12 }}>
            <input type="hidden" name="claimId" value={c.id} />
            <div className="field">
              <label htmlFor={`note-${c.id}`}>Review note</label>
              <textarea id={`note-${c.id}`} name="note" required minLength={3} maxLength={1000} aria-describedby={`note-${c.id}-help`} />
              <div className="help" id={`note-${c.id}-help`}>Required. On rejection, this note is sent to the claimant.</div>
            </div>
            <div className="row">
              <button className="btn" type="submit" formAction={decide.bind(null, "approve")}>Approve claim</button>
              <button className="btn btn-danger" type="submit" formAction={decide.bind(null, "reject")}>Reject claim</button>
            </div>
          </form>
        </article>
      ))}

      <h2>Recently decided</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">Listing</th><th scope="col">Claimant</th><th scope="col">Domain match</th><th scope="col">Decision</th><th scope="col">Reviewed</th><th scope="col">Note</th></tr></thead>
          <tbody>
            {recent.length === 0 ? (
              <tr><td colSpan={6} className="muted">None yet.</td></tr>
            ) : (
              recent.map(({ c, org }) => (
                <tr key={c.id}>
                  <td><Link href={`/admin/providers/${org.id}`}>{org.tradeName ?? org.legalName}</Link></td>
                  <td>{c.claimantName}</td>
                  <td>{c.emailDomainMatchesWebsite ? "Yes" : "No"}</td>
                  <td><StatusBadge value={c.state} /></td>
                  <td className="small">{fmtDateTime(c.reviewedAt)}</td>
                  <td className="small">{c.reviewNote ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
