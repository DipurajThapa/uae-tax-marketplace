import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { getDb } from "@/db/client";
import { currentUser } from "@/lib/session";
import { beginEnrollment, confirmEnrollment, pendingSecret, setSessionStage } from "@/lib/mfa";
import { otpauthUri } from "@/lib/totp";
import { flashUrl, readFlash } from "@/lib/flash";
import { BRAND } from "@/lib/brand";
import { Field } from "@/components/ui";

export const metadata = { title: "Set up two-factor authentication", robots: { index: false } };

async function confirm(formData: FormData) {
  "use server";
  const user = await currentUser();
  if (!user || user.stage !== "enroll") redirect("/login");
  const ok = await confirmEnrollment(getDb(), user.id, String(formData.get("code") ?? ""));
  if (!ok) redirect(flashUrl("/account/mfa-setup", "error", "That code did not match. Check your device clock and try the current code."));
  await setSessionStage(getDb(), user.sessionId, "full");
  redirect(flashUrl("/admin", "notice", "Two-factor authentication is on."));
}

export default async function MfaSetup({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.stage !== "enroll") redirect(user.stage === "mfa" ? "/login/mfa" : "/admin");
  const db = getDb();
  const secret = (await pendingSecret(db, user.id)) ?? (await beginEnrollment(db, user.id));
  const uri = otpauthUri(BRAND.name, user.email, secret);
  const svg = await QRCode.toString(uri, { type: "svg", margin: 1, width: 200 });
  const error = readFlash((await searchParams).error);
  return (
    <div className="container narrow" style={{ maxWidth: 520 }}>
      <h1>Set up two-factor authentication</h1>
      <p>Staff accounts need a second factor. Scan this code with an authenticator app (for example Google Authenticator, Microsoft Authenticator or 1Password), then enter the 6-digit code it shows.</p>
      {error && <div className="alert alert-bad" role="alert">{error}</div>}
      <div className="card stack">
        <div role="img" aria-label="QR code for your authenticator app" style={{ width: 200, background: "#fff", padding: 8, borderRadius: 8 }} dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="small">Can’t scan? Enter this key manually: <code style={{ userSelect: "all", wordBreak: "break-all" }}>{secret}</code></p>
        <form action={confirm}>
          <Field label="Code from your app" name="code">
            <input id="code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required />
          </Field>
          <button className="btn" type="submit">Turn on two-factor authentication</button>
        </form>
      </div>
    </div>
  );
}
