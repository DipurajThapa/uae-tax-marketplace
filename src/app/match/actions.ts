"use server";

import { getDb } from "@/db/client";
import { validateAssessment, type Answers } from "@/lib/assessment";
import { explainNoMatch } from "@/lib/matching";
import { getMatches, submitEnquiry } from "@/lib/enquiry";
import { clientIp } from "@/lib/session";
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

export async function findMatchesAction(answers: Answers): Promise<FindResult> {
  const v = validateAssessment(answers);
  if (!v.ok) return { ok: false, errors: v.errors };
  const db = getDb();
  const now = new Date();
  const result = await getMatches(db, v.value, now);
  await track(db, "assessment_completed", { service: v.value.services[0], emirate: v.value.emirate });
  if (result.matches.length === 0) {
    await track(db, "no_match", { service: v.value.services[0], emirate: v.value.emirate });
    return { ok: true, matches: [], noMatchReasons: explainNoMatch(result) };
  }
  await track(db, "matches_shown", { count: result.matches.length, service: v.value.services[0] });
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

export async function consentTextAction(names: string[]): Promise<{ version: string; text: string }> {
  return { version: ENQUIRY_CONSENT_VERSION, text: enquiryConsentText(names.slice(0, 3).map((n) => n.slice(0, 200))) };
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
