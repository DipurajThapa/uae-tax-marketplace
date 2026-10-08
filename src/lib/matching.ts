import type { Assessment } from "./assessment";
import { SERVICE_BY_CODE, JURISDICTION_BY_CODE, LANGUAGE_BY_CODE, INDUSTRY_BY_CODE, CREDENTIAL_BY_CODE } from "./taxonomy";

/**
 * Pure, deterministic, explainable matching. No IO, no clock, no randomness.
 * Paid promotion never changes eligibility or score: sponsored placements are shown
 * separately and labelled.
 */

export type CandidateCredential = { type: string; status: string; holder: "organization" | "professional" };

export type Candidate = {
  id: string;
  name: string;
  slug: string;
  emirate: string;
  listingStatus: string;
  acceptingEnquiries: boolean;
  claimed: boolean; // only providers who control their listing can receive enquiries
  capacityRemaining: number; // leads the provider can still receive this period
  services: string[];
  jurisdictions: string[];
  languages: string[];
  industries: string[];
  sizeBand: string | null;
  credentials: CandidateCredential[];
};

export type Reason = { code: string; label: string; points: number };

export type Match = {
  candidateId: string;
  name: string;
  slug: string;
  score: number;
  reasons: Reason[];
  coveredServices: string[];
  missingServices: string[];
};

export type Exclusion = { candidateId: string; reason: ExclusionReason };
export type ExclusionReason =
  | "not_listed"
  | "unclaimed"
  | "not_accepting"
  | "at_capacity"
  | "no_service_overlap"
  | "missing_required_credential";

export type MatchResult = { matches: Match[]; exclusions: Exclusion[] };

export const WEIGHTS = { services: 45, location: 15, language: 10, industry: 10, verification: 15, size: 5 } as const;

export const MAX_RECIPIENTS = 3;

const verified = (c: Candidate, type: string) => c.credentials.some((x) => x.type === type && x.status === "verified");

/** A provider "covers" a service if it offers it and, for regulated services, holds a verified required credential. */
export function coversService(c: Candidate, serviceCode: string): boolean {
  if (!c.services.includes(serviceCode)) return false;
  const req = SERVICE_BY_CODE[serviceCode]?.requiredCredentialTypes ?? [];
  return req.length === 0 || req.some((t) => verified(c, t));
}

function eligibility(c: Candidate, a: Assessment): ExclusionReason | null {
  if (c.listingStatus !== "published") return "not_listed";
  if (!c.claimed) return "unclaimed";
  if (!c.acceptingEnquiries) return "not_accepting";
  if (c.capacityRemaining <= 0) return "at_capacity";
  const offered = a.services.filter((s) => c.services.includes(s));
  if (offered.length === 0) return "no_service_overlap";
  if (!offered.some((s) => coversService(c, s))) return "missing_required_credential";
  return null;
}

const LARGE_REVENUE = new Set(["50m-250m", "gt-250m"]);
const LARGE_STAFF = new Set(["250+"]);
const SMALL_FIRM = new Set(["1-9"]);

export function scoreCandidate(c: Candidate, a: Assessment): Match {
  const reasons: Reason[] = [];
  const covered = a.services.filter((s) => coversService(c, s));
  const missing = a.services.filter((s) => !covered.includes(s));

  const servicePts = Math.round((WEIGHTS.services * covered.length) / a.services.length);
  reasons.push({
    code: "services",
    label:
      missing.length === 0
        ? `Offers all ${covered.length} requested service${covered.length === 1 ? "" : "s"}`
        : `Offers ${covered.length} of ${a.services.length} requested services`,
    points: servicePts,
  });

  // Location is a preference, not a filter: UAE federal taxes are not emirate-specific.
  let locPts = 0;
  if (a.jurisdiction && c.jurisdictions.includes(a.jurisdiction)) {
    locPts = WEIGHTS.location;
    reasons.push({ code: "jurisdiction", label: `Serves ${JURISDICTION_BY_CODE[a.jurisdiction]?.name ?? a.jurisdiction}`, points: locPts });
  } else if (c.emirate === a.emirate || c.jurisdictions.some((j) => JURISDICTION_BY_CODE[j]?.emirate === a.emirate)) {
    locPts = a.jurisdiction ? Math.round(WEIGHTS.location * 0.66) : WEIGHTS.location;
    reasons.push({ code: "emirate", label: "Based in or serves your emirate", points: locPts });
  }

  if (a.languages.length === 0) {
    reasons.push({ code: "language_neutral", label: "No language preference given", points: WEIGHTS.language });
  } else {
    const common = a.languages.filter((l) => c.languages.includes(l));
    if (common.length) {
      reasons.push({
        code: "language",
        label: `Speaks ${common.map((l) => LANGUAGE_BY_CODE[l]?.name ?? l).join(", ")}`,
        points: WEIGHTS.language,
      });
    }
  }

  if (!a.industry) {
    reasons.push({ code: "industry_neutral", label: "No industry given", points: WEIGHTS.industry });
  } else if (c.industries.includes(a.industry)) {
    reasons.push({ code: "industry", label: `Lists ${INDUSTRY_BY_CODE[a.industry]?.name ?? a.industry} experience`, points: WEIGHTS.industry });
  }

  const regulatedVerified = c.credentials.filter((x) => x.status === "verified" && CREDENTIAL_BY_CODE[x.type]?.regulated);
  const otherVerified = c.credentials.filter((x) => x.status === "verified" && !CREDENTIAL_BY_CODE[x.type]?.regulated);
  if (regulatedVerified.length) {
    const names = [...new Set(regulatedVerified.map((x) => CREDENTIAL_BY_CODE[x.type]?.name ?? x.type))];
    reasons.push({ code: "verified_registration", label: `Verified: ${names.join(", ")}`, points: WEIGHTS.verification });
  } else if (otherVerified.length) {
    reasons.push({ code: "verified_qualification", label: "Verified professional qualification", points: Math.round(WEIGHTS.verification / 2) });
  }

  const large = LARGE_REVENUE.has(a.answers.revenueBand ?? "") || LARGE_STAFF.has(a.answers.employeesBand ?? "");
  if (!large || (c.sizeBand && !SMALL_FIRM.has(c.sizeBand))) {
    reasons.push({ code: "size_fit", label: large ? "Firm size suits a larger business" : "Firm size suits your business", points: WEIGHTS.size });
  }

  const score = Math.min(100, reasons.reduce((s, r) => s + r.points, 0));
  return { candidateId: c.id, name: c.name, slug: c.slug, score, reasons, coveredServices: covered, missingServices: missing };
}

export function matchProviders(candidates: Candidate[], a: Assessment, limit = 10): MatchResult {
  const exclusions: Exclusion[] = [];
  const matches: Match[] = [];
  for (const c of candidates) {
    const why = eligibility(c, a);
    if (why) exclusions.push({ candidateId: c.id, reason: why });
    else matches.push(scoreCandidate(c, a));
  }
  matches.sort((x, y) => y.score - x.score || x.name.localeCompare(y.name) || x.candidateId.localeCompare(y.candidateId));
  return { matches: matches.slice(0, limit), exclusions };
}

/** Human explanation when nothing matched, derived from the exclusion counts. */
export function explainNoMatch(r: MatchResult): string[] {
  const count = (reason: ExclusionReason) => r.exclusions.filter((e) => e.reason === reason).length;
  const out: string[] = [];
  if (count("missing_required_credential"))
    out.push(`${count("missing_required_credential")} provider(s) offer this service but do not yet have a verified registration that it requires.`);
  if (count("at_capacity")) out.push(`${count("at_capacity")} provider(s) offering this service are not taking new enquiries this month.`);
  if (count("not_accepting")) out.push(`${count("not_accepting")} provider(s) have paused new enquiries.`);
  if (count("unclaimed")) out.push(`${count("unclaimed")} listed provider(s) offer this service but have not yet claimed their listing, so they cannot receive enquiries through the directory.`);
  if (out.length === 0) out.push("No listed provider offers the services you selected yet.");
  return out;
}
