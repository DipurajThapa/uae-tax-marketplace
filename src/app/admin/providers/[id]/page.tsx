import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { auditLog, dataSources, credentials } from "@/db/schema";
import { getProviderById } from "@/lib/providers";
import { setListingStatus } from "@/lib/profile";
import { verifyCredential, revokeCredential } from "@/lib/verification";
import { userActor } from "@/lib/audit";
import { CREDENTIAL_BY_CODE, EMIRATE_BY_CODE, JURISDICTION_BY_CODE, ORG_KIND_LABELS, SERVICE_BY_CODE, INDUSTRY_BY_CODE } from "@/lib/taxonomy";
import { CredentialStatus } from "@/components/ui";
import {
  requireStaff,
  attempt,
  done,
  fail,
  text,
  oneOf,
  dateField,
  uuidField,
  isUuid,
  fmtDate,
  fmtDateTime,
  FlashMessages,
  StatusBadge,
  type Flash,
} from "../../_shared";

export const metadata = { title: "Admin: provider" };

const LISTING_ACTIONS = { published: "Publish", suspended: "Suspend", draft: "Back to draft" } as const;
type ListingTarget = keyof typeof LISTING_ACTIONS;

async function changeListing(target: ListingTarget, formData: FormData) {
  "use server";
  const user = await requireStaff();
  const id = uuidField(formData, "organizationId");
  if (!id) fail("/admin/providers", "Unknown provider");
  const back = `/admin/providers/${id}`;
  if (!Object.hasOwn(LISTING_ACTIONS, target)) fail(back, "Unknown listing status");
  const note = text(formData, "note", 1000);
  if (note.length < 3) fail(back, "A note is required to change the listing status");
  const r = await attempt(() => setListingStatus(getDb(), userActor(user.id), id, target, note));
  if (!r.ok) fail(back, r.error);
  done(back, `Listing status set to ${target}`);
}

async function verify(formData: FormData) {
  "use server";
  const user = await requireStaff();
  const orgId = uuidField(formData, "organizationId");
  const credentialId = uuidField(formData, "credentialId");
  if (!orgId || !credentialId) fail("/admin/providers", "Unknown credential");
  const back = `/admin/providers/${orgId}`;
  const method = oneOf(formData, "method", ["official_register", "document_review"] as const);
  if (!method) fail(back, "Choose how the credential was checked");
  const evidenceNote = text(formData, "evidenceNote", 1000);
  if (evidenceNote.length < 10) fail(back, "Evidence note: describe what was checked, where and when (at least 10 characters)");
  const evidenceUrl = text(formData, "evidenceUrl", 500);
  const expiresAt = dateField(formData, "expiresAt");
  if (expiresAt === null) fail(back, "Expiry date is not a valid date");
  const r = await attempt(() => verifyCredential(getDb(), userActor(user.id), credentialId, { method, evidenceNote, evidenceUrl, expiresAt }));
  if (!r.ok) fail(back, r.error);
  done(back, "Credential marked verified");
}

async function revoke(formData: FormData) {
  "use server";
  const user = await requireStaff();
  const orgId = uuidField(formData, "organizationId");
  const credentialId = uuidField(formData, "credentialId");
  if (!orgId || !credentialId) fail("/admin/providers", "Unknown credential");
  const back = `/admin/providers/${orgId}`;
  const note = text(formData, "note", 1000);
  if (note.length < 3) fail(back, "A note is required to revoke a credential");
  const r = await attempt(() => revokeCredential(getDb(), userActor(user.id), credentialId, note));
  if (!r.ok) fail(back, r.error);
  done(back, "Credential revoked");
}

type Cred = typeof credentials.$inferSelect;

function CredentialRow({ c, orgId, holder }: { c: Cred; orgId: string; holder: string }) {
  const def = CREDENTIAL_BY_CODE[c.credentialType];
  return (
    <div className="card" style={{ boxShadow: "none" }}>
      <div className="row between">
        <h3 style={{ margin: 0 }}>{def?.name ?? c.credentialType}</h3>
        <CredentialStatus status={c.status} />
      </div>
      <dl className="dl small" style={{ marginTop: 8 }}>
        <dt>Holder</dt><dd>{holder}</dd>
        <dt>Issuer</dt><dd>{def?.issuer ?? "—"}</dd>
        <dt>Registration no.</dt><dd>{c.registrationNumber ?? "—"}</dd>
        <dt>Status</dt><dd>{c.status}</dd>
        <dt>Method</dt><dd>{c.method}</dd>
        <dt>Evidence note</dt><dd>{c.evidenceNote ?? "—"}</dd>
        <dt>Evidence URL</dt><dd>{c.evidenceUrl ? <a href={c.evidenceUrl} rel="noopener noreferrer nofollow" target="_blank">{c.evidenceUrl}</a> : "—"}</dd>
        <dt>Verified</dt><dd>{fmtDateTime(c.verifiedAt)}</dd>
        <dt>Expires</dt><dd>{fmtDate(c.expiresAt)}</dd>
        <dt>Re-check due</dt><dd>{fmtDate(c.recheckDueAt)}</dd>
      </dl>
      <div className="grid grid-2" style={{ marginTop: 12 }}>
        {c.status === "disputed" ? (
          <p className="alert alert-warn small">This credential has an open dispute. Resolve it on the <Link href="/admin/disputes">disputes page</Link> before verifying.</p>
        ) : (
          <form action={verify} aria-label={`Verify ${def?.name ?? c.credentialType}`}>
            <input type="hidden" name="organizationId" value={orgId} />
            <input type="hidden" name="credentialId" value={c.id} />
            <fieldset>
              <legend>Verify</legend>
              <div className="field">
                <label htmlFor={`method-${c.id}`}>Method</label>
                <select id={`method-${c.id}`} name="method" required defaultValue="official_register">
                  <option value="official_register">Official register</option>
                  <option value="document_review">Document review</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor={`note-${c.id}`}>Evidence note</label>
                <textarea id={`note-${c.id}`} name="evidenceNote" required minLength={10} maxLength={1000} aria-describedby={`note-${c.id}-help`} />
                <div className="help" id={`note-${c.id}-help`}>What was checked, where and when.</div>
              </div>
              <div className="field">
                <label htmlFor={`url-${c.id}`}>Evidence URL (optional)</label>
                <input id={`url-${c.id}`} name="evidenceUrl" type="url" maxLength={500} />
              </div>
              <div className="field">
                <label htmlFor={`exp-${c.id}`}>Expiry date (optional)</label>
                <input id={`exp-${c.id}`} name="expiresAt" type="date" />
              </div>
              <button className="btn btn-sm" type="submit">Mark verified</button>
            </fieldset>
          </form>
        )}
        {c.status !== "revoked" && (
          <form action={revoke} aria-label={`Revoke ${def?.name ?? c.credentialType}`}>
            <input type="hidden" name="organizationId" value={orgId} />
            <input type="hidden" name="credentialId" value={c.id} />
            <fieldset>
              <legend>Revoke</legend>
              <div className="field">
                <label htmlFor={`rnote-${c.id}`}>Reason</label>
                <textarea id={`rnote-${c.id}`} name="note" required minLength={3} maxLength={1000} />
              </div>
              <button className="btn btn-sm btn-danger" type="submit">Revoke credential</button>
            </fieldset>
          </form>
        )}
      </div>
    </div>
  );
}

export default async function AdminProviderDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Flash> }) {
  await requireStaff();
  const { id } = await params;
  const flash = await searchParams;
  if (!isUuid(id)) notFound();
  const db = getDb();
  const detail = await getProviderById(db, id);
  if (!detail) notFound();
  const { org } = detail;
  const credIds = [...detail.credentials.map((c) => c.id), ...detail.people.flatMap((p) => p.credentials.map((c) => c.id))];

  const [[source], logs] = await Promise.all([
    org.sourceId ? db.select().from(dataSources).where(eq(dataSources.id, org.sourceId)) : Promise.resolve([] as (typeof dataSources.$inferSelect)[]),
    db
      .select()
      .from(auditLog)
      .where(
        credIds.length
          ? or(and(eq(auditLog.entityType, "organization"), eq(auditLog.entityId, id)), and(eq(auditLog.entityType, "credential"), inArray(auditLog.entityId, credIds)))
          : and(eq(auditLog.entityType, "organization"), eq(auditLog.entityId, id)),
      )
      .orderBy(desc(auditLog.createdAt))
      .limit(200),
  ]);

  return (
    <div className="stack">
      <p className="small"><Link href="/admin/providers">← All providers</Link></p>
      <div className="row between">
        <h1 style={{ margin: 0 }}>{org.legalName}</h1>
        <div className="row" style={{ gap: 6 }}>
          <StatusBadge value={org.listingStatus} />
          <StatusBadge value={org.claimState} />
          {org.isSynthetic && <span className="badge badge-neutral">Synthetic</span>}
        </div>
      </div>
      <FlashMessages {...flash} />

      <section className="card" aria-labelledby="details">
        <h2 id="details">Details</h2>
        <dl className="dl">
          <dt>Trade name</dt><dd>{org.tradeName ?? "—"}</dd>
          <dt>Slug</dt><dd>{org.slug}{org.listingStatus === "published" && <> · <Link href={`/providers/${org.slug}`}>public profile</Link></>}</dd>
          <dt>Kind</dt><dd>{ORG_KIND_LABELS[org.kind] ?? org.kind}</dd>
          <dt>Emirate / city</dt><dd>{EMIRATE_BY_CODE[org.emirate]?.name ?? org.emirate}{org.city ? ` / ${org.city}` : ""}</dd>
          <dt>Address</dt><dd>{org.address ?? "—"}</dd>
          <dt>Website</dt><dd>{org.website ? <a href={org.website} rel="noopener noreferrer nofollow" target="_blank">{org.website}</a> : "—"}</dd>
          <dt>Public email</dt><dd>{org.publicEmail ?? "—"}</dd>
          <dt>Public phone</dt><dd>{org.publicPhone ?? "—"}</dd>
          <dt>Description</dt><dd style={{ whiteSpace: "pre-wrap" }}>{org.description ?? "—"}</dd>
          <dt>Languages</dt><dd>{org.languages.join(", ") || "—"}</dd>
          <dt>Founded / size</dt><dd>{org.foundedYear ?? "—"} / {org.sizeBand ?? "—"}</dd>
          <dt>Accepting enquiries</dt><dd>{org.acceptingEnquiries ? "Yes" : "No"}</dd>
          <dt>Services</dt><dd>{detail.services.map((s) => SERVICE_BY_CODE[s]?.name ?? s).join(", ") || "—"}</dd>
          <dt>Jurisdictions</dt><dd>{detail.jurisdictions.map((j) => JURISDICTION_BY_CODE[j]?.name ?? j).join(", ") || "—"}</dd>
          <dt>Industries</dt><dd>{detail.industries.map((i) => INDUSTRY_BY_CODE[i]?.name ?? i).join(", ") || "—"}</dd>
          <dt>Created / updated</dt><dd>{fmtDateTime(org.createdAt)} / {fmtDateTime(org.updatedAt)}</dd>
          <dt>Last reviewed</dt><dd>{fmtDateTime(org.lastReviewedAt)}</dd>
        </dl>
      </section>

      <section className="card" aria-labelledby="listing">
        <h2 id="listing">Listing status</h2>
        <p className="small muted">Current status: <StatusBadge value={org.listingStatus} />. A note is required and is stored in the audit log.</p>
        <form>
          <input type="hidden" name="organizationId" value={org.id} />
          <div className="field">
            <label htmlFor="listing-note">Note</label>
            <textarea id="listing-note" name="note" required minLength={3} maxLength={1000} />
          </div>
          <div className="row">
            {(Object.keys(LISTING_ACTIONS) as ListingTarget[]).map((t) => (
              <button
                key={t}
                type="submit"
                formAction={changeListing.bind(null, t)}
                className={t === "suspended" ? "btn btn-danger" : t === "published" ? "btn" : "btn btn-secondary"}
                disabled={org.listingStatus === t}
              >
                {LISTING_ACTIONS[t]}
              </button>
            ))}
          </div>
        </form>
      </section>

      <section aria-labelledby="creds">
        <h2 id="creds">Credentials</h2>
        {detail.credentials.length === 0 && detail.people.every((p) => p.credentials.length === 0) && <p className="muted">No credentials recorded.</p>}
        <div className="stack">
          {detail.credentials.map((c) => <CredentialRow key={c.id} c={c} orgId={org.id} holder="Organisation" />)}
          {detail.people.flatMap((p) => p.credentials.map((c) => <CredentialRow key={c.id} c={c} orgId={org.id} holder={p.fullName} />))}
        </div>
      </section>

      {detail.people.length > 0 && (
        <section aria-labelledby="people">
          <h2 id="people">Professionals</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th scope="col">Name</th><th scope="col">Title</th><th scope="col">Credentials</th><th scope="col">Synthetic</th></tr></thead>
              <tbody>
                {detail.people.map((p) => (
                  <tr key={p.id}>
                    <td>{p.fullName}</td>
                    <td>{p.title ?? "—"}</td>
                    <td>{p.credentials.map((c) => `${CREDENTIAL_BY_CODE[c.credentialType]?.name ?? c.credentialType} (${c.status})`).join(", ") || "—"}</td>
                    <td>{p.isSynthetic ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="card" aria-labelledby="source">
        <h2 id="source">Source record</h2>
        {source ? (
          <dl className="dl">
            <dt>Source</dt><dd>{source.name}</dd>
            <dt>Kind</dt><dd>{source.kind}</dd>
            <dt>URL</dt><dd>{source.url ? <a href={source.url} rel="noopener noreferrer nofollow" target="_blank">{source.url}</a> : "—"}</dd>
            <dt>Terms reviewed</dt><dd>{source.termsReviewedAt ? fmtDate(source.termsReviewedAt) : <span className="badge badge-bad">Not reviewed</span>}</dd>
            <dt>Terms notes</dt><dd>{source.termsNotes ?? "—"}</dd>
            <dt>Record reference</dt><dd>{org.sourceRecordRef ?? "—"}</dd>
          </dl>
        ) : (
          <p className="muted">No source recorded.</p>
        )}
      </section>

      <section aria-labelledby="audit">
        <h2 id="audit">Audit log</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th scope="col">When</th><th scope="col">Actor</th><th scope="col">Action</th><th scope="col">Entity</th><th scope="col">Details</th></tr></thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={5} className="muted">No audit entries.</td></tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id}>
                    <td className="small">{fmtDateTime(l.createdAt)}</td>
                    <td className="small">{l.actorLabel}</td>
                    <td>{l.action}</td>
                    <td className="small">{l.entityType}</td>
                    <td className="small"><code style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{JSON.stringify(l.details)}</code></td>
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
