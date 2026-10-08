import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { consumeEmailVerification } from "@/lib/claims";

export const metadata = { title: "Confirm your email", robots: { index: false, follow: false } };

/** The link only shows a button: confirmation needs a POST, so mail scanners that prefetch links cannot confirm. */
export default async function VerifyEmail({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ result?: string }> }) {
  const { token } = await params;
  const { result } = await searchParams;
  async function confirm() {
    "use server";
    const r = await consumeEmailVerification(getDb(), token);
    redirect(`/verify-email/${token}?result=${r.ok ? "ok" : "invalid"}`);
  }
  if (result === "ok")
    return (
      <div className="container narrow">
        <h1>Email confirmed</h1>
        <p>Thank you. Once your listing is published, businesses that choose you can send you enquiries.</p>
        <Link className="btn" href="/provider">Go to your dashboard</Link>
      </div>
    );
  return (
    <div className="container narrow" style={{ maxWidth: 480 }}>
      <h1>Confirm your email</h1>
      {result === "invalid" && <div className="alert alert-bad" role="alert">This link is invalid, already used or expired. Sign in to send a new one.</div>}
      <form action={confirm} className="card">
        <p>Confirm that this email address belongs to you.</p>
        <button className="btn" type="submit">Confirm email</button>
      </form>
    </div>
  );
}
