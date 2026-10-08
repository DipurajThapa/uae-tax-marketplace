/** Deterministic spam heuristics. Score >= SPAM_THRESHOLD is rejected or quarantined. */
export const SPAM_THRESHOLD = 5;

export type SpamSignals = {
  honeypot: string | undefined;
  formStartedAt: number | undefined; // ms epoch from the form render
  now: number;
  message: string | undefined;
  email: string;
  name: string;
};

const DISPOSABLE = ["mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com", "trashmail.com", "yopmail.com"];

export function spamScore(s: SpamSignals): { score: number; signals: string[] } {
  const signals: string[] = [];
  let score = 0;
  if (s.honeypot && s.honeypot.trim() !== "") { score += 10; signals.push("honeypot"); }
  if (!s.formStartedAt || !Number.isFinite(s.formStartedAt)) { score += 2; signals.push("no_timestamp"); }
  else {
    const elapsed = s.now - s.formStartedAt;
    if (elapsed < 3000) { score += 5; signals.push("too_fast"); }
    if (elapsed > 1000 * 60 * 60 * 24) { score += 1; signals.push("stale_form"); }
  }
  const msg = s.message ?? "";
  const links = (msg.match(/https?:\/\//gi) ?? []).length;
  if (links >= 2) { score += 3; signals.push("links"); }
  if (/\b(viagra|casino|crypto giveaway|seo services|backlinks)\b/i.test(msg)) { score += 5; signals.push("keywords"); }
  const domain = s.email.split("@").pop()?.toLowerCase() ?? "";
  if (DISPOSABLE.includes(domain)) { score += 3; signals.push("disposable_email"); }
  if (/https?:\/\//i.test(s.name)) { score += 5; signals.push("url_in_name"); }
  return { score, signals };
}
