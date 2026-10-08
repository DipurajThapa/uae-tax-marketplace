import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { getProviderBySlug } from "@/lib/providers";
import { openDispute } from "@/lib/verification";
import { clientIp } from "@/lib/session";
import { CREDENTIAL_BY_CODE } from "@/lib/taxonomy";
import { Field } from "@/components/ui";
import { flashUrl, readFlash } from "@/lib/flash";

export const metadata = { title: "Report incorrect information", robots: { index: false } };

export default async function Report({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string; sent?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const p = await getProviderBySlug(getDb(), slug);
  if (!p) notFound();
  async function send(formData: FormData) {
    "use server";
    let outcome: "ok" | "rate" | "invalid" = "ok";
    try {
      const res = await openDispute(
        getDb(),
        {
          organizationId: p!.org.id,
          credentialId: String(formData.get("credentialId") ?? ""),
          reporterEmail: String(formData.get("reporterEmail") ?? ""),
          reason: String(formData.get("reason") ?? "other") as "other",
          details: String(formData.get("details") ?? ""),
        },
        { ip: await clientIp(), now: new Date() },
      );
      if (!res.ok) outcome = "rate";
    } catch {
      outcome = "invalid";
    }
    if (outcome === "rate") redirect(flashUrl(`/report/${slug}`, "error", "Too many reports from this connection. Try again later."));
    if (outcome === "invalid") redirect(flashUrl(`/report/${slug}`, "error", "Please check the form: a valid email and at least 10 characters of detail are needed."));
    redirect(`/report/${slug}?sent=1`);
  }
  if (sp.sent)
    return (
      <div className="container narrow">
        <h1>Thank you</h1>
        <p>A reviewer will look at your report and check the registration against its official source.</p>
      </div>
    );
  return (
    <div className="container narrow">
      <h1>Report incorrect information</h1>
      <p>About: <strong>{p.org.tradeName ?? p.org.legalName}</strong></p>
      {readFlash(sp.error) && <div className="alert alert-bad" role="alert">{readFlash(sp.error)}</div>}
      <form action={send} className="card">
        <Field label="What is wrong?" name="reason">
          <select id="reason" name="reason">
            <option value="incorrect_credential">A registration or qualification is wrong</option>
            <option value="incorrect_details">Contact or business details are wrong</option>
            <option value="business_closed">The business has closed</option>
            <option value="other">Something else</option>
          </select>
        </Field>
        <Field label="Which registration? (optional)" name="credentialId">
          <select id="credentialId" name="credentialId">
            <option value="">Not about a registration</option>
            {p.credentials.map((c) => <option key={c.id} value={c.id}>{CREDENTIAL_BY_CODE[c.credentialType]?.name ?? c.credentialType}</option>)}
          </select>
        </Field>
        <Field label="Details" name="details"><textarea id="details" name="details" required minLength={10} maxLength={2000} /></Field>
        <Field label="Your email" name="reporterEmail" help="Only used if the reviewer needs to ask you a question."><input id="reporterEmail" name="reporterEmail" type="email" required /></Field>
        <button className="btn" type="submit">Send report</button>
      </form>
    </div>
  );
}
