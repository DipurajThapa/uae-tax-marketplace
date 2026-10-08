/**
 * Private staging (owner-approved 2026-10-08): every page needs HTTP Basic credentials from the
 * STAGING_BASIC_AUTH secret ("user:password"). Fail closed: a staging deploy without the secret,
 * or with a weak one, serves nothing.
 */
export type GateResult = "open" | "allow" | "challenge" | "misconfigured";

const MIN_PASSWORD = 16;

/** Constant-time string comparison (no early exit on the first differing byte). */
function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export function stagingGate(env: { APP_ENV?: string; STAGING_BASIC_AUTH?: string }, authorization: string | null): GateResult {
  if (env.APP_ENV !== "staging") return "open";
  const expected = env.STAGING_BASIC_AUTH ?? "";
  const sep = expected.indexOf(":");
  if (sep < 1 || expected.length - sep - 1 < MIN_PASSWORD) return "misconfigured";
  if (!authorization?.startsWith("Basic ")) return "challenge";
  let given: string;
  try {
    given = atob(authorization.slice(6).trim());
  } catch {
    return "challenge";
  }
  return safeEqual(given, expected) ? "allow" : "challenge";
}
