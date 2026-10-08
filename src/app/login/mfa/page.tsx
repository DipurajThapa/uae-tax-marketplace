import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { clientIp, currentUser, upgradeSession } from "@/lib/session";
import { verifyMfa } from "@/lib/mfa";
import { flashUrl, readFlash } from "@/lib/flash";
import { Field } from "@/components/ui";

export const metadata = { title: "Two-factor check", robots: { index: false } };

async function check(formData: FormData) {
  "use server";
  const user = await currentUser();
  if (!user || user.stage !== "mfa") redirect("/login");
  const ok = await verifyMfa(getDb(), user.id, String(formData.get("code") ?? ""), { ip: await clientIp() });
  if (!ok) redirect(flashUrl("/login/mfa", "error", "That code did not work. Use the current code from your authenticator app."));
  await upgradeSession(user);
  redirect("/admin");
}

export default async function MfaPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.stage !== "mfa") redirect(user.stage === "enroll" ? "/account/mfa-setup" : "/admin");
  const error = readFlash((await searchParams).error);
  return (
    <div className="container narrow" style={{ maxWidth: 440 }}>
      <h1>Enter your code</h1>
      <p className="muted">Open your authenticator app and enter the 6-digit code for this site.</p>
      {error && <div className="alert alert-bad" role="alert">{error}</div>}
      <form action={check} className="card">
        <Field label="Authentication code" name="code">
          <input id="code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required />
        </Field>
        <button className="btn" type="submit">Verify</button>
      </form>
    </div>
  );
}
