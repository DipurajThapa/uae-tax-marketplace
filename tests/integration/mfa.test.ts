import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { getDb, closeDb } from "@/db/client";
import * as s from "@/db/schema";
import { beginEnrollment, confirmEnrollment, verifyMfa, resetMfa, encryptSecret, decryptSecret, pendingSecret, rotateSession } from "@/lib/mfa";
import { sha256 } from "@/lib/crypto";
import { totp } from "@/lib/totp";
import { userActor } from "@/lib/audit";
import { resetDb, makeUser } from "./helpers";

const db = getDb();
beforeEach(resetDb);
afterAll(closeDb);

const session = async (userId: string, id: string, stage = "enroll") => {
  await db.insert(s.sessions).values({ id, userId, stage, expiresAt: new Date(Date.now() + 3600_000) });
  return id;
};
const ctx = (now: Date, ip = "203.0.113.1") => ({ ip, now });

describe("ENG-13 staff two-factor authentication", () => {
  it("keeps the enrolment secret on the session, encrypted, and enables only after a correct code", async () => {
    const u = await makeUser("admin", "a@example.invalid");
    const sid = await session(u.id, "sess-a");
    const secret = await beginEnrollment(db, u.id, sid);
    const [row] = await db.select().from(s.sessions).where(eq(s.sessions.id, sid));
    expect(row!.pendingTotpEnc).not.toContain(secret);
    expect(decryptSecret(row!.pendingTotpEnc!)).toBe(secret);
    expect(await pendingSecret(db, u.id, sid)).toBe(secret);
    const [user] = await db.select().from(s.users).where(eq(s.users.id, u.id));
    expect(user!.totpSecretEnc).toBeNull();
    const now = new Date();
    const wrong = totp(secret, now) === "000000" ? "111111" : "000000";
    expect(await confirmEnrollment(db, u.id, sid, wrong, ctx(now))).toBe(false);
    expect(await confirmEnrollment(db, u.id, sid, totp(secret, now), ctx(now))).toBe(true);
    const [after] = await db.select().from(s.users).where(eq(s.users.id, u.id));
    expect(after!.totpEnabledAt).not.toBeNull();
    expect(decryptSecret(after!.totpSecretEnc!)).toBe(secret);
    await expect(beginEnrollment(db, u.id, sid)).rejects.toThrow(/already/);
  });

  it("review2 M1: a second session cannot see, confirm or replace the factor", async () => {
    const u = await makeUser("admin", "a@example.invalid");
    const mine = await session(u.id, "sess-mine");
    const theirs = await session(u.id, "sess-theirs");
    const secret = await beginEnrollment(db, u.id, mine);
    expect(await pendingSecret(db, u.id, theirs)).toBeNull();
    const now = new Date();
    // The other session cannot confirm with a code from my secret.
    expect(await confirmEnrollment(db, u.id, theirs, totp(secret, now), ctx(now))).toBe(false);
    // The other session starts its own enrolment; mine still confirms with my secret.
    const otherSecret = await beginEnrollment(db, u.id, theirs);
    expect(otherSecret).not.toBe(secret);
    expect(await confirmEnrollment(db, u.id, mine, totp(secret, now), ctx(now))).toBe(true);
    // Every other session ends when the factor is turned on, and it cannot be confirmed twice.
    expect(await db.select().from(s.sessions).where(eq(s.sessions.id, theirs))).toHaveLength(0);
    const third = await session(u.id, "sess-third");
    await db.update(s.sessions).set({ pendingTotpEnc: encryptSecret(otherSecret) }).where(eq(s.sessions.id, third));
    const later = new Date(now.getTime() + 60_000);
    expect(await confirmEnrollment(db, u.id, third, totp(otherSecret, later), ctx(later))).toBe(false);
    const [row] = await db.select().from(s.users).where(eq(s.users.id, u.id));
    expect(decryptSecret(row!.totpSecretEnc!)).toBe(secret);
  });

  it("rejects a replayed code and limits failed guesses only (review2 L5)", async () => {
    const u = await makeUser("reviewer", "r@example.invalid");
    const secret = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
    await db.update(s.users).set({ totpSecretEnc: encryptSecret(secret), totpEnabledAt: new Date() }).where(eq(s.users.id, u.id));
    const t0 = new Date();
    // Many successful sign-ins never lock the account.
    for (let i = 0; i < 8; i++) {
      const t = new Date(t0.getTime() + i * 30_000);
      expect(await verifyMfa(db, u.id, totp(secret, t), ctx(t))).toBe(true);
    }
    const now = new Date(t0.getTime() + 8 * 30_000);
    const code = totp(secret, now);
    expect(await verifyMfa(db, u.id, code, ctx(now))).toBe(true);
    expect(await verifyMfa(db, u.id, code, ctx(now))).toBe(false); // replay
    const bad = code === "111111" ? "222222" : "111111";
    for (let i = 0; i < 4; i++) await verifyMfa(db, u.id, bad, ctx(now));
    const later = new Date(now.getTime() + 30_000);
    // Five failures from this client lock it out (the replay counted as one) ...
    expect(await verifyMfa(db, u.id, totp(secret, later), ctx(later))).toBe(false);
    // ... but not another client, until the per-user limit is reached.
    expect(await verifyMfa(db, u.id, totp(secret, later), ctx(later, "198.51.100.7"))).toBe(true);
    const t2 = new Date(later.getTime() + 30_000);
    for (let i = 0; i < 20; i++) await verifyMfa(db, u.id, bad, ctx(t2, `192.0.2.${i}`));
    expect(await verifyMfa(db, u.id, totp(secret, t2), ctx(t2, "192.0.2.200"))).toBe(false);
  });

  it("review2 L5: passing the check replaces the session id", async () => {
    const u = await makeUser("admin", "a@example.invalid");
    const sid = await session(u.id, "sess-old", "mfa");
    const token = await rotateSession(db, sid, "full");
    expect(await db.select().from(s.sessions).where(eq(s.sessions.id, sid))).toHaveLength(0);
    const [fresh] = await db.select().from(s.sessions).where(eq(s.sessions.id, sha256(token)));
    expect(fresh!.stage).toBe("full");
    expect(fresh!.userId).toBe(u.id);
  });

  it("only another admin can reset a staff factor; reset ends sessions", async () => {
    const a = await makeUser("admin", "a@example.invalid");
    const b = await makeUser("admin", "b@example.invalid");
    const rev = await makeUser("reviewer", "r@example.invalid");
    const prov = await makeUser("provider", "p@example.invalid");
    await db.update(s.users).set({ totpSecretEnc: encryptSecret("JBSWY3DPEHPK3PXP"), totpEnabledAt: new Date() }).where(eq(s.users.id, b.id));
    await session(b.id, "sess-b", "full");
    await expect(resetMfa(db, userActor(b.id), b.id)).rejects.toThrow(/another admin/);
    await expect(resetMfa(db, userActor(rev.id), b.id)).rejects.toThrow(/Only admins/);
    await expect(resetMfa(db, userActor(a.id), prov.id)).rejects.toThrow(/staff account/);
    await expect(resetMfa(db, userActor(a.id), "00000000-0000-0000-0000-000000000000")).rejects.toThrow(/staff account/);
    await resetMfa(db, userActor(a.id), b.id);
    const [row] = await db.select().from(s.users).where(eq(s.users.id, b.id));
    expect(row!.totpEnabledAt).toBeNull();
    expect(await db.select().from(s.sessions).where(eq(s.sessions.userId, b.id))).toHaveLength(0);
  });

  it("review2 L1: a session row without an explicit stage is not signed in", async () => {
    const u = await makeUser("admin", "a@example.invalid");
    await db.insert(s.sessions).values({ id: "sess-default", userId: u.id, expiresAt: new Date(Date.now() + 3600_000) });
    const [row] = await db.select().from(s.sessions).where(eq(s.sessions.id, "sess-default"));
    expect(row!.stage).toBe("mfa");
  });
});
