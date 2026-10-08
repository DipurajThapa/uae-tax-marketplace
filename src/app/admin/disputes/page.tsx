import Link from "next/link";
import { desc, eq, ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import { disputes, organizations, credentials } from "@/db/schema";
import { resolveDispute, freezeForDispute } from "@/lib/verification";
import { userActor } from "@/lib/audit";
import { CREDENTIAL_BY_CODE } from "@/lib/taxonomy";
import { requireStaff, attempt, done, fail, text, uuidField, fmtDateTime, maskEmail, FlashMessages, StatusBadge, type Flash } from "../_shared";

export const metadata = { title: "Admin: disputes" };

const BACK = "/admin/disputes";

const REASONS: Record<string, string> = {
  incorrect_credential: "Incorrect credential",
  incorrect_details: "Incorrect details",
  business_closed: "Business closed",
  other: "Other",
};

async function resolve(outcome: "upheld" | "rejected", formData: FormData) {
  "use server";
  const user = await requireStaff();
  if (outcome !== "upheld" && outcome !== "rejected") fail(BACK, "Unknown outcome");
  const disputeId = uuidField(formData, "disputeId");
  if (!disputeId) fail(BACK, "Unknown dispute");
  const note = text(formData, "note", 1000);
  if (note.length < 3) fail(BACK, "A resolution note is required");
  const r = await attempt(() => resolveDispute(getDb(), userActor(user.id), disputeId, outcome, note));
  if (!r.ok) fail(BACK, r.error);
  done(BACK, outcome === "upheld" ? "Dispute upheld" : "Dispute rejected");
}

async function freeze(formData: FormData) {
  "use server";
  const user = await requireStaff();
  const disputeId = uuidField(formData, "disputeId");
  if (!disputeId) fail(BACK, "Unknown dispute");
  const r = await attempt(() => freezeForDispute(getDb(), userActor(user.id), disputeId));
  if (!r.ok) fail(BACK, r.error);
  done(BACK, "Badge hidden while the dispute is investigated");
}

export default async function AdminDisputes({ searchParams }: { searchParams: Promise<Flash> }) {
  await requireStaff();
  const flash = await searchParams;
  const db = getDb();
  const base = () =>
    db
      .select({ d: disputes, org: organizations, cred: credentials })
      .from(disputes)
      .innerJoin(organizations, eq(organizations.id, disputes.organizationId))
      .leftJoin(credentials, eq(credentials.id, disputes.credentialId));
  const [open, resolved] = await Promise.all([
    base().where(eq(disputes.state, "open")).orderBy(disputes.createdAt),
    base().where(ne(disputes.state, "open")).orderBy(desc(disputes.resolvedAt)).limit(50),
  ]);

  return (
    <div className="stack">
      <h1>Disputes</h1>
      <FlashMessages {...flash} />
      <p className="small muted">
        Upholding a dispute revokes the disputed credential; upholding a “business closed” report also suspends the listing. Rejecting restores the credential’s previous status (or marks it expired if its re-check date has passed).
      </p>

      <h2>Open ({open.length})</h2>
      {open.length === 0 && <p className="muted">No open disputes.</p>}
      {open.map(({ d, org, cred }) => (
        <article key={d.id} className="card" aria-labelledby={`d-${d.id}`}>
          <h3 id={`d-${d.id}`}>
            {REASONS[d.reason] ?? d.reason} · <Link href={`/admin/providers/${org.id}`}>{org.tradeName ?? org.legalName}</Link>
          </h3>
          <dl className="dl small">
            <dt>Reported</dt><dd>{fmtDateTime(d.createdAt)} by {maskEmail(d.reporterEmail)}</dd>
            <dt>Credential</dt>
            <dd>{cred ? `${CREDENTIAL_BY_CODE[cred.credentialType]?.name ?? cred.credentialType} · No. ${cred.registrationNumber ?? "—"} · now ${cred.status} (was ${d.priorCredentialStatus ?? "—"})` : "None (listing details)"}</dd>
            <dt>Listing</dt><dd><StatusBadge value={org.listingStatus} /></dd>
            <dt>Details</dt><dd style={{ whiteSpace: "pre-wrap" }}>{d.details}</dd>
          </dl>
          <form style={{ marginTop: 12 }}>
            <input type="hidden" name="disputeId" value={d.id} />
            <div className="field">
              <label htmlFor={`note-${d.id}`}>Resolution note</label>
              <textarea id={`note-${d.id}`} name="note" required minLength={3} maxLength={1000} />
            </div>
            <div className="row">
              <button className="btn btn-danger" type="submit" formAction={resolve.bind(null, "upheld")}>Uphold dispute</button>
              <button className="btn btn-secondary" type="submit" formAction={resolve.bind(null, "rejected")}>Reject dispute</button>
            </div>
          </form>
          {d.credentialId && (
            <form action={freeze} style={{ marginTop: 8 }}>
              <input type="hidden" name="disputeId" value={d.id} />
              <button className="btn btn-secondary btn-sm" type="submit">Hide badge while investigating</button>
              <span className="small muted"> Reports never hide a badge on their own; use this only if the report looks credible.</span>
            </form>
          )}
        </article>
      ))}

      <h2>Resolved (latest 50)</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">Provider</th><th scope="col">Reason</th><th scope="col">Credential</th><th scope="col">Outcome</th><th scope="col">Resolved</th><th scope="col">Note</th></tr></thead>
          <tbody>
            {resolved.length === 0 ? (
              <tr><td colSpan={6} className="muted">None yet.</td></tr>
            ) : (
              resolved.map(({ d, org, cred }) => (
                <tr key={d.id}>
                  <td><Link href={`/admin/providers/${org.id}`}>{org.tradeName ?? org.legalName}</Link></td>
                  <td>{REASONS[d.reason] ?? d.reason}</td>
                  <td>{cred ? CREDENTIAL_BY_CODE[cred.credentialType]?.name ?? cred.credentialType : "—"}</td>
                  <td><StatusBadge value={d.state} /></td>
                  <td className="small">{fmtDateTime(d.resolvedAt)}</td>
                  <td className="small">{d.resolutionNote ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
