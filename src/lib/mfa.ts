import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { and, eq, gte, ne, sql } from "drizzle-orm";
import type { DB } from "@/db/client";
import { users, sessions, rateLimitHits } from "@/db/schema";
import { config } from "./config";
import { audit, userActor, type Actor } from "./audit";
import { keyedHash, randomToken, sha256 } from "./crypto";
import { generateTotpSecret, verifyTotp } from "./totp";

/** Staff roles must use a second factor (ENG-13); providers may turn one on (ENG-16). */
export const MFA_REQUIRED_ROLES = new Set(["admin", "reviewer"]);

/**
 * The stage a new session starts at: a code is needed whenever the account has a factor; staff
 * without one must set it up first; everyone else is signed in.
 */
export function initialStage(role: string, totpEnabledAt: Date | null): "full" | "mfa" | "enroll" {
  if (totpEnabledAt) return "mfa";
  return MFA_REQUIRED_ROLES.has(role) ? "enroll" : "full";
}

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

/**
 * Starts enrolment for ONE session: the new secret is stored on that session, not on the user, so
 * a second session (or an attacker holding a stolen password) cannot see or confirm it (review2 M1).
 */
export async function beginEnrollment(db: DB, userId: string, sessionId: string): Promise<string> {
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  if (!u) throw new Error("User not found");
  if (u.totpEnabledAt) throw new Error("Two-factor authentication is already set up");
  const secret = generateTotpSecret();
  const updated = await db
    .update(sessions)
    .set({ pendingTotpEnc: encryptSecret(secret) })
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
    .returning({ id: sessions.id });
  if (updated.length === 0) throw new Error("Session not found");
  return secret;
}

/** The enrolment secret shown to this session, if enrolment is still open. */
export async function pendingSecret(db: DB, userId: string, sessionId: string): Promise<string | null> {
  const [row] = await db
    .select({ enc: sessions.pendingTotpEnc, enabledAt: users.totpEnabledAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)));
  if (!row || row.enabledAt || !row.enc) return null;
  return decryptSecret(row.enc);
}

/** True once the user has a confirmed factor (an "enroll" session then has nothing to do). */
export async function mfaEnabled(db: DB, userId: string): Promise<boolean> {
  const [u] = await db.select({ at: users.totpEnabledAt }).from(users).where(eq(users.id, userId));
  return Boolean(u?.at);
}

// Failed codes only count against the limits, so a user who signs in often is never locked out (review2 L5).
const FAIL_LIMIT_PER_IP = 5; // per user and client, 15 minutes
const FAIL_LIMIT_PER_USER = 20; // per user from any client, 1 hour

async function failures(tx: Tx, key: string, windowSeconds: number, now: Date): Promise<number> {
  const [row] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(rateLimitHits)
    .where(and(eq(rateLimitHits.bucket, "mfa_fail"), eq(rateLimitHits.key, key), gte(rateLimitHits.createdAt, new Date(now.getTime() - windowSeconds * 1000))));
  return row?.n ?? 0;
}

type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

/**
 * Checks a code under a lock on the user row: ±1 step, never the same step twice, and refused after
 * too many recent failures. The caller passes the secret: the user's, or this session's pending one.
 */
async function checkCode(
  tx: Tx,
  u: typeof users.$inferSelect,
  secretEnc: string,
  code: string,
  ctx: { ip: string; now: Date },
): Promise<number | null> {
  const ipKey = keyedHash(`mfa:${u.id}:${ctx.ip}`);
  const userKey = keyedHash(`mfa:${u.id}`);
  if ((await failures(tx, ipKey, 900, ctx.now)) >= FAIL_LIMIT_PER_IP || (await failures(tx, userKey, 3600, ctx.now)) >= FAIL_LIMIT_PER_USER) return null;
  const step = verifyTotp(decryptSecret(secretEnc), code.trim(), ctx.now);
  if (step === null || (u.totpLastStep !== null && step <= u.totpLastStep)) {
    await tx.insert(rateLimitHits).values([
      { bucket: "mfa_fail", key: ipKey, createdAt: ctx.now },
      { bucket: "mfa_fail", key: userKey, createdAt: ctx.now },
    ]);
    return null;
  }
  return step;
}

export type MfaContext = { ip: string; now?: Date };

/**
 * Confirms enrolment from the session that started it. Refused if a factor is already on, so a
 * second session cannot replace it. On success every other session of the user ends.
 */
export async function confirmEnrollment(db: DB, userId: string, sessionId: string, code: string, ctx: MfaContext): Promise<boolean> {
  const now = ctx.now ?? new Date();
  const ok = await db.transaction(async (tx) => {
    const [u] = await tx.select().from(users).where(eq(users.id, userId)).for("update");
    if (!u || u.totpEnabledAt) return false;
    const [sess] = await tx.select().from(sessions).where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)));
    if (!sess?.pendingTotpEnc) return false;
    const step = await checkCode(tx, u, sess.pendingTotpEnc, code, { ip: ctx.ip, now });
    if (step === null) return false;
    await tx.update(users).set({ totpSecretEnc: sess.pendingTotpEnc, totpEnabledAt: now, totpLastStep: step }).where(eq(users.id, userId));
    await tx.update(sessions).set({ pendingTotpEnc: null }).where(eq(sessions.id, sessionId));
    await tx.delete(sessions).where(and(eq(sessions.userId, userId), ne(sessions.id, sessionId)));
    return true;
  });
  await audit(db, userActor(userId), ok ? "user.mfa_enabled" : "user.mfa_enroll_failed", "user", userId);
  return ok;
}

export async function verifyMfa(db: DB, userId: string, code: string, ctx: MfaContext): Promise<boolean> {
  const now = ctx.now ?? new Date();
  const ok = await db.transaction(async (tx) => {
    const [u] = await tx.select().from(users).where(eq(users.id, userId)).for("update");
    if (!u?.totpSecretEnc || !u.totpEnabledAt) return false;
    const step = await checkCode(tx, u, u.totpSecretEnc, code, { ip: ctx.ip, now });
    if (step === null) return false;
    await tx.update(users).set({ totpLastStep: step }).where(eq(users.id, userId));
    return true;
  });
  await audit(db, userActor(userId), ok ? "auth.mfa_passed" : "auth.mfa_failed", "user", userId);
  return ok;
}

/**
 * Upgrades a session after a passed check by replacing it with a new id (review2 L5): a token seen
 * before the second factor is worthless afterwards. Returns the new cookie token.
 */
export async function rotateSession(db: DB, sessionId: string, stage: "full"): Promise<string> {
  const token = randomToken();
  await db.transaction(async (tx) => {
    const [old] = await tx.delete(sessions).where(eq(sessions.id, sessionId)).returning();
    if (!old) throw new Error("Session not found");
    await tx.insert(sessions).values({ id: sha256(token), userId: old.userId, stage, expiresAt: old.expiresAt });
  });
  return token;
}

/**
 * Turns off an optional factor (providers only). Needs a current code, so a stolen session alone
 * cannot remove it. Staff can never turn theirs off.
 */
export async function disableMfa(db: DB, userId: string, code: string, ctx: MfaContext): Promise<"ok" | "bad_code" | "required"> {
  const now = ctx.now ?? new Date();
  const result = await db.transaction(async (tx) => {
    const [u] = await tx.select().from(users).where(eq(users.id, userId)).for("update");
    if (!u) return "bad_code" as const;
    if (MFA_REQUIRED_ROLES.has(u.role)) return "required" as const;
    if (!u.totpSecretEnc || !u.totpEnabledAt) return "bad_code" as const;
    if ((await checkCode(tx, u, u.totpSecretEnc, code, { ip: ctx.ip, now })) === null) return "bad_code" as const;
    await tx.update(users).set({ totpSecretEnc: null, totpEnabledAt: null, totpLastStep: null }).where(eq(users.id, userId));
    return "ok" as const;
  });
  if (result === "ok") await audit(db, userActor(userId), "user.mfa_disabled", "user", userId);
  return result;
}

/** Admin recovery: clears another user's factor and ends their sessions; they enrol again at next sign-in. */
export async function resetMfa(db: DB, actor: Actor, userId: string) {
  if (!actor.userId) throw new Error("A named admin is required");
  if (actor.userId === userId) throw new Error("Ask another admin to reset your two-factor authentication");
  const [admin] = await db.select({ role: users.role }).from(users).where(eq(users.id, actor.userId));
  if (admin?.role !== "admin") throw new Error("Only admins can reset two-factor authentication");
  const [target] = await db.select({ role: users.role, totpEnabledAt: users.totpEnabledAt }).from(users).where(eq(users.id, userId));
  if (!target) throw new Error("Account not found");
  if (!MFA_REQUIRED_ROLES.has(target.role) && !target.totpEnabledAt) throw new Error("This account has no two-factor authentication to reset");
  await db.transaction(async (tx) => {
    await tx.update(users).set({ totpSecretEnc: null, totpEnabledAt: null, totpLastStep: null }).where(eq(users.id, userId));
    await tx.delete(sessions).where(eq(sessions.userId, userId));
    await audit(tx, actor, "user.mfa_reset", "user", userId);
  });
}
