import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { enquiries, enquiryRecipients, organizations, leadCharges, consents } from "@/db/schema";
import { eraseEnquiry } from "@/lib/enquiry";
import { audit, userActor } from "@/lib/audit";
import { EMIRATE_BY_CODE, SERVICE_BY_CODE } from "@/lib/taxonomy";
import { requireStaff, requireAdmin, attempt, done, fail, text, uuidField, isUuid, fmtDateTime, FlashMessages, StatusBadge, type Flash } from "../../_shared";

export const metadata = { title: "Admin: enquiry" };

async function erase(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const id = uuidField(formData, "enquiryId");
  if (!id) fail("/admin/enquiries", "Unknown enquiry");
  const back = `/admin/enquiries/${id}`;
  if (text(formData, "confirm", 10) !== "yes") fail(back, "Tick the confirmation box to erase personal data");
  const r = await attempt(() => eraseEnquiry(getDb(), userActor(user.id), id));
  if (!r.ok) fail(back, r.error);
  done(back, "Personal data erased. Recipients were asked to delete their copy.");
}

export default async function AdminEnquiryDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Flash> }) {
  // Buyer contact details are visible to admins only (data minimisation); reviewers see the masked list.
  const user = await requireAdmin();
  const { id } = await params;
  const flash = await searchParams;
  if (!isUuid(id)) notFound();
  const db = getDb();
  const [enq] = await db.select().from(enquiries).where(eq(enquiries.id, id));
  if (!enq) notFound();
  // Access to personal data is logged.
  await audit(db, userActor(user.id), "enquiry.viewed", "enquiry", id);

  const [recips, [consent]] = await Promise.all([
    db
      .select({ r: enquiryRecipients, org: { id: organizations.id, legalName: organizations.legalName, tradeName: organizations.tradeName } })
      .from(enquiryRecipients)
      .innerJoin(organizations, eq(organizations.id, enquiryRecipients.organizationId))
      .where(eq(enquiryRecipients.enquiryId, id))
      .orderBy(enquiryRecipients.createdAt),
    db.select().from(consents).where(eq(consents.id, enq.consentId)),
  ]);
  const charges = recips.length ? await db.select().from(leadCharges).where(inArray(leadCharges.enquiryRecipientId, recips.map((x) => x.r.id))) : [];
  const erased = enq.status === "erased";

  return (
    <div className="stack">
      <p className="small"><Link href="/admin/enquiries">← All enquiries</Link></p>
      <div className="row between">
        <h1 style={{ margin: 0 }}>Enquiry {enq.publicRef}</h1>
        <StatusBadge value={enq.status} />
      </div>
      <FlashMessages {...flash} />
      <p className="small muted">This view was recorded in the audit log.</p>

      <section className="card" aria-labelledby="record">
        <h2 id="record">Record</h2>
        <dl className="dl">
          <dt>Created</dt><dd>{fmtDateTime(enq.createdAt)}</dd>
          <dt>Contact name</dt><dd>{enq.contactName}</dd>
          <dt>Contact email</dt><dd>{enq.contactEmail}</dd>
          <dt>Contact phone</dt><dd>{enq.contactPhone ?? "—"}</dd>
          <dt>Company</dt><dd>{enq.companyName ?? "—"}</dd>
          <dt>Services</dt><dd>{enq.serviceCodes.map((s) => SERVICE_BY_CODE[s]?.name ?? s).join(", ")}</dd>
          <dt>Emirate</dt><dd>{EMIRATE_BY_CODE[enq.emirate]?.name ?? enq.emirate}</dd>
          <dt>Message</dt><dd style={{ whiteSpace: "pre-wrap" }}>{enq.message ?? "—"}</dd>
          <dt>Spam score</dt><dd>{enq.spamScore}</dd>
          <dt>Erased</dt><dd>{fmtDateTime(enq.erasedAt)}</dd>
          <dt>Consent</dt>
          <dd>{consent ? `version ${consent.textVersion}, granted ${fmtDateTime(consent.grantedAt)}, purposes: ${consent.purposes.join(", ")}` : "—"}</dd>
        </dl>
        <details style={{ marginTop: 12 }}>
          <summary>Assessment answers</summary>
          <pre className="small" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{JSON.stringify(enq.assessment, null, 2)}</pre>
        </details>
      </section>

      <section aria-labelledby="recipients">
        <h2 id="recipients">Recipients and lead charges</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Provider</th>
                <th scope="col">Match score</th>
                <th scope="col">Status</th>
                <th scope="col">Notified</th>
                <th scope="col">Viewed</th>
                <th scope="col">Responded</th>
                <th scope="col">Provider note</th>
                <th scope="col">Lead charge (test mode)</th>
              </tr>
            </thead>
            <tbody>
              {recips.length === 0 ? (
                <tr><td colSpan={8} className="muted">No recipients.</td></tr>
              ) : (
                recips.map(({ r, org }) => {
                  const ch = charges.find((c) => c.enquiryRecipientId === r.id);
                  return (
                    <tr key={r.id}>
                      <td><Link href={`/admin/providers/${org.id}`}>{org.tradeName ?? org.legalName}</Link></td>
                      <td>{r.matchScore}</td>
                      <td><StatusBadge value={r.status} /></td>
                      <td className="small">{fmtDateTime(r.notifiedAt)}</td>
                      <td className="small">{fmtDateTime(r.viewedAt)}</td>
                      <td className="small">{fmtDateTime(r.respondedAt)}</td>
                      <td className="small">{r.providerNote ?? "—"}</td>
                      <td className="small">
                        {ch ? (
                          <>
                            AED {ch.amountAed} {ch.included ? "(included)" : "(overage)"} · <StatusBadge value={ch.status} /> · {ch.periodMonth}
                            {ch.reason && <div className="muted">{ch.reason}</div>}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card" aria-labelledby="erase">
        <h2 id="erase">Erase personal data</h2>
        {erased ? (
          <p className="muted">Personal data for this enquiry was erased on {fmtDateTime(enq.erasedAt)}.</p>
        ) : user.role !== "admin" ? (
          <p className="muted">Only an admin can erase an enquiry.</p>
        ) : (
          <form action={erase}>
            <input type="hidden" name="enquiryId" value={enq.id} />
            <p className="small">Removes the contact name, email, phone, company and message, closes all recipients and asks them to delete their copy. This cannot be undone.</p>
            <div className="field">
              <label className="option" htmlFor="confirm" style={{ maxWidth: 520 }}>
                <input id="confirm" name="confirm" type="checkbox" value="yes" required />
                <span>I confirm I want to permanently erase this enquiry’s personal data</span>
              </label>
            </div>
            <button className="btn btn-danger" type="submit">Erase personal data</button>
          </form>
        )}
      </section>
    </div>
  );
}
