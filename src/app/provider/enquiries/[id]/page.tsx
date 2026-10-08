import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { leadCharges } from "@/db/schema";
import { requireProvider } from "@/lib/session";
import { getRecipientForProvider, respondToEnquiry } from "@/lib/enquiry";
import { QUESTIONS, answerLabel } from "@/lib/assessment";
import type { Reason } from "@/lib/matching";
import { userActor } from "@/lib/audit";
import { EMIRATE_BY_CODE, INDUSTRY_BY_CODE, JURISDICTION_BY_CODE, LANGUAGE_BY_CODE, SERVICE_BY_CODE } from "@/lib/taxonomy";
import { Field } from "@/components/ui";
import { Flash, RecipientStatus, UUID_RE, back, chargeLabel, fmtDate } from "../../_ui";

export const metadata = { title: "Enquiry", robots: { index: false } };

const respondSchema = z.object({
  decision: z.enum(["accepted", "declined"]),
  note: z
    .string()
    .trim()
    .max(1000, "Keep the note under 1,000 characters")
    .optional()
    .transform((v) => v || undefined),
});

type StoredAssessment = {
  services?: string[];
  emirate?: string;
  jurisdiction?: string;
  industry?: string;
  languages?: string[];
  answers?: Record<string, string>;
};

export default async function EnquiryDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const user = await requireProvider();
  const { id } = await params;
  const { notice, error } = await searchParams;
  if (!UUID_RE.test(id)) notFound();
  const db = getDb();
  const row = await getRecipientForProvider(db, user.organizationId, id);
  if (!row) notFound();
  const { rec, enq } = row;
  const [charge] = await db
    .select()
    .from(leadCharges)
    .where(and(eq(leadCharges.enquiryRecipientId, rec.id), eq(leadCharges.organizationId, user.organizationId)));

  const path = `/provider/enquiries/${id}`;
  async function respond(formData: FormData) {
    "use server";
    const u = await requireProvider();
    if (!UUID_RE.test(id)) back("/provider/enquiries", "error", "Enquiry not found");
    const parsed = respondSchema.safeParse({ decision: formData.get("decision"), note: formData.get("note") ?? undefined });
    if (!parsed.success) back(path, "error", parsed.error.issues[0]?.message ?? "Invalid response");
    let ok = false;
    try {
      ok = await respondToEnquiry(getDb(), userActor(u.id), u.organizationId, id, parsed.data.decision, parsed.data.note, new Date());
    } catch {
      back(path, "error", "Your response could not be saved. Please try again.");
    }
    if (!ok) back(path, "error", "This enquiry is closed or was withdrawn, so it can no longer be answered.");
    back(path, "notice", parsed.data.decision === "accepted" ? "Enquiry accepted." : "Enquiry declined.");
  }

  const erased = enq.status === "erased" || enq.status === "withdrawn";
  const closed = erased || rec.status === "closed";
  const assessment = (enq.assessment ?? {}) as StoredAssessment;
  const answers = assessment.answers ?? {};
  const reasons = Array.isArray(rec.matchReasons) ? (rec.matchReasons as Reason[]) : [];

  return (
    <div className="stack">
      <p className="small">
        <Link href="/provider/enquiries">← All enquiries</Link>
      </p>
      <div className="row between">
        <h1 style={{ margin: 0 }}>Enquiry {enq.publicRef}</h1>
        <RecipientStatus status={rec.status} erased={erased} />
      </div>
      <Flash notice={notice} error={error} />
      <p className="muted small">
        Received {fmtDate(rec.createdAt)} · Match score <span className="score">{rec.matchScore}</span> · Lead charge: {chargeLabel(charge)}
      </p>

      <div className="grid grid-2">
        <section className="card" aria-labelledby="contact-h">
          <h2 id="contact-h">Contact</h2>
          {erased ? (
            <div className="alert alert-warn" role="note">
              The business withdrew this enquiry and its contact details were erased. Please delete any copy of their details you hold.
            </div>
          ) : (
            <dl className="dl">
              <dt>Name</dt>
              <dd>{enq.contactName}</dd>
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${enq.contactEmail}`}>{enq.contactEmail}</a>
              </dd>
              {enq.contactPhone && (
                <>
                  <dt>Phone</dt>
                  <dd>
                    <a href={`tel:${enq.contactPhone.replace(/[^+0-9]/g, "")}`}>{enq.contactPhone}</a>
                  </dd>
                </>
              )}
              {enq.companyName && (
                <>
                  <dt>Company</dt>
                  <dd>{enq.companyName}</dd>
                </>
              )}
            </dl>
          )}
          {!erased && enq.message && (
            <>
              <h3 style={{ marginTop: 16 }}>Message</h3>
              <p style={{ whiteSpace: "pre-wrap" }}>{enq.message}</p>
            </>
          )}
          {!erased && (
            <p className="small muted" style={{ marginTop: 12 }}>
              The business agreed to share these details with your firm for this enquiry only.
            </p>
          )}
        </section>

        <section className="card" aria-labelledby="why-h">
          <h2 id="why-h">Why you were matched</h2>
          {reasons.length === 0 ? (
            <p className="small muted">No match reasons recorded.</p>
          ) : (
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              {reasons.map((r, i) => (
                <li key={`${r.code}-${i}`}>
                  {r.label} <span className="muted small">(+{r.points})</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card" aria-labelledby="needs-h">
        <h2 id="needs-h">What the business needs</h2>
        <dl className="dl">
          <dt>Services</dt>
          <dd>{(assessment.services ?? enq.serviceCodes).map((s) => SERVICE_BY_CODE[s]?.name ?? s).join(", ")}</dd>
          <dt>Emirate</dt>
          <dd>{EMIRATE_BY_CODE[assessment.emirate ?? enq.emirate]?.name ?? enq.emirate}</dd>
          {assessment.jurisdiction && (
            <>
              <dt>Zone</dt>
              <dd>{JURISDICTION_BY_CODE[assessment.jurisdiction]?.name ?? assessment.jurisdiction}</dd>
            </>
          )}
          {assessment.industry && (
            <>
              <dt>Industry</dt>
              <dd>{INDUSTRY_BY_CODE[assessment.industry]?.name ?? assessment.industry}</dd>
            </>
          )}
          {assessment.languages && assessment.languages.length > 0 && (
            <>
              <dt>Languages</dt>
              <dd>{assessment.languages.map((l) => LANGUAGE_BY_CODE[l]?.name ?? l).join(", ")}</dd>
            </>
          )}
          {QUESTIONS.filter((q) => answers[q.id]).map((q) => (
            <div key={q.id} style={{ display: "contents" }}>
              <dt>{q.label}</dt>
              <dd>{answerLabel(q.id, answers[q.id]!)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="card" aria-labelledby="respond-h">
        <h2 id="respond-h">Your response</h2>
        {rec.respondedAt && (
          <p className="small">
            You responded on {fmtDate(rec.respondedAt)}: <RecipientStatus status={rec.status} />
            {rec.providerNote ? <span className="muted"> · Note: {rec.providerNote}</span> : null}
          </p>
        )}
        {closed ? (
          <p className="muted">This enquiry is closed and can no longer be answered.</p>
        ) : (
          <div className="grid grid-2">
            <form action={respond} aria-labelledby="accept-h">
              <h3 id="accept-h">Accept</h3>
              <input type="hidden" name="decision" value="accepted" />
              <Field label="Note (optional)" name="accept-note" help="For your records. Not sent to the business.">
                <textarea id="accept-note" name="note" maxLength={1000} aria-describedby="accept-note-help" />
              </Field>
              <button className="btn" type="submit">
                Accept enquiry
              </button>
            </form>
            <form action={respond} aria-labelledby="decline-h">
              <h3 id="decline-h">Decline</h3>
              <input type="hidden" name="decision" value="declined" />
              <Field label="Note (optional)" name="decline-note" help="For your records. Not sent to the business.">
                <textarea id="decline-note" name="note" maxLength={1000} aria-describedby="decline-note-help" />
              </Field>
              <button className="btn btn-secondary" type="submit">
                Decline enquiry
              </button>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}
