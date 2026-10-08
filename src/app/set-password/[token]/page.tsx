import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { consumePasswordToken } from "@/lib/claims";
import { Field } from "@/components/ui";
import { flashUrl, readFlash } from "@/lib/flash";

export const metadata = { title: "Set your password", robots: { index: false } };

export default async function SetPassword({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const { token } = await params;
  const error = readFlash((await searchParams).error);
  async function save(formData: FormData) {
    "use server";
    const pw = String(formData.get("password") ?? "");
    if (pw !== String(formData.get("confirm") ?? "")) redirect(flashUrl(`/set-password/${token}`, "error", "Passwords do not match"));
    const res = await consumePasswordToken(getDb(), token, pw);
    if (!res.ok) redirect(flashUrl(`/set-password/${token}`, "error", res.error));
    redirect(flashUrl("/login", "notice", "Password set. Please sign in."));
  }
  return (
    <div className="container narrow" style={{ maxWidth: 440 }}>
      <h1>Set your password</h1>
      {error && <div className="alert alert-bad" role="alert">{error}</div>}
      <form action={save} className="card">
        <Field label="New password" name="password" help="At least 12 characters."><input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required /></Field>
        <Field label="Repeat password" name="confirm"><input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={12} required /></Field>
        <button className="btn" type="submit">Save password</button>
      </form>
    </div>
  );
}
