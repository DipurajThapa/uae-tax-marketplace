import { describe, it, expect } from "vitest";
import { matchProviders, scoreCandidate, coversService, explainNoMatch, WEIGHTS, type Candidate } from "@/lib/matching";
import type { Assessment } from "@/lib/assessment";

const base: Candidate = {
  id: "a", name: "Alpha", slug: "alpha", emirate: "dubai", listingStatus: "published", acceptingEnquiries: true, claimed: true,
  capacityRemaining: 5, services: ["vat-returns", "corporate-tax-returns"], jurisdictions: ["dubai-mainland"], languages: ["en", "ar"],
  industries: ["retail-ecommerce"], sizeBand: "10-49", credentials: [],
};
const ask = (o: Partial<Assessment> = {}): Assessment => ({
  services: ["vat-returns"], emirate: "dubai", languages: [], answers: { revenueBand: "1m-10m", employeesBand: "10-49" }, ...o,
});
const c = (o: Partial<Candidate>): Candidate => ({ ...base, ...o });

describe("eligibility", () => {
  it("excludes unpublished, unclaimed, paused and full providers with a reason", () => {
    const r = matchProviders(
      [c({ id: "1", listingStatus: "draft" }), c({ id: "2", claimed: false }), c({ id: "3", acceptingEnquiries: false }), c({ id: "4", capacityRemaining: 0 }), c({ id: "5", services: ["bookkeeping"] })],
      ask(),
    );
    expect(r.matches).toHaveLength(0);
    expect(r.exclusions.map((e) => e.reason)).toEqual(["not_listed", "unclaimed", "not_accepting", "at_capacity", "no_service_overlap"]);
  });

  it("requires a VERIFIED credential for regulated services; pending or expired does not count", () => {
    const svc = "fta-representation";
    const pending = c({ id: "p", services: [svc], credentials: [{ type: "FTA_TAX_AGENCY", status: "pending", holder: "organization" }] });
    const expired = c({ id: "e", services: [svc], credentials: [{ type: "FTA_TAX_AGENCY", status: "expired", holder: "organization" }] });
    const ok = c({ id: "v", services: [svc], credentials: [{ type: "FTA_TAX_AGENCY", status: "verified", holder: "organization" }] });
    const viaPerson = c({ id: "w", services: [svc], credentials: [{ type: "FTA_TAX_AGENT", status: "verified", holder: "professional" }] });
    const r = matchProviders([pending, expired, ok, viaPerson], ask({ services: [svc] }));
    expect(r.matches.map((m) => m.candidateId).sort()).toEqual(["v", "w"]);
    expect(r.exclusions.filter((e) => e.reason === "missing_required_credential")).toHaveLength(2);
  });

  it("an e-invoicing ASP service needs the MoF accreditation, not an FTA registration", () => {
    const fta = c({ services: ["einvoicing-asp"], credentials: [{ type: "FTA_TAX_AGENCY", status: "verified", holder: "organization" }] });
    expect(coversService(fta, "einvoicing-asp")).toBe(false);
    const asp = c({ services: ["einvoicing-asp"], credentials: [{ type: "MOF_EINVOICING_ASP", status: "verified", holder: "organization" }] });
    expect(coversService(asp, "einvoicing-asp")).toBe(true);
  });

  it("keeps a provider that covers some services, but reports what is missing", () => {
    const r = matchProviders([c({})], ask({ services: ["vat-returns", "transfer-pricing"] }));
    expect(r.matches[0]!.missingServices).toEqual(["transfer-pricing"]);
    expect(r.matches[0]!.coveredServices).toEqual(["vat-returns"]);
  });
});

describe("scoring", () => {
  it("is deterministic and bounded 0..100", () => {
    const a = ask({ languages: ["ar"], industry: "retail-ecommerce", jurisdiction: "dubai-mainland" });
    const s1 = scoreCandidate(c({ credentials: [{ type: "FTA_TAX_AGENCY", status: "verified", holder: "organization" }] }), a);
    const s2 = scoreCandidate(c({ credentials: [{ type: "FTA_TAX_AGENCY", status: "verified", holder: "organization" }] }), a);
    expect(s1).toEqual(s2);
    expect(s1.score).toBe(100);
    expect(s1.reasons.reduce((x, r) => x + r.points, 0)).toBe(100);
  });

  it("covering more requested services never lowers the score (monotonic)", () => {
    const a = ask({ services: ["vat-returns", "corporate-tax-returns", "bookkeeping"] });
    const one = scoreCandidate(c({ services: ["vat-returns"] }), a).score;
    const two = scoreCandidate(c({ services: ["vat-returns", "corporate-tax-returns"] }), a).score;
    const three = scoreCandidate(c({ services: ["vat-returns", "corporate-tax-returns", "bookkeeping"] }), a).score;
    expect(one).toBeLessThan(two);
    expect(two).toBeLessThan(three);
  });

  it("verified regulated registration beats an unverified one, other things equal", () => {
    const a = ask();
    const v = scoreCandidate(c({ credentials: [{ type: "FTA_TAX_AGENCY", status: "verified", holder: "organization" }] }), a).score;
    const u = scoreCandidate(c({ credentials: [{ type: "FTA_TAX_AGENCY", status: "unverified", holder: "organization" }] }), a).score;
    expect(v - u).toBe(WEIGHTS.verification);
  });

  it("language and industry give points only on a match when the buyer states a preference", () => {
    const a = ask({ languages: ["ml"], industry: "healthcare" });
    const s = scoreCandidate(c({}), a);
    expect(s.reasons.find((r) => r.code === "language")).toBeUndefined();
    expect(s.reasons.find((r) => r.code === "industry")).toBeUndefined();
  });

  it("orders by score, then name, then id", () => {
    const r = matchProviders([c({ id: "2", name: "Beta" }), c({ id: "1", name: "Alpha" }), c({ id: "3", name: "Alpha" })], ask());
    expect(r.matches.map((m) => m.candidateId)).toEqual(["1", "3", "2"]);
  });

  it("large buyers lose the size point with a 1-9 person firm", () => {
    const big = ask({ answers: { revenueBand: "gt-250m", employeesBand: "250+" } });
    expect(scoreCandidate(c({ sizeBand: "1-9" }), big).reasons.some((r) => r.code === "size_fit")).toBe(false);
    expect(scoreCandidate(c({ sizeBand: "50-249" }), big).reasons.some((r) => r.code === "size_fit")).toBe(true);
  });
});

describe("no-match explanation", () => {
  it("explains why nobody matched", () => {
    const r = matchProviders([c({ claimed: false }), c({ id: "x", capacityRemaining: 0 })], ask());
    const text = explainNoMatch(r).join(" ");
    expect(text).toMatch(/not yet claimed/);
    expect(text).toMatch(/not taking new enquiries/);
  });
  it("falls back to a generic message", () => {
    expect(explainNoMatch({ matches: [], exclusions: [] })[0]).toMatch(/No listed provider/);
  });
});
