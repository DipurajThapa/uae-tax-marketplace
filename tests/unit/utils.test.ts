import { describe, it, expect } from "vitest";
import { normalizeName, slugify, similarity, domainOf } from "@/lib/text";
import { spamScore, SPAM_THRESHOLD } from "@/lib/spam";
import { parseCsv, findDuplicate } from "@/lib/importer";
import { renderMarkdown } from "@/lib/markdown";
import { sanitizeProps } from "@/lib/analytics";

describe("text", () => {
  it("normalises legal suffixes and punctuation for duplicate detection", () => {
    expect(normalizeName("Alpha Tax Consultants L.L.C.")).toBe(normalizeName("ALPHA TAX CONSULTANTS LLC"));
    expect(normalizeName("Smith & Co FZE")).toBe(normalizeName("Smith and Co"));
  });
  it("slugifies", () => expect(slugify("Ñice Tax & Audit LLC!")).toBe("nice-tax-and-audit-llc"));
  it("similarity", () => {
    expect(similarity("abc", "abc")).toBe(1);
    expect(similarity("meridian tax", "meridian taxx")).toBeGreaterThan(0.9);
  });
  it("domainOf handles URLs and emails", () => {
    expect(domainOf("https://www.Example.ae/about")).toBe("example.ae");
    expect(domainOf("jo@example.ae")).toBe("example.ae");
    expect(domainOf("")).toBeNull();
  });
});

describe("spam", () => {
  const ok = { honeypot: "", formStartedAt: 0, now: 60_000, message: "Need VAT help", email: "a@corp.ae", name: "Jo" };
  it("passes a normal submission", () => expect(spamScore(ok).score).toBeLessThan(SPAM_THRESHOLD));
  it("blocks honeypot and too-fast submissions", () => {
    expect(spamScore({ ...ok, honeypot: "x" }).score).toBeGreaterThanOrEqual(SPAM_THRESHOLD);
    expect(spamScore({ ...ok, formStartedAt: 59_000 }).score).toBeGreaterThanOrEqual(SPAM_THRESHOLD);
  });
});

describe("csv + duplicates", () => {
  it("parses quotes, escaped quotes and CRLF", () => {
    expect(parseCsv('a,b\r\n"x, y","he said ""hi"""\n')).toEqual([["a", "b"], ["x, y", 'he said "hi"']]);
  });
  it("finds duplicates by name, domain and fuzzy name in the same emirate", () => {
    const existing = [{ id: "1", normalizedName: normalizeName("Meridian Tax LLC"), emirate: "dubai", website: "https://meridian.ae" }];
    expect(findDuplicate({ legal_name: "Meridian Tax L.L.C", emirate: "sharjah", website: "" }, existing)).toBe("1");
    expect(findDuplicate({ legal_name: "Other Name", emirate: "sharjah", website: "http://www.meridian.ae" }, existing)).toBe("1");
    expect(findDuplicate({ legal_name: "Meridian Taxx", emirate: "dubai", website: "" }, existing)).toBe("1");
    expect(findDuplicate({ legal_name: "Meridian Taxx", emirate: "ajman", website: "" }, existing)).toBeNull();
  });
});

describe("markdown", () => {
  it("escapes HTML and blocks javascript: links", () => {
    const html = renderMarkdown('## T\n<script>alert(1)</script>\n[x](javascript:alert(1)) [ok](https://tax.gov.ae)');
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("javascript:");
    expect(html).toContain('href="https://tax.gov.ae"');
  });
});

describe("analytics", () => {
  it("drops non-whitelisted keys and anything that looks like an email", () => {
    expect(sanitizeProps({ email: "a@b.c", service: "vat-returns", orgId: "x@y", count: 2 })).toEqual({ service: "vat-returns", count: 2 });
  });
});

import { httpUrl, isUuid } from "@/lib/validators";
describe("validators", () => {
  it("accepts only http(s) URLs with a real hostname", () => {
    const v = httpUrl();
    expect(v.safeParse("https://firm.ae").success).toBe(true);
    expect(v.safeParse("javascript:alert(1)").success).toBe(false);
    expect(v.safeParse("data:text/html,hi").success).toBe(false);
    expect(v.safeParse("https://localhost").success).toBe(false);
  });
  it("uuid", () => {
    expect(isUuid("6f1c2b0e-8f4e-4c5a-9a7b-2d3e4f5a6b7c")).toBe(true);
    expect(isUuid("1 or 1=1")).toBe(false);
  });
});
