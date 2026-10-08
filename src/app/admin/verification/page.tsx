import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { credentialSubmissions, credentials, organizations, users, professionals } from "@/db/schema";
import { approveSubmission, rejectSubmission, credentialsDueSoon, sweepStaleCredentials, duplicateRegistrations } from "@/lib/verification";
import { userActor } from "@/lib/audit";
import { CREDENTIAL_BY_CODE } from "@/lib/taxonomy";
import { requireStaff, attempt, done, fail, text, oneOf, dateField, uuidField, fmtDate, fmtDateTime, FlashMessages, type Flash } from "../_shared";

export const metadata = { title: "Admin: verification" };

const BACK = "/admin/verification";

async function approve(formData: FormData) {
  "use server";
  const user = await requireStaff();
  const submissionId = uuidField(formData, "submissionId");
  if (!submissionId) fail(BACK, "Unknown submission");
  const method = oneOf(formData, "method", ["official_register", "document_review"] as const);
  if (!method) fail(BACK, "Choose how the credential was checked");
  const evidenceNote = text(formData, "evidenceNote", 1000);
  if (evidenceNote.length < 10) fail(BACK, "Evidence note: describe what was checked, where and when (at least 10 characters)");
  const evidenceUrl = text(formData, "evidenceUrl", 500);
  const expiresAt = dateField(formData, "expiresAt");
  if (expiresAt === null) fail(BACK, "Expiry date is not a valid date");
  const r = await attempt(() => approveSubmission(getDb(), userActor(user.id), submissionId, { method, evidenceNote, evidenceUrl, expiresAt }));
  if (!r.ok) fail(BACK, r.error);
  done(BACK, "Submission approved and credential verified");
}

async function reject(formData: FormData) {
  "use server";
  const user = await requireStaff();
  const submissionId = uuidField(formData, "submissionId");
  if (!submissionId) fail(BACK, "Unknown submission");
  const note = text(formData, "note", 1000);
  if (note.length < 3) fail(BACK, "A note is required to reject a submission");
  const r = await attempt(() => rejectSubmission(getDb(), userActor(user.id), submissionId, note));
  if (!r.ok) fail(BACK, r.error);
  done(BACK, "Submission rejected");
}

async function sweep() {
  "use server";
  await requireStaff();
  const r = await attempt(() => sweepStaleCredentials(getDb()));
  if (!r.ok) fail(BACK, r.error);
  done(BACK, `Sweep complete: ${r.value} credential${r.value === 1 ? "" : "s"} marked expired`);
}

const credName = (code: string) => CREDENTIAL_BY_CODE[code]?.name ?? code;

export default async function AdminVerification({ searchParams }: { searchParams: Promise<Flash> }) {
  const user = await requireStaff();
  const flash = await searchParams;
  const db = getDb();
  const now = new Date();
  const [pending, dueSoon, expired] = await Promise.all([
    db
      .select({ s: credentialSubmissions, org: organizations, person: { id: professionals.id, fullName: professionals.fullName }, submitter: { id: users.id, email: users.email, name: users.name } })
      .from(credentialSubmissions)
      .innerJoin(organizations, eq(organizations.id, credentialSubmissions.organizationId))
      .leftJoin(professionals, eq(professionals.id, credentialSubmissions.professionalId))
      .innerJoin(users, eq(users.id, credentialSubmissions.submittedBy))
      .where(eq(credentialSubmissions.state, "pending"))
      .orderBy(credentialSubmissions.createdAt),
    credentialsDueSoon(db, now, 14),
    db
      .select({ c: credentials, org: organizations })
      .from(credentials)
      .leftJoin(organizations, eq(organizations.id, credentials.organizationId))
      .where(eq(credentials.status, "expired"))
      .orderBy(credentials.updatedAt),
  ]);
  const duplicates = new Map(
    await Promise.all(pending.map(async ({ s }) => [s.id, await duplicateRegistrations(db, s.credentialType, s.registrationNumber, s.id)] as const)),
  );

  return (
    <div className="stack">
      <h1>Verification</h1>
      <FlashMessages {...flash} />

      <section aria-labelledby="pending">
        <h2 id="pending">Pending credential submissions ({pending.length})</h2>
        {pending.length === 0 && <p className="muted">No pending submissions.</p>}
        {pending.map(({ s, org, person, submitter }) => (
          <article key={s.id} className="card" aria-labelledby={`sub-${s.id}`} style={{ marginBottom: 16 }}>
            <h3 id={`sub-${s.id}`}>
              {credName(s.credentialType)} · {s.professionalName ?? person?.fullName ? <>{s.professionalName ?? person?.fullName} at </> : null}<Link href={`/admin/providers/${org.id}`}>{org.tradeName ?? org.legalName}</Link>
            </h3>
            <dl className="dl small">
              <dt>Registration no.</dt><dd>{s.registrationNumber}</dd>
              <dt>Issuer</dt><dd>{CREDENTIAL_BY_CODE[s.credentialType]?.issuer ?? "—"}</dd>
              <dt>Submitted</dt><dd>{fmtDateTime(s.createdAt)} by {submitter.name} ({submitter.email})</dd>
              <dt>Provider note</dt><dd style={{ whiteSpace: "pre-wrap" }}>{s.evidenceNote}</dd>
            </dl>
            {person && s.professionalName && person.fullName !== s.professionalName && (
              <p className="alert alert-warn small">The firm renamed this person to {person.fullName} after submitting. Reject it and ask for a new submission.</p>
            )}
            {(duplicates.get(s.id) ?? []).length > 0 && (
              <div className="alert alert-warn small" role="note">
                <strong>The same registration number is already on file:</strong>
                <ul>
                  {duplicates.get(s.id)!.map((d) => (
                    <li key={d.id}>{d.person ? `${d.person} at ` : ""}{d.org ?? "unknown firm"} ({d.status})</li>
                  ))}
                </ul>
                Check that this person or firm really holds it before approving.
              </div>
            )}
            {submitter.id === user.id && <p className="alert alert-warn small">You submitted this yourself, so another reviewer must approve it.</p>}
            <div className="grid grid-2" style={{ marginTop: 12 }}>
              <form action={approve} aria-label={`Approve submission ${s.registrationNumber}`}>
                <input type="hidden" name="submissionId" value={s.id} />
                <fieldset>
                  <legend>Approve and verify</legend>
                  <div className="field">
                    <label htmlFor={`method-${s.id}`}>Method</label>
                    <select id={`method-${s.id}`} name="method" required defaultValue="official_register">
                      <option value="official_register">Official register</option>
                      <option value="document_review">Document review</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor={`note-${s.id}`}>Evidence note</label>
                    <textarea id={`note-${s.id}`} name="evidenceNote" required minLength={10} maxLength={1000} aria-describedby={`note-${s.id}-help`} />
                    <div className="help" id={`note-${s.id}-help`}>What was checked, where and when.</div>
                  </div>
                  <div className="field">
                    <label htmlFor={`url-${s.id}`}>Evidence URL (optional)</label>
                    <input id={`url-${s.id}`} name="evidenceUrl" type="url" maxLength={500} />
                  </div>
                  <div className="field">
                    <label htmlFor={`exp-${s.id}`}>Expiry date (optional)</label>
                    <input id={`exp-${s.id}`} name="expiresAt" type="date" />
                  </div>
                  <button className="btn btn-sm" type="submit">Approve submission</button>
                </fieldset>
              </form>
              <form action={reject} aria-label={`Reject submission ${s.registrationNumber}`}>
                <input type="hidden" name="submissionId" value={s.id} />
                <fieldset>
                  <legend>Reject</legend>
                  <div className="field">
                    <label htmlFor={`rnote-${s.id}`}>Reason</label>
                    <textarea id={`rnote-${s.id}`} name="note" required minLength={3} maxLength={1000} />
                  </div>
                  <button className="btn btn-sm btn-danger" type="submit">Reject submission</button>
                </fieldset>
              </form>
            </div>
          </article>
        ))}
      </section>

      <section aria-labelledby="due">
        <h2 id="due">Re-check due within 14 days ({dueSoon.length})</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th scope="col">Provider</th><th scope="col">Credential</th><th scope="col">Registration no.</th><th scope="col">Verified</th><th scope="col">Re-check due</th><th scope="col">Expires</th></tr></thead>
            <tbody>
              {dueSoon.length === 0 ? (
                <tr><td colSpan={6} className="muted">Nothing due in the next 14 days.</td></tr>
              ) : (
                dueSoon.map(({ c, org }) => (
                  <tr key={c.id}>
                    <td>{org ? <Link href={`/admin/providers/${org.id}`}>{org.tradeName ?? org.legalName}</Link> : <span className="muted">Professional credential</span>}</td>
                    <td>{credName(c.credentialType)}</td>
                    <td>{c.registrationNumber ?? "—"}</td>
                    <td>{fmtDate(c.verifiedAt)}</td>
                    <td>{fmtDate(c.recheckDueAt)}{c.recheckDueAt && c.recheckDueAt <= now && <span className="badge badge-bad" style={{ marginLeft: 6 }}>overdue</span>}</td>
                    <td>{fmtDate(c.expiresAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="expired">
        <div className="row between">
          <h2 id="expired" style={{ margin: 0 }}>Expired credentials ({expired.length})</h2>
          <form action={sweep}>
            <button className="btn btn-secondary" type="submit">Run stale-credential sweep now</button>
          </form>
        </div>
        <p className="small muted">The sweep marks verified credentials past their re-check date or expiry as expired, which removes the badge.</p>
        <div className="table-wrap">
          <table>
            <thead><tr><th scope="col">Provider</th><th scope="col">Credential</th><th scope="col">Registration no.</th><th scope="col">Last verified</th><th scope="col">Re-check was due</th><th scope="col">Expires</th></tr></thead>
            <tbody>
              {expired.length === 0 ? (
                <tr><td colSpan={6} className="muted">No expired credentials.</td></tr>
              ) : (
                expired.map(({ c, org }) => (
                  <tr key={c.id}>
                    <td>{org ? <Link href={`/admin/providers/${org.id}`}>{org.tradeName ?? org.legalName}</Link> : <span className="muted">Professional credential</span>}</td>
                    <td>{credName(c.credentialType)}</td>
                    <td>{c.registrationNumber ?? "—"}</td>
                    <td>{fmtDate(c.verifiedAt)}</td>
                    <td>{fmtDate(c.recheckDueAt)}</td>
                    <td>{fmtDate(c.expiresAt)}</td>
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
