"use server";

import { getDb } from "@/db/client";
import { validateAssessment, type Answers } from "@/lib/assessment";
import { explainNoMatch } from "@/lib/matching";
import { getMatches, submitEnquiry } from "@/lib/enquiry";
import { clientIp } from "@/lib/session";
import { rateLimit } from "@/lib/ratelimit";
import { keyedHash } from "@/lib/crypto";
import { track } from "@/lib/analytics";
import { getProviderById } from "@/lib/providers";
import { ENQUIRY_CONSENT_VERSION, enquiryConsentText } from "@/lib/consent";

export type MatchView = {
  id: string;
  slug: string;
  name: string;
  score: number;
  reasons: { label: string; points: number }[];
  missingServices: string[];
  verified: string[];
  isSynthetic: boolean;
};

export type FindResult =
  | { ok: true; matches: MatchView[]; noMatchReasons: string[] }
  | { ok: false; errors: Record<string, string> };

const MATCH_LIMIT_PER_HOUR = 30;

export async function findMatchesAction(answers: Answers): Promise<FindResult> {
  const v = validateAssessment(answers);
  if (!v.ok) return { ok: false, errors: v.errors };
  const db = getDb();
  const now = new Date();
  // Each search records "matched" events that feed provider insights, so scripted searches are capped (review2 L2).
  const rl = await rateLimit(db, "match_ip", keyedHash(`match:${await clientIp()}`), MATCH_LIMIT_PER_HOUR, 3600, now);
  if (!rl.allowed) return { ok: false, errors: { form: "Too many searches from this connection. Try again in an hour." } };
  const result = await getMatches(db, v.value, now);
  await track(db, "assessment_completed", { service: v.value.services[0], emirate: v.value.emirate });
  if (result.matches.length === 0) {
    await track(db, "no_match", { service: v.value.services[0], emirate: v.value.emirate });
    return { ok: true, matches: [], noMatchReasons: explainNoMatch(result) };
  }
  await track(db, "matches_shown", { count: result.matches.length, service: v.value.services[0] });
  for (const m of result.matches) await track(db, "provider_matched", { orgId: m.candidateId, score: m.score });
  const views: MatchView[] = [];
  for (const m of result.matches) {
    const detail = await getProviderById(db, m.candidateId);
    views.push({
      id: m.candidateId,
      slug: m.slug,
      name: m.name,
      score: m.score,
      reasons: m.reasons.map((r) => ({ label: r.label, points: r.points })),
      missingServices: m.missingServices,
      verified: detail?.credentials.filter((c) => c.status === "verified").map((c) => c.credentialType) ?? [],
      isSynthetic: detail?.org.isSynthetic ?? false,
    });
  }
  return { ok: true, matches: views, noMatchReasons: [] };
}

/** Consent text is built from server-side names for the chosen ids, so it matches what is stored (review L11). */
export async function consentTextAction(providerIds: string[]): Promise<{ version: string; text: string }> {
  const db = getDb();
  const names: string[] = [];
  for (const id of providerIds.slice(0, 3)) {
    const p = await getProviderById(db, id);
    if (p) names.push(p.org.tradeName ?? p.org.legalName);
  }
  return { version: ENQUIRY_CONSENT_VERSION, text: enquiryConsentText(names) };
}

export type SubmitView =
  | { ok: true; ref: string; duplicate: boolean }
  | { ok: false; message: string; errors?: Record<string, string> };

export async function submitEnquiryAction(input: {
  answers: Answers;
  contact: Record<string, string>;
  providerIds: string[];
  consent: boolean;
  consentVersion: string;
  website: string; // honeypot
  startedAt: number;
}): Promise<SubmitView> {
  const res = await submitEnquiry(
    getDb(),
    {
      answers: input.answers,
      contact: input.contact,
      selectedProviderIds: input.providerIds,
      consentGiven: input.consent,
      consentVersion: input.consentVersion,
      honeypot: input.website,
      formStartedAt: input.startedAt,
    },
    { ip: await clientIp(), now: new Date() },
  );
  if (res.ok) return { ok: true, ref: res.ref, duplicate: res.duplicate };
  const messages: Record<typeof res.code, string> = {
    validation: "Please check the highlighted fields.",
    consent_required: "Please confirm you agree to share your details with the providers you chose.",
    rate_limited: "Too many enquiries from this connection. Please try again later.",
    rejected: "We could not accept this enquiry. If you believe this is a mistake, wait a moment and try again.",
    ineligible_selection: "One of the providers you chose can no longer receive enquiries. Please review your matches.",
  };
  return { ok: false, message: messages[res.code], errors: res.errors };
}
