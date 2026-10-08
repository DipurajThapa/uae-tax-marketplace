import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { getProviderBySlug } from "@/lib/providers";
import { submitClaim } from "@/lib/claims";
import { clientIp } from "@/lib/session";
import { Field } from "@/components/ui";

export const metadata = { title: "Claim this listing", robots: { index: false } };

export default async function Claim({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ e?: string; sent?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const p = await getProviderBySlug(getDb(), slug);
  if (!p) notFound();
  const errors: Record<string, string> = sp.e ? safeJson(sp.e) : {};
  const name = p.org.tradeName ?? p.org.legalName;

  async function send(formData: FormData) {
    "use server";
    const res = await submitClaim(
      getDb(),
      {
        organizationId: p!.org.id,
        claimantName: String(formData.get("claimantName") ?? ""),
        claimantEmail: String(formData.get("claimantEmail") ?? ""),
        claimantRole: String(formData.get("claimantRole") ?? ""),
        evidenceNote: String(formData.get("evidenceNote") ?? ""),
      },
      { ip: await clientIp(), now: new Date() },
    );
    if (!res.ok) redirect(`/claim/${slug}?e=${encodeURIComponent(JSON.stringify(res.errors))}`);
    redirect(`/claim/${slug}?sent=1`);
  }

  if (sp.sent)
    return (
      <div className="container narrow">
        <h1>Claim received</h1>
        <p>A reviewer will check that you represent {name}. We will email you with the outcome. Using an email address on the firm’s own website domain makes this faster.</p>
      </div>
    );
  if (p.org.claimState === "claimed")
    return (
      <div className="container narrow">
        <h1>This listing is already managed</h1>
        <p>If you think this is wrong, <a href={`/report/${slug}`}>report it</a>.</p>
      </div>
    );
  return (
    <div className="container narrow">
      <h1>Claim {name}</h1>
      <p>Claiming lets you manage this listing, add registrations for checking, and receive enquiries from businesses that choose you. Listing is free.</p>
      {errors.form && <div className="alert alert-bad" role="alert">{errors.form}</div>}
      <form action={send} className="card">
        <Field label="Your name" name="claimantName" error={errors.claimantName}><input id="claimantName" name="claimantName" type="text" required autoComplete="name" /></Field>
        <Field label="Work email" name="claimantEmail" error={errors.claimantEmail} help="An address on the firm’s website domain is quickest to confirm."><input id="claimantEmail" name="claimantEmail" type="email" required autoComplete="email" /></Field>
        <Field label="Your role at the firm" name="claimantRole" error={errors.claimantRole}><input id="claimantRole" name="claimantRole" type="text" required /></Field>
        <Field label="How can we confirm you represent this firm?" name="evidenceNote" error={errors.evidenceNote} help="For example: your listing on the firm’s website, its trade licence number, or a colleague we can contact."><textarea id="evidenceNote" name="evidenceNote" required minLength={20} /></Field>
        <button className="btn" type="submit">Submit claim</button>
      </form>
    </div>
  );
}

function safeJson(s: string): Record<string, string> {
  try {
    const v = JSON.parse(s);
    return v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x).slice(0, 200)])) : {};
  } catch {
    return {};
  }
}
