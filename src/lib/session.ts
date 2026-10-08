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

const COOKIE = "sid";
const TTL_HOURS = 12;

export type SessionUser = { id: string; email: string; name: string; role: "admin" | "reviewer" | "provider"; organizationId: string | null };

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
  await db.insert(sessions).values({ id: sha256(token), userId: u.id, expiresAt: new Date(Date.now() + TTL_HOURS * 3600_000) });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && !process.env.SITE_URL?.startsWith("http://"),
    path: "/",
    maxAge: TTL_HOURS * 3600,
  });
  await audit(db, userActor(u.id), "auth.login", "user", u.id);
  return { ok: true, user: { id: u.id, email: u.email, name: u.name, role: u.role, organizationId: u.organizationId } };
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
    .select({ u: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sha256(token)), gt(sessions.expiresAt, new Date())));
  if (!row || row.u.disabled) return null;
  return { id: row.u.id, email: row.u.email, name: row.u.name, role: row.u.role, organizationId: row.u.organizationId };
}

/** Server-side guard used by every privileged page and action. Unknown roles never pass. */
export async function requireRole(...roles: SessionUser["role"][]): Promise<SessionUser> {
  const u = await currentUser();
  if (!u) redirect("/login");
  if (!roles.includes(u.role)) redirect("/forbidden");
  return u;
}

export async function requireProvider(): Promise<SessionUser & { organizationId: string }> {
  const u = await requireRole("provider");
  if (!u.organizationId) redirect("/forbidden");
  return u as SessionUser & { organizationId: string };
}
