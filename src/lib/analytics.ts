import type { DB } from "@/db/client";
import { analyticsEvents } from "@/db/schema";

/**
 * First-party, cookieless product analytics. Only whitelisted, non-personal properties
 * are stored, so funnel metrics never become a second copy of lead data.
 */
export const EVENTS = [
  "search_performed",
  "profile_viewed",
  "assessment_started",
  "assessment_completed",
  "matches_shown",
  "no_match",
  "enquiry_submitted",
  "enquiry_rejected",
  "claim_submitted",
  "recipient_accepted",
  "recipient_declined",
] as const;
export type EventName = (typeof EVENTS)[number];

const ALLOWED_PROPS = new Set(["service", "emirate", "count", "orgId", "reason", "score", "results", "category", "sponsored"]);

export function sanitizeProps(props: Record<string, unknown>): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(props)) {
    if (!ALLOWED_PROPS.has(k)) continue;
    if (typeof v === "number" || typeof v === "boolean") out[k] = v;
    else if (typeof v === "string" && v.length <= 64 && !v.includes("@")) out[k] = v;
  }
  return out;
}

export async function track(db: DB, name: EventName, props: Record<string, unknown> = {}): Promise<void> {
  try {
    await db.insert(analyticsEvents).values({ name, props: sanitizeProps(props) });
  } catch {
    // analytics must never break a user journey
  }
}
