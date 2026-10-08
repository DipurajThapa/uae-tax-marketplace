import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import type { DB } from "@/db/client";
import { users, sessions } from "@/db/schema";
import { config } from "./config";
import { audit, userActor, type Actor } from "./audit";
import { rateLimit } from "./ratelimit";
import { generateTotpSecret, verifyTotp } from "./totp";

/** Staff roles must use a second factor (ENG-13). */
export const MFA_REQUIRED_ROLES = new Set(["admin", "reviewer"]);

const key = () => createHash("sha256").update(`totp-secret-key:${config.appSecret}`).digest();

export function encryptSecret(secret: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(secret, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64url")).join(".");
}

export function decryptSecret(stored: string): string {
  const [iv, tag, enc] = stored.split(".").map((p) => Buffer.from(p, "base64url"));
  if (!iv || !tag || !enc) throw new Error("Malformed secret");
  const d = createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}

/** Starts (or restarts) enrolment: stores a new, not-yet-enabled secret and returns it for display once. */
export async function beginEnrollment(db: DB, userId: string): Promise<string> {
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  if (!u) throw new Error("User not found");
  if (u.totpEnabledAt) throw new Error("Two-factor authentication is already set up");
  const secret = generateTotpSecret();
  await db.update(users).set({ totpSecretEnc: encryptSecret(secret) }).where(and(eq(users.id, userId), isNull(users.totpEnabledAt)));
  return secret;
}

export async function pendingSecret(db: DB, userId: string): Promise<string | null> {
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  if (!u || u.totpEnabledAt || !u.totpSecretEnc) return null;
  return decryptSecret(u.totpSecretEnc);
}

/** Verifies a code for this user: rate-limited, ±1 step, and never the same step twice. */
async function checkCode(db: DB, userId: string, code: string, now: Date, requireEnabled: boolean): Promise<boolean> {
  const rl = await rateLimit(db, "mfa", userId, 5, 900, now);
  if (!rl.allowed) return false;
  return db.transaction(async (tx) => {
    const [u] = await tx.select().from(users).where(eq(users.id, userId)).for("update");
    if (!u?.totpSecretEnc || (requireEnabled && !u.totpEnabledAt)) return false;
    const step = verifyTotp(decryptSecret(u.totpSecretEnc), code.trim(), now);
    if (step === null || (u.totpLastStep !== null && step <= u.totpLastStep)) return false;
    await tx
      .update(users)
      .set({ totpLastStep: step, ...(requireEnabled ? {} : { totpEnabledAt: now }) })
      .where(eq(users.id, userId));
    return true;
  });
}

export async function confirmEnrollment(db: DB, userId: string, code: string, now = new Date()): Promise<boolean> {
  const ok = await checkCode(db, userId, code, now, false);
  await audit(db, userActor(userId), ok ? "user.mfa_enabled" : "user.mfa_enroll_failed", "user", userId);
  return ok;
}

export async function verifyMfa(db: DB, userId: string, code: string, now = new Date()): Promise<boolean> {
  const ok = await checkCode(db, userId, code, now, true);
  await audit(db, userActor(userId), ok ? "auth.mfa_passed" : "auth.mfa_failed", "user", userId);
  return ok;
}

/** Moves a session to a new stage (e.g. "mfa" → "full") after a successful check. */
export async function setSessionStage(db: DB, sessionId: string, stage: "full" | "mfa" | "enroll") {
  await db.update(sessions).set({ stage }).where(eq(sessions.id, sessionId));
}

/** Admin recovery: clears another user's factor and ends their sessions; they enrol again at next sign-in. */
export async function resetMfa(db: DB, actor: Actor, userId: string) {
  if (!actor.userId) throw new Error("A named admin is required");
  if (actor.userId === userId) throw new Error("Ask another admin to reset your two-factor authentication");
  const [admin] = await db.select({ role: users.role }).from(users).where(eq(users.id, actor.userId));
  if (admin?.role !== "admin") throw new Error("Only admins can reset two-factor authentication");
  await db.transaction(async (tx) => {
    await tx.update(users).set({ totpSecretEnc: null, totpEnabledAt: null, totpLastStep: null }).where(eq(users.id, userId));
    await tx.delete(sessions).where(eq(sessions.userId, userId));
    await audit(tx, actor, "user.mfa_reset", "user", userId);
  });
}
