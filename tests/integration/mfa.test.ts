import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { getDb, closeDb } from "@/db/client";
import * as s from "@/db/schema";
import { beginEnrollment, confirmEnrollment, verifyMfa, resetMfa, encryptSecret, decryptSecret } from "@/lib/mfa";
import { totp } from "@/lib/totp";
import { userActor } from "@/lib/audit";
import { resetDb, makeUser } from "./helpers";

const db = getDb();
beforeEach(resetDb);
afterAll(closeDb);

describe("ENG-13 staff two-factor authentication", () => {
  it("stores the secret encrypted and enables only after a correct code", async () => {
    const u = await makeUser("admin", "a@example.invalid");
    const secret = await beginEnrollment(db, u.id);
    const [row] = await db.select().from(s.users).where(eq(s.users.id, u.id));
    expect(row!.totpSecretEnc).not.toContain(secret);
    expect(decryptSecret(row!.totpSecretEnc!)).toBe(secret);
    expect(row!.totpEnabledAt).toBeNull();
    const now = new Date();
    expect(await confirmEnrollment(db, u.id, "000000", now)).toBe(totp(secret, now) === "000000");
    expect(await confirmEnrollment(db, u.id, totp(secret, now), now)).toBe(true);
    await expect(beginEnrollment(db, u.id)).rejects.toThrow(/already/);
  });

  it("rejects a replayed code and rate-limits guessing", async () => {
    const u = await makeUser("reviewer", "r@example.invalid");
    const secret = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
    await db.update(s.users).set({ totpSecretEnc: encryptSecret(secret), totpEnabledAt: new Date() }).where(eq(s.users.id, u.id));
    const now = new Date();
    const code = totp(secret, now);
    expect(await verifyMfa(db, u.id, code, now)).toBe(true);
    expect(await verifyMfa(db, u.id, code, now)).toBe(false); // replay
    for (let i = 0; i < 5; i++) await verifyMfa(db, u.id, "111111", now);
    const later = new Date(now.getTime() + 30_000);
    expect(await verifyMfa(db, u.id, totp(secret, later), later)).toBe(false); // locked out by rate limit
  });

  it("only another admin can reset a factor; reset ends sessions", async () => {
    const a = await makeUser("admin", "a@example.invalid");
    const b = await makeUser("admin", "b@example.invalid");
    const rev = await makeUser("reviewer", "r@example.invalid");
    await db.update(s.users).set({ totpSecretEnc: encryptSecret("JBSWY3DPEHPK3PXP"), totpEnabledAt: new Date() }).where(eq(s.users.id, b.id));
    await db.insert(s.sessions).values({ id: "sess-b", userId: b.id, expiresAt: new Date(Date.now() + 3600_000) });
    await expect(resetMfa(db, userActor(b.id), b.id)).rejects.toThrow(/another admin/);
    await expect(resetMfa(db, userActor(rev.id), b.id)).rejects.toThrow(/Only admins/);
    await resetMfa(db, userActor(a.id), b.id);
    const [row] = await db.select().from(s.users).where(eq(s.users.id, b.id));
    expect(row!.totpEnabledAt).toBeNull();
    expect(await db.select().from(s.sessions).where(eq(s.sessions.userId, b.id))).toHaveLength(0);
  });
});
