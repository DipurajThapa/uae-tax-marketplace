import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { eq, sql } from "drizzle-orm";
import { getDb, closeDb } from "@/db/client";
import * as s from "@/db/schema";
import { userActor } from "@/lib/audit";
import { submitClaim, approveClaim, rejectClaim, registerProvider, consumePasswordToken, requestPasswordReset } from "@/lib/claims";
import { verifyCredential, sweepStaleCredentials, openDispute, resolveDispute, approveSubmission, revokeCredential } from "@/lib/verification";
import { createPromotion } from "@/lib/promotions";
import { testBillingProvider } from "@/lib/billing";
import { stageImport, commitImport, ImportBlockedError } from "@/lib/importer";
import { searchProviders, getProviderBySlug, activePromotions } from "@/lib/providers";
import { verifyPassword } from "@/lib/crypto";
import { resetDb, makeOrg, makeUser, expectDbError } from "./helpers";

const db = getDb();
const now = new Date("2026-10-08T10:00:00Z");
let ip = 0;
const ctx = () => ({ ip: `10.1.0.${++ip}`, now });

beforeEach(resetDb);
afterAll(closeDb);

describe("database integrity rules", () => {
  it("audit_log is append-only", async () => {
    await db.insert(s.auditLog).values({ actorLabel: "system", action: "x", entityType: "t" });
    await expectDbError(db.execute(sql`update audit_log set action = 'y'`), /append-only/);
    await expectDbError(db.execute(sql`delete from audit_log`), /append-only/);
  });

  it("a credential cannot be 'verified' without method, reviewer and evidence", async () => {
    const { org } = await makeOrg();
    await expectDbError(
      db.insert(s.credentials).values({ credentialType: "FTA_TAX_AGENCY", organizationId: org.id, status: "verified", method: "self_declared" }),
      /credentials_verified_has_evidence/,
    );
  });

  it("synthetic records can never hold a verified credential", async () => {
    const { org } = await makeOrg({ isSynthetic: true });
    const rev = await makeUser("reviewer", "r@example.invalid");
    const [c] = await db.insert(s.credentials).values({ credentialType: "FTA_TAX_AGENCY", organizationId: org.id }).returning();
    await expectDbError(verifyCredential(db, userActor(rev.id), c!.id, { method: "official_register", evidenceNote: "looked it up properly" }), /synthetic/);
  });
});

describe("scenario 4/5: claim a listing, admin approves", () => {
  it("claim → approve creates a provider account with a one-time set-password link", async () => {
    const { org } = await makeOrg({ claimState: "unclaimed", withUser: false, website: "https://meridian.example" });
    const r = await submitClaim(db, { organizationId: org.id, claimantName: "Mo Owner", claimantEmail: "mo@meridian.example", claimantRole: "Partner", evidenceNote: "Listed as partner on our team page" }, ctx());
    expect(r.ok).toBe(true);
    const [claim] = await db.select().from(s.claims);
    expect(claim!.emailDomainMatchesWebsite).toBe(true);
    expect((await db.select().from(s.organizations))[0]!.claimState).toBe("claim_pending");

    const admin = await makeUser("admin", "admin@example.invalid");
    await approveClaim(db, userActor(admin.id), claim!.id, "domain matches", now);
    const [orgAfter] = await db.select().from(s.organizations);
    expect(orgAfter!.claimState).toBe("claimed");
    const [u] = await db.select().from(s.users).where(eq(s.users.email, "mo@meridian.example"));
    expect(u!.organizationId).toBe(org.id);
    const [note] = await db.select().from(s.notifications).where(eq(s.notifications.template, "claim_decision"));
    const token = (note!.payload as { setPasswordToken: string }).setPasswordToken;
    expect((await consumePasswordToken(db, token, "short", now)).ok).toBe(false);
    expect((await consumePasswordToken(db, token, "a-long-new-password", now)).ok).toBe(true);
    expect((await consumePasswordToken(db, token, "a-long-new-password", now)).ok).toBe(false); // single use
    const [u2] = await db.select().from(s.users).where(eq(s.users.id, u!.id));
    expect(await verifyPassword("a-long-new-password", u2!.passwordHash)).toBe(true);
  });

  it("rejecting the only claim returns the listing to unclaimed; claimed listings cannot be claimed", async () => {
    const { org } = await makeOrg({ claimState: "unclaimed", withUser: false });
    await submitClaim(db, { organizationId: org.id, claimantName: "Eve", claimantEmail: "eve@gmail.example", claimantRole: "Owner", evidenceNote: "trust me, I really own this firm" }, ctx());
    const [claim] = await db.select().from(s.claims);
    expect(claim!.emailDomainMatchesWebsite).toBe(false);
    const admin = await makeUser("admin", "admin@example.invalid");
    await rejectClaim(db, userActor(admin.id), claim!.id, "cannot confirm");
    expect((await db.select().from(s.organizations))[0]!.claimState).toBe("unclaimed");

    const { org: claimed } = await makeOrg();
    const r = await submitClaim(db, { organizationId: claimed.id, claimantName: "Eve", claimantEmail: "eve@x.example", claimantRole: "Owner", evidenceNote: "trying to hijack a listing here" }, ctx());
    expect(r.ok).toBe(false);
  });
});

describe("password reset", () => {
  it("sends a 1-hour single-use link to existing accounts only, with no enumeration signal", async () => {
    const u = await makeUser("provider", "pat@firm.example");
    await requestPasswordReset(db, "nobody@firm.example", ctx());
    expect(await db.select().from(s.notifications)).toHaveLength(0);
    await requestPasswordReset(db, "PAT@firm.example", ctx());
    const [n] = await db.select().from(s.notifications);
    expect(n!.template).toBe("password_reset");
    const token = (n!.payload as { setPasswordToken: string }).setPasswordToken;
    expect((await consumePasswordToken(db, token, "brand-new-password", new Date(now.getTime() + 2 * 3600_000))).ok).toBe(false); // expired
    const [t] = await db.select().from(s.passwordTokens);
    expect(t!.userId).toBe(u.id);
  });
});

describe("provider self-registration and credential review", () => {
  const reg = (o: Record<string, unknown> = {}) => ({
    legalName: "Oasis Tax Consultants LLC", kind: "tax_agency", emirate: "dubai", publicEmail: "info@oasis.example", services: ["vat-returns", "fta-representation"],
    jurisdictions: ["dubai-mainland"], languages: ["en", "ar"], contactName: "Ola Partner", contactEmail: "ola@oasis.example", password: "very-secure-password",
    credentials: [{ type: "FTA_TAX_AGENCY", registrationNumber: "TAAN-TEST-1" }], consent: true, ...o,
  });

  it("creates a DRAFT listing with a PENDING credential; nothing public until reviewed", async () => {
    const r = await registerProvider(db, reg(), ctx());
    expect(r.ok).toBe(true);
    const [org] = await db.select().from(s.organizations);
    expect(org!.listingStatus).toBe("draft");
    expect((await searchProviders(db, {})).total).toBe(0);
    const [cred] = await db.select().from(s.credentials);
    expect(cred!.status).toBe("pending");

    // Self-approval is refused (separation of duties).
    const [sub] = await db.select().from(s.credentialSubmissions);
    const [owner] = await db.select().from(s.users).where(eq(s.users.email, "ola@oasis.example"));
    await expect(approveSubmission(db, userActor(owner!.id), sub!.id, { method: "official_register", evidenceNote: "self check attempt" })).rejects.toThrow(/own submission/);

    const reviewer = await makeUser("reviewer", "rev@example.invalid");
    await approveSubmission(db, userActor(reviewer.id), sub!.id, { method: "official_register", evidenceNote: "Matched TAAN on FTA register on 2026-10-08" }, now);
    const [after] = await db.select().from(s.credentials);
    expect(after!.status).toBe("verified");
    expect(after!.verifiedBy).toBe(reviewer.id);
    expect(after!.recheckDueAt!.getTime()).toBe(now.getTime() + 90 * 86400_000);
  });

  it("refuses duplicates, missing consent, and an existing account email", async () => {
    expect((await registerProvider(db, reg({ consent: false }), ctx())).ok).toBe(false);
    expect((await registerProvider(db, reg(), ctx())).ok).toBe(true);
    const dupe = await registerProvider(db, reg({ legalName: "OASIS TAX CONSULTANTS L.L.C.", contactEmail: "other@oasis.example" }), ctx());
    expect(dupe.ok).toBe(false);
    const sameEmail = await registerProvider(db, reg({ legalName: "Different Firm" }), ctx());
    expect(sameEmail.ok).toBe(false);
  });
});

describe("scenario 6: disputed or expired verification is updated safely", () => {
  it("stale sweep expires credentials past their re-check date (fail closed)", async () => {
    await makeUser("reviewer", "rev@example.invalid");
    const { org } = await makeOrg({ verified: ["FTA_TAX_AGENCY"] });
    const [c] = await db.select().from(s.credentials).where(eq(s.credentials.organizationId, org.id));
    const later = new Date(c!.recheckDueAt!.getTime() + 1000);
    expect(await sweepStaleCredentials(db, new Date(c!.recheckDueAt!.getTime() - 1000))).toBe(0);
    expect(await sweepStaleCredentials(db, later)).toBe(1);
    const [after] = await db.select().from(s.credentials);
    expect(after!.status).toBe("expired");
    const p = await getProviderBySlug(db, org.slug);
    expect(p!.credentials.some((x) => x.status === "verified")).toBe(false);
  });

  it("a dispute freezes a verified credential; rejection restores it, upholding revokes it", async () => {
    const rev = await makeUser("reviewer", "rev@example.invalid");
    const { org } = await makeOrg({ verified: ["FTA_TAX_AGENCY"] });
    const [c] = await db.select().from(s.credentials);
    const d1 = await openDispute(db, { organizationId: org.id, credentialId: c!.id, reporterEmail: "x@y.example", reason: "incorrect_credential", details: "Not on the register" }, ctx());
    expect(d1.ok).toBe(true);
    expect((await db.select().from(s.credentials))[0]!.status).toBe("disputed");
    await expect(verifyCredential(db, userActor(rev.id), c!.id, { method: "official_register", evidenceNote: "re-verify while disputed" })).rejects.toThrow(/dispute/);
    if (d1.ok) await resolveDispute(db, userActor(rev.id), d1.id, "rejected", "Re-checked: valid", now);
    expect((await db.select().from(s.credentials))[0]!.status).toBe("verified");

    const d2 = await openDispute(db, { organizationId: org.id, credentialId: c!.id, reporterEmail: "x@y.example", reason: "incorrect_credential", details: "Deregistered last week" }, ctx());
    if (d2.ok) await resolveDispute(db, userActor(rev.id), d2.id, "upheld", "Confirmed deregistered", now);
    expect((await db.select().from(s.credentials))[0]!.status).toBe("revoked");
  });

  it("a dispute cannot target another provider's credential", async () => {
    await makeUser("reviewer", "rev@example.invalid");
    const a = await makeOrg({ verified: ["FTA_TAX_AGENCY"] });
    const b = await makeOrg();
    const [c] = await db.select().from(s.credentials).where(eq(s.credentials.organizationId, a.org.id));
    await expect(openDispute(db, { organizationId: b.org.id, credentialId: c!.id, reporterEmail: "x@y.example", reason: "other", details: "cross-org tamper attempt" }, ctx())).rejects.toThrow();
  });

  it("upheld 'business closed' suspends the listing", async () => {
    const rev = await makeUser("reviewer", "rev@example.invalid");
    const { org } = await makeOrg();
    const d = await openDispute(db, { organizationId: org.id, reporterEmail: "x@y.example", reason: "business_closed", details: "Office closed in June" }, ctx());
    if (d.ok) await resolveDispute(db, userActor(rev.id), d.id, "upheld", "Confirmed", now);
    expect((await db.select().from(s.organizations))[0]!.listingStatus).toBe("suspended");
  });
});

describe("revocation and promotions", () => {
  it("revoking keeps the original evidence and records the reason in the audit log", async () => {
    const rev = await makeUser("reviewer", "rev@example.invalid");
    await makeOrg({ verified: ["FTA_TAX_AGENCY"] });
    const [c] = await db.select().from(s.credentials);
    await revokeCredential(db, userActor(rev.id), c!.id, "Removed from register");
    const [after] = await db.select().from(s.credentials);
    expect(after!.status).toBe("revoked");
    expect(after!.evidenceNote).toBe(c!.evidenceNote);
    await expect(revokeCredential(db, userActor(rev.id), c!.id, "again please")).rejects.toThrow(/Already/);
  });

  it("promotions need a promotable plan, and stop showing when the plan lapses", async () => {
    const admin = await makeUser("admin", "admin@example.invalid");
    const { org } = await makeOrg();
    const window = { organizationId: org.id, placement: "search" as const, serviceCode: null, emirate: null, startsAt: new Date(now.getTime() - 3600_000), endsAt: new Date(now.getTime() + 86400_000) };
    await expect(createPromotion(db, userActor(admin.id), window, now)).rejects.toThrow(/does not include promotions/);
    const subId = await testBillingProvider.subscribe(db, userActor(admin.id), org.id, "premium", new Date(now.getTime() - 7200_000));
    await createPromotion(db, userActor(admin.id), window, now);
    expect(await activePromotions(db, { placement: "search", now })).toHaveLength(1);
    await testBillingProvider.cancel(db, userActor(admin.id), subId, now);
    expect(await activePromotions(db, { placement: "search", now })).toHaveLength(0);
  });

  it("a provider cannot cancel another organisation's subscription", async () => {
    const a = await makeOrg();
    const b = await makeOrg();
    const subId = await testBillingProvider.subscribe(db, userActor(a.user!.id), a.org.id, "professional", now);
    await expect(testBillingProvider.cancel(db, userActor(b.user!.id), subId, now, b.org.id)).rejects.toThrow(/not found/);
  });
});

describe("lawful data import", () => {
  const csv = "legal_name,kind,emirate,services,website\nNew Firm LLC,accounting_firm,dubai,bookkeeping|vat-returns,https://newfirm.example\nNew Firm L.L.C.,accounting_firm,dubai,bookkeeping,\nBad Row,unknown_kind,dubai,bookkeeping,\nExisting Copy,accounting_firm,sharjah,bookkeeping,https://firm1.example\n";

  it("blocks sources without a terms review and bulk official-register imports", async () => {
    const admin = await makeUser("admin", "admin@example.invalid");
    const [fta] = await db.select().from(s.dataSources).where(eq(s.dataSources.kind, "official_register"));
    await expect(stageImport(db, userActor(admin.id), fta!.id, "x.csv", csv)).rejects.toBeInstanceOf(ImportBlockedError);
    await db.update(s.dataSources).set({ termsReviewedAt: now }).where(eq(s.dataSources.id, fta!.id));
    await expect(stageImport(db, userActor(admin.id), fta!.id, "x.csv", csv)).rejects.toThrow(/written consent/);
  });

  it("stages with validation and duplicate detection, commits only valid rows as draft + unclaimed", async () => {
    const admin = await makeUser("admin", "admin@example.invalid");
    await makeOrg({ legalName: "Firm One", website: "https://firm1.example" });
    const [src] = await db.select().from(s.dataSources).where(eq(s.dataSources.kind, "manual_research"));
    const staged = await stageImport(db, userActor(admin.id), src!.id, "list.csv", csv);
    expect(staged).toMatchObject({ valid: 1, invalid: 1, duplicate: 2 });
    const res = await commitImport(db, userActor(admin.id), staged.batchId, now);
    expect(res.created).toBe(1);
    const [created] = await db.select().from(s.organizations).where(eq(s.organizations.legalName, "New Firm LLC"));
    expect(created!.listingStatus).toBe("draft");
    expect(created!.claimState).toBe("unclaimed");
    expect(await db.select().from(s.credentials).where(eq(s.credentials.organizationId, created!.id))).toHaveLength(0);
    await expect(commitImport(db, userActor(admin.id), staged.batchId, now)).rejects.toThrow(/not staged/);
  });
});

describe("public visibility", () => {
  it("never shows synthetic records when ALLOW_SYNTHETIC_DATA is false, nor drafts or suspended listings", async () => {
    await makeOrg({ legalName: "Real Published" });
    await makeOrg({ legalName: "Synthetic One", isSynthetic: true });
    await makeOrg({ legalName: "Draft One", listingStatus: "draft" });
    await makeOrg({ legalName: "Suspended One", listingStatus: "suspended" });
    const r = await searchProviders(db, {});
    expect(r.items.map((i) => i.name)).toEqual(["Real Published"]);
  });

  it("search escapes LIKE wildcards", async () => {
    await makeOrg({ legalName: "Percent Firm" });
    expect((await searchProviders(db, { q: "%" })).total).toBe(0);
  });
});
