/**
 * Break-glass: clear a staff user's second factor and end their sessions (ops runbook "Lost MFA device").
 * Usage: npx tsx scripts/reset-mfa.ts <email>. Run only from a trusted operator shell; the action is audited.
 */
import { eq } from "drizzle-orm";
import { loadEnv } from "./env";
loadEnv();
const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("usage: reset-mfa.ts <email>");
  process.exit(1);
}
const { getDb, closeDb } = await import("../src/db/client");
const s = await import("../src/db/schema");
const { audit, SYSTEM } = await import("../src/lib/audit");
const db = getDb();
const [u] = await db.select().from(s.users).where(eq(s.users.email, email));
if (!u) {
  console.error("no such user");
  process.exit(1);
}
await db.transaction(async (tx) => {
  await tx.update(s.users).set({ totpSecretEnc: null, totpEnabledAt: null, totpLastStep: null }).where(eq(s.users.id, u.id));
  await tx.delete(s.sessions).where(eq(s.sessions.userId, u.id));
  await audit(tx, SYSTEM, "user.mfa_reset_breakglass", "user", u.id, { via: "cli" });
});
console.log(`two-factor reset for ${email}; they will enrol again at next sign-in`);
await closeDb();
