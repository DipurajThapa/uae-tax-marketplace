import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { requestPasswordReset } from "@/lib/claims";
import { clientIp } from "@/lib/session";
import { Field } from "@/components/ui";

export const metadata = { title: "Reset your password", robots: { index: false } };

export default async function ForgotPassword({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { sent } = await searchParams;
  async function send(formData: FormData) {
    "use server";
    await requestPasswordReset(getDb(), String(formData.get("email") ?? ""), { ip: await clientIp(), now: new Date() });
    redirect("/forgot-password?sent=1");
  }
  return (
    <div className="container narrow" style={{ maxWidth: 440 }}>
      <h1>Reset your password</h1>
      {sent ? (
        <div className="alert alert-info" role="status">If an account exists for that email, we have sent a reset link. It works once and expires in 1 hour.</div>
      ) : (
        <form action={send} className="card">
          <Field label="Email" name="email"><input id="email" name="email" type="email" autoComplete="email" required /></Field>
          <button className="btn" type="submit">Send reset link</button>
        </form>
      )}
    </div>
  );
}
