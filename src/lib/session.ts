import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sessions, users } from "@/db/schema";
import { randomToken, sha256, verifyPassword, keyedHash } from "./crypto";
import { normalizeEmail } from "./text";
import { rateLimit } from "./ratelimit";
import { audit, userActor, PUBLIC } from "./audit";
import { initialStage, rotateSession } from "./mfa";

const COOKIE = "sid";
const TTL_HOURS = 12;

export type SessionStage = "full" | "mfa" | "enroll";
export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "reviewer" | "provider";
  organizationId: string | null;
  /** "full" unless the user still has to pass two-factor authentication, or (staff) set it up (ENG-13/16). */
  stage: SessionStage;
  sessionId: string;
};

/**
 * Client IP for rate limiting. X-Forwarded-For is client-controlled except for the entries appended
 * by our own proxies, so we take the entry TRUSTED_PROXY_HOPS from the right (default 1: one reverse
 * proxy in front of the app). Spoofed values the client prepends are ignored.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const hops = Math.max(0, Number.parseInt(process.env.TRUSTED_PROXY_HOPS ?? "1", 10) || 0);
  const chain = (h.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (hops > 0 && chain.length >= hops) return chain[chain.length - hops]!;
  return "unknown";
}

export async function login(emailRaw: string, password: string): Promise<{ ok: true; user: SessionUser } | { ok: false; error: string }> {
  const db = getDb();
  const email = normalizeEmail(emailRaw);
  const ip = await clientIp();
  const rl = await rateLimit(db, "login", keyedHash(`login:${ip}:${email}`), 10, 900);
  // Per-account limit too, so rotating IPs cannot brute-force one account.
  const perAccount = await rateLimit(db, "login_account", keyedHash(`login-acct:${email}`), 20, 3600);
  if (!rl.allowed || !perAccount.allowed) return { ok: false, error: "Too many attempts. Try again later." };
  const [u] = await db.select().from(users).where(eq(users.email, email));
  // Constant-ish work whether or not the user exists.
  const valid = u ? await verifyPassword(password, u.passwordHash) : await verifyPassword(password, "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
  if (!u || !valid || u.disabled) {
    await audit(db, PUBLIC, "auth.login_failed", "user", null, { emailHash: keyedHash(email) });
    return { ok: false, error: "Email or password is incorrect" };
  }
  const token = randomToken();
  const stage: SessionStage = initialStage(u.role, u.totpEnabledAt);
  await db.insert(sessions).values({ id: sha256(token), userId: u.id, stage, expiresAt: new Date(Date.now() + TTL_HOURS * 3600_000) });
  await setCookie(token, TTL_HOURS * 3600);
  await audit(db, userActor(u.id), "auth.login", "user", u.id);
  return { ok: true, user: { id: u.id, email: u.email, name: u.name, role: u.role, organizationId: u.organizationId, stage, sessionId: sha256(token) } };
}

async function setCookie(token: string, maxAgeSeconds: number) {
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && !process.env.SITE_URL?.startsWith("http://"),
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

/** After the second factor: replace the session with a fresh id at stage "full" (review2 L5). */
export async function upgradeSession(user: SessionUser): Promise<void> {
  const db = getDb();
  const [s] = await db.select({ expiresAt: sessions.expiresAt }).from(sessions).where(eq(sessions.id, user.sessionId));
  if (!s) redirect("/login");
  const token = await rotateSession(db, user.sessionId, "full");
  await setCookie(token, Math.max(60, Math.floor((s.expiresAt.getTime() - Date.now()) / 1000)));
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await getDb().delete(sessions).where(eq(sessions.id, sha256(token)));
  jar.delete(COOKIE);
}

export async function currentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [row] = await getDb()
    .select({ u: users, s: sessions })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sha256(token)), gt(sessions.expiresAt, new Date())));
  if (!row || row.u.disabled) return null;
  return { id: row.u.id, email: row.u.email, name: row.u.name, role: row.u.role, organizationId: row.u.organizationId, stage: row.s.stage as SessionStage, sessionId: row.s.id };
}

/** Server-side guard used by every privileged page and action. Unknown roles never pass. */
export async function requireRole(...roles: SessionUser["role"][]): Promise<SessionUser> {
  const u = await currentUser();
  if (!u) redirect("/login");
  // Staff must finish the second factor before any privileged page or action (ENG-13).
  if (u.stage === "mfa") redirect("/login/mfa");
  if (u.stage === "enroll") redirect("/account/mfa-setup");
  if (!roles.includes(u.role)) redirect("/forbidden");
  return u;
}

export async function requireProvider(): Promise<SessionUser & { organizationId: string }> {
  const u = await requireRole("provider");
  if (!u.organizationId) redirect("/forbidden");
  return u as SessionUser & { organizationId: string };
}
