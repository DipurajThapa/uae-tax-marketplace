import { totp, stepAt, hotp, base32Decode } from "../src/lib/totp";

/** Throwaway TOTP secrets for E2E staff fixtures only (test database). One per account, so codes never collide. */
export const E2E_TOTP_SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
export const E2E_TOTP_SECRETS: Record<string, string> = {
  "admin@e2e.invalid": "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
  "reviewer@e2e.invalid": "KRSXG5CTMVRXEZLUKN2XAZLSKNSWG4TF",
};

const lastStep = new Map<string, number>();

/** A code the server will accept: never reuse a step (server rejects replays), at most one step ahead. */
export async function nextCode(secret = E2E_TOTP_SECRET): Promise<string> {
  for (;;) {
    const now = stepAt(new Date());
    const step = Math.max(now, (lastStep.get(secret) ?? -1) + 1);
    if (step <= now + 1) {
      lastStep.set(secret, step);
      return step === now ? totp(secret, new Date()) : hotp(base32Decode(secret), step);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}
