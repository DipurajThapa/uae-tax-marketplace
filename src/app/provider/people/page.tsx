import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { professionals, credentials, credentialSubmissions } from "@/db/schema";
import { requireProvider } from "@/lib/session";
import { userActor } from "@/lib/audit";
import { addProfessional, updateProfessional, removeProfessional, submitIndividualCredential } from "@/lib/people";
import { withEffectiveStatus } from "@/lib/credential-status";
import { CREDENTIAL_TYPES, LANGUAGES, LANGUAGE_BY_CODE } from "@/lib/taxonomy";
import { CredentialLine, Field } from "@/components/ui";
import { Flash, back, UUID_RE, fmtDate } from "../_ui";

export const metadata = { title: "People", robots: { index: false } };
const PATH = "/provider/people";
const INDIVIDUAL_TYPES = CREDENTIAL_TYPES.filter((c) => c.subject === "professional");

const formPerson = (fd: FormData) => ({
  fullName: String(fd.get("fullName") ?? ""),
  title: String(fd.get("title") ?? ""),
  bio: String(fd.get("bio") ?? ""),
  languages: fd.getAll("languages").map(String),
});
const firstError = (errors: Record<string, string>) => Object.values(errors)[0] ?? "Please check the form.";

async function add(fd: FormData) {
  "use server";
  const user = await requireProvider();
  const r = await addProfessional(getDb(), userActor(user.id), user.organizationId, formPerson(fd));
  back(PATH, r.ok ? "notice" : "error", r.ok ? "Person added." : firstError(r.errors));
}

async function update(fd: FormData) {
  "use server";
  const user = await requireProvider();
  const id = String(fd.get("professionalId") ?? "");
  if (!UUID_RE.test(id)) back(PATH, "error", "Unknown person.");
  const r = await updateProfessional(getDb(), userActor(user.id), user.organizationId, id, formPerson(fd));
  back(PATH, r.ok ? "notice" : "error", r.ok ? "Saved." : firstError(r.errors));
}

async function remove(fd: FormData) {
  "use server";
  const user = await requireProvider();
  const id = String(fd.get("professionalId") ?? "");
  if (!UUID_RE.test(id) || fd.get("confirm") !== "yes") back(PATH, "error", "Tick the box to confirm removal.");
  let ok = true;
  try {
    await removeProfessional(getDb(), userActor(user.id), user.organizationId, id);
  } catch {
    ok = false;
  }
  back(PATH, ok ? "notice" : "error", ok ? "Person removed, with their registrations." : "Person not found.");
}

async function submitReg(fd: FormData) {
  "use server";
  const user = await requireProvider();
  const r = await submitIndividualCredential(getDb(), userActor(user.id), user.organizationId, {
    professionalId: String(fd.get("professionalId") ?? ""),
    credentialType: String(fd.get("credentialType") ?? ""),
    registrationNumber: String(fd.get("registrationNumber") ?? ""),
    evidenceNote: String(fd.get("evidenceNote") ?? ""),
  });
  back(PATH, r.ok ? "notice" : "error", r.ok ? "Submitted for review. It shows as verified only after a reviewer has checked it." : firstError(r.errors));
}

function LanguageChecks({ selected, idPrefix }: { selected: string[]; idPrefix: string }) {
  return (
    <fieldset>
      <legend>Languages</legend>
      <div className="options">
        {LANGUAGES.map((l) => (
          <label className="option" key={l.code} htmlFor={`${idPrefix}-${l.code}`}>
            <input id={`${idPrefix}-${l.code}`} type="checkbox" name="languages" value={l.code} defaultChecked={selected.includes(l.code)} /> {l.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default async function People({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const user = await requireProvider();
  const { notice, error } = await searchParams;
  const db = getDb();
  const people = await db.select().from(professionals).where(and(eq(professionals.organizationId, user.organizationId), isNull(professionals.removedAt))).orderBy(professionals.fullName);
  const ids = people.map((p) => p.id);
  const creds = ids.length ? withEffectiveStatus(await db.select().from(credentials).where(inArray(credentials.professionalId, ids)), new Date()) : [];
  const subs = ids.length
    ? await db
        .select()
        .from(credentialSubmissions)
        .where(and(eq(credentialSubmissions.organizationId, user.organizationId), inArray(credentialSubmissions.professionalId, ids)))
        .orderBy(desc(credentialSubmissions.createdAt))
        .limit(20)
    : [];
  return (
    <div className="stack">
      <h1>People</h1>
      <p className="muted">Add the people who will do the work. Their individual registrations (for example an FTA tax agent listing) are checked by a reviewer before they show as verified. A verified individual tax agent lets your firm be matched for representation before the FTA.</p>
      <Flash notice={notice} error={error} />

      {people.length === 0 && <div className="card">No people added yet.</div>}
      {people.map((p) => (
        <section className="card" key={p.id} aria-labelledby={`p-${p.id}`}>
          <h2 id={`p-${p.id}`} className="card-title">{p.fullName}{p.title ? <span className="muted">, {p.title}</span> : null}</h2>
          <p className="small muted">{p.languages.map((l) => LANGUAGE_BY_CODE[l]?.name ?? l).join(", ") || "No languages listed"}</p>
          <div className="stack" style={{ gap: 6 }}>
            {creds.filter((c) => c.professionalId === p.id).map((c) => (
              <CredentialLine key={c.id} type={c.credentialType} status={c.status} registrationNumber={c.registrationNumber} verifiedAt={c.verifiedAt} />
            ))}
          </div>
          <details style={{ marginTop: 12 }}>
            <summary>Edit</summary>
            <form action={update} style={{ marginTop: 12 }}>
              <input type="hidden" name="professionalId" value={p.id} />
              <Field label="Full name" name={`fullName-${p.id}`}><input id={`fullName-${p.id}`} name="fullName" defaultValue={p.fullName} required /></Field>
              <Field label="Title (optional)" name={`title-${p.id}`}><input id={`title-${p.id}`} name="title" defaultValue={p.title ?? ""} /></Field>
              <Field label="Short bio (optional)" name={`bio-${p.id}`}><textarea id={`bio-${p.id}`} name="bio" maxLength={1500} defaultValue={p.bio ?? ""} /></Field>
              <LanguageChecks selected={p.languages} idPrefix={`lang-${p.id}`} />
              <button className="btn btn-secondary" type="submit">Save</button>
            </form>
            <form action={remove} style={{ marginTop: 12 }}>
              <input type="hidden" name="professionalId" value={p.id} />
              <label className="option"><input type="checkbox" name="confirm" value="yes" /> Remove {p.fullName} from your listing</label>
              <button className="btn btn-danger btn-sm" type="submit" style={{ marginTop: 8 }}>Remove</button>
            </form>
          </details>
        </section>
      ))}

      <section className="card" aria-labelledby="add-h">
        <h2 id="add-h">Add a person</h2>
        <form action={add}>
          <Field label="Full name" name="fullName"><input id="fullName" name="fullName" required /></Field>
          <Field label="Title (optional)" name="title"><input id="title" name="title" placeholder="e.g. Tax Manager" /></Field>
          <Field label="Short bio (optional)" name="bio"><textarea id="bio" name="bio" maxLength={1500} /></Field>
          <LanguageChecks selected={[]} idPrefix="lang-new" />
          <button className="btn" type="submit">Add person</button>
        </form>
      </section>

      {people.length > 0 && (
        <section className="card" aria-labelledby="reg-h">
          <h2 id="reg-h">Submit an individual registration</h2>
          <form action={submitReg}>
            <Field label="Person" name="professionalId">
              <select id="professionalId" name="professionalId" required>
                {people.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
              </select>
            </Field>
            <Field label="Registration or qualification" name="credentialType">
              <select id="credentialType" name="credentialType" required>
                {INDIVIDUAL_TYPES.map((c) => <option key={c.code} value={c.code}>{c.name} ({c.issuer})</option>)}
              </select>
            </Field>
            <Field label="Registration or membership number" name="registrationNumber"><input id="registrationNumber" name="registrationNumber" required /></Field>
            <Field label="Where can the reviewer check it?" name="evidenceNote" help="For example: the official register to search, or a document you can provide on request.">
              <textarea id="evidenceNote" name="evidenceNote" required minLength={10} />
            </Field>
            <button className="btn" type="submit">Submit for review</button>
          </form>
        </section>
      )}

      {subs.length > 0 && (
        <section className="card">
          <h2>Recent individual submissions</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Person</th><th>Type</th><th>Number</th><th>Status</th></tr></thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id}>
                    <td>{fmtDate(s.createdAt)}</td>
                    <td>{people.find((p) => p.id === s.professionalId)?.fullName}</td>
                    <td>{CREDENTIAL_TYPES.find((c) => c.code === s.credentialType)?.name}</td>
                    <td>{s.registrationNumber}</td>
                    <td>{s.state === "pending" ? "In review" : s.state === "approved" ? "Verified" : `Not approved${s.reviewNote ? `: ${s.reviewNote}` : ""}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
