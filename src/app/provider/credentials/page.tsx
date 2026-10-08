import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { credentialSubmissions } from "@/db/schema";
import { requireProvider } from "@/lib/session";
import { getProviderById } from "@/lib/providers";
import { submitCredential } from "@/lib/profile";
import { userActor } from "@/lib/audit";
import { CREDENTIAL_BY_CODE, CREDENTIAL_TYPES } from "@/lib/taxonomy";
import { CredentialLine, CredentialStatus, Field } from "@/components/ui";
import { Flash, REVIEW_STATE, back, fmtDate } from "../_ui";

export const metadata = { title: "Registrations", robots: { index: false } };

const ORG_TYPES = CREDENTIAL_TYPES.filter((t) => t.subject === "organization");
const PATH = "/provider/credentials";

const FIELD_LABELS: Record<string, string> = {
  credentialType: "Registration type",
  registrationNumber: "Registration number",
  evidenceNote: "Where to check it",
};

async function submit(formData: FormData) {
  "use server";
  const user = await requireProvider();
  const input = {
    credentialType: String(formData.get("credentialType") ?? ""),
    registrationNumber: String(formData.get("registrationNumber") ?? ""),
    evidenceNote: String(formData.get("evidenceNote") ?? ""),
  };
  let res: Awaited<ReturnType<typeof submitCredential>> | undefined;
  try {
    res = await submitCredential(getDb(), userActor(user.id), user.organizationId, input);
  } catch {
    back(PATH, "error", "Your submission could not be saved. Please try again.");
  }
  if (!res?.ok) {
    const errs = res && !res.ok ? Object.entries(res.errors).map(([k, m]) => `${FIELD_LABELS[k] ?? k}: ${m}`) : [];
    back(PATH, "error", errs.join(" · ") || "Please check the form and try again.");
  }
  back(PATH, "notice", "Submitted. A reviewer will check it against an official source before a badge shows.");
}

export default async function ProviderCredentials({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const user = await requireProvider();
  const { notice, error } = await searchParams;
  const db = getDb();
  const detail = await getProviderById(db, user.organizationId);
  if (!detail) notFound();
  const submissions = await db
    .select()
    .from(credentialSubmissions)
    .where(eq(credentialSubmissions.organizationId, user.organizationId))
    .orderBy(desc(credentialSubmissions.createdAt))
    .limit(100);
  const peopleCreds = detail.people.flatMap((p) => p.credentials.map((c) => ({ ...c, person: p.fullName })));

  return (
    <div className="stack">
      <h1>Registrations</h1>
      <Flash notice={notice} error={error} />
      <p className="muted">
        A registration badge shows on your listing only after a reviewer checks it by hand against an official register or document. Badges are re-checked
        regularly and are removed if a check is due, a registration has expired, or it is under dispute.
      </p>

      <section aria-labelledby="current-h">
        <h2 id="current-h">Firm registrations</h2>
        {detail.credentials.length === 0 ? (
          <p className="small">No registrations yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Registration</th>
                  <th scope="col">Number</th>
                  <th scope="col">Status</th>
                  <th scope="col">Last checked</th>
                  <th scope="col">Next check due</th>
                  <th scope="col">Expires</th>
                </tr>
              </thead>
              <tbody>
                {detail.credentials.map((c) => (
                  <tr key={c.id}>
                    <td>
                      {CREDENTIAL_BY_CODE[c.credentialType]?.name ?? c.credentialType}
                      <div className="muted small">{CREDENTIAL_BY_CODE[c.credentialType]?.issuer}</div>
                    </td>
                    <td>{c.registrationNumber ?? "–"}</td>
                    <td>
                      <CredentialStatus status={c.status} />
                    </td>
                    <td>{fmtDate(c.verifiedAt)}</td>
                    <td>{fmtDate(c.recheckDueAt)}</td>
                    <td>{fmtDate(c.expiresAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {peopleCreds.length > 0 && (
        <section aria-labelledby="people-h">
          <h2 id="people-h">Your team&apos;s registrations</h2>
          <div className="stack" style={{ gap: 6 }}>
            {peopleCreds.map((c) => (
              <div key={c.id} className="row">
                <span className="small">{c.person}:</span>
                <CredentialLine type={c.credentialType} status={c.status} registrationNumber={c.registrationNumber} verifiedAt={c.verifiedAt} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card" aria-labelledby="submit-h">
        <h2 id="submit-h">Submit a new or updated registration</h2>
        <p className="small muted">
          Submitting again for a type you already hold sends the new number for review. A verified registration keeps its badge until the reviewer decides.
        </p>
        <form action={submit}>
          <Field label="Registration type" name="credentialType">
            <select id="credentialType" name="credentialType" required defaultValue="">
              <option value="" disabled>
                Choose a type
              </option>
              {ORG_TYPES.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.name} ({t.issuer})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Registration number" name="registrationNumber" help="As it appears on the register or certificate.">
            <input
              id="registrationNumber"
              name="registrationNumber"
              type="text"
              required
              minLength={3}
              maxLength={50}
              autoComplete="off"
              aria-describedby="registrationNumber-help"
            />
          </Field>
          <Field
            label="Where to check it"
            name="evidenceNote"
            help="Tell the reviewer where this registration can be confirmed, for example the name of the public register. At least 10 characters."
          >
            <textarea id="evidenceNote" name="evidenceNote" required minLength={10} maxLength={1000} aria-describedby="evidenceNote-help" />
          </Field>
          <button className="btn" type="submit">
            Submit for review
          </button>
        </form>
      </section>

      <section aria-labelledby="history-h">
        <h2 id="history-h">Past submissions</h2>
        {submissions.length === 0 ? (
          <p className="small">No submissions yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Submitted</th>
                  <th scope="col">Registration</th>
                  <th scope="col">Number</th>
                  <th scope="col">Review</th>
                  <th scope="col">Reviewed</th>
                  <th scope="col">Reviewer note</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => {
                  const [label, cls] = REVIEW_STATE[s.state] ?? [s.state, "badge-neutral"];
                  return (
                    <tr key={s.id}>
                      <td>{fmtDate(s.createdAt)}</td>
                      <td>{CREDENTIAL_BY_CODE[s.credentialType]?.name ?? s.credentialType}</td>
                      <td>{s.registrationNumber}</td>
                      <td>
                        <span className={`badge ${cls}`}>{label}</span>
                      </td>
                      <td>{fmtDate(s.reviewedAt)}</td>
                      <td className="small">{s.reviewNote ?? "–"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
