import QRCode from "qrcode";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { clientIp, requireProvider, upgradeSession } from "@/lib/session";
import { beginEnrollment, confirmEnrollment, disableMfa, pendingSecret } from "@/lib/mfa";
import { otpauthUri } from "@/lib/totp";
import { BRAND } from "@/lib/brand";
import { Field } from "@/components/ui";
import { Flash, back } from "../_ui";

export const metadata = { title: "Security", robots: { index: false } };

const PATH = "/provider/security";
const code = (fd: FormData) => String(fd.get("code") ?? "");

/** Optional two-factor authentication for provider accounts (ENG-16). */
async function start() {
  "use server";
  const user = await requireProvider();
  try {
    await beginEnrollment(getDb(), user.id, user.sessionId);
  } catch {
    back(PATH, "error", "Two-factor authentication is already on.");
  }
  back(PATH, "notice", "Scan the code below, then enter the 6-digit code from your app.");
}

async function confirm(fd: FormData) {
  "use server";
  const user = await requireProvider();
  const ok = await confirmEnrollment(getDb(), user.id, user.sessionId, code(fd), { ip: await clientIp() });
  if (!ok) back(PATH, "error", "That code did not match. Check your device clock and try the current code.");
  await upgradeSession(user);
  back(PATH, "notice", "Two-factor authentication is on. Other devices were signed out.");
}

async function turnOff(fd: FormData) {
  "use server";
  const user = await requireProvider();
  const r = await disableMfa(getDb(), user.id, code(fd), { ip: await clientIp() });
  if (r !== "ok") back(PATH, "error", "That code did not work. Use the current code from your authenticator app.");
  back(PATH, "notice", "Two-factor authentication is off.");
}

export default async function Security({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const user = await requireProvider();
  const { notice, error } = await searchParams;
  const db = getDb();
  const [u] = await db.select({ totpEnabledAt: users.totpEnabledAt }).from(users).where(eq(users.id, user.id));
  const secret = u?.totpEnabledAt ? null : await pendingSecret(db, user.id, user.sessionId);
  const svg = secret ? await QRCode.toString(otpauthUri(BRAND.name, user.email, secret), { type: "svg", margin: 1, width: 200 }) : null;
  const codeField = (
    <Field label="Code from your app" name="code">
      <input id="code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required />
    </Field>
  );
  return (
    <div className="stack">
      <h1>Security</h1>
      <Flash notice={notice} error={error} />
      <section className="card stack" aria-labelledby="mfa-h">
        <h2 id="mfa-h">Two-factor authentication</h2>
        {u?.totpEnabledAt ? (
          <>
            <p>On since {u.totpEnabledAt.toISOString().slice(0, 10)}. Each sign-in asks for a code from your authenticator app.</p>
            <form action={turnOff}>
              {codeField}
              <button className="btn btn-secondary" type="submit">Turn off two-factor authentication</button>
            </form>
          </>
        ) : secret && svg ? (
          <>
            <p>Scan this code with an authenticator app (for example Google Authenticator, Microsoft Authenticator or 1Password), then enter the 6-digit code it shows.</p>
            <div role="img" aria-label="QR code for your authenticator app" className="qr-box" dangerouslySetInnerHTML={{ __html: svg }} />
            <p className="small">Can’t scan? Enter this key manually: <code data-testid="totp-key" style={{ userSelect: "all", wordBreak: "break-all" }}>{secret}</code></p>
            <form action={confirm}>
              {codeField}
              <button className="btn" type="submit">Turn on two-factor authentication</button>
            </form>
          </>
        ) : (
          <>
            <p>Off. Your account holds buyer enquiries, so a second factor is a good idea: a code from an authenticator app at each sign-in, as well as your password.</p>
            <form action={start}><button className="btn" type="submit">Set up two-factor authentication</button></form>
          </>
        )}
        <p className="small muted">Lost your device? Contact support. A staff member confirms who you are before resetting it.</p>
      </section>
    </div>
  );
}
