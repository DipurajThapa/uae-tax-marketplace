import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { eq, sql } from "drizzle-orm";
import { getDb, closeDb } from "@/db/client";
import * as s from "@/db/schema";
import { submitEnquiry, withdrawEnquiry, getRecipientForProvider, respondToEnquiry, applyRetention, type SubmitInput } from "@/lib/enquiry";
import { processOutbox, retryNotification } from "@/lib/notify";
import { ENQUIRY_CONSENT_VERSION } from "@/lib/consent";
import { userActor, SYSTEM } from "@/lib/audit";
import { testBillingProvider } from "@/lib/billing";
import { resetDb, makeOrg, makeUser, MemoryTransport, answers } from "./helpers";

const db = getDb();
const now = new Date("2026-10-08T10:00:00Z");
let ipCounter = 0;
const ctx = () => ({ ip: `10.0.0.${++ipCounter}`, now });

const input = (providerIds: string[], o: Partial<SubmitInput> = {}): SubmitInput => ({
  answers: answers(),
  contact: { contactName: "Jo Buyer", contactEmail: "jo@buyer.example", contactPhone: "+971 50 000 0000", companyName: "Buyer LLC", message: "Need help with VAT returns" },
  selectedProviderIds: providerIds,
  consentGiven: true,
  consentVersion: ENQUIRY_CONSENT_VERSION,
  honeypot: "",
  formStartedAt: now.getTime() - 60_000,
  ...o,
});

beforeEach(resetDb);
afterAll(closeDb);

describe("scenario 2: a business submits a qualified, consented enquiry", () => {
  it("routes only to selected eligible providers, records consent, charges and notifications", async () => {
    const a = await makeOrg({ legalName: "Alpha Tax" });
    const b = await makeOrg({ legalName: "Bravo Tax" });
    const res = await submitEnquiry(db, input([a.org.id]), ctx());
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.ref).toMatch(/^ENQ-/);

    const [enq] = await db.select().from(s.enquiries);
    const recips = await db.select().from(s.enquiryRecipients);
    expect(recips.map((r) => r.organizationId)).toEqual([a.org.id]); // not Bravo
    const [consent] = await db.select().from(s.consents).where(eq(s.consents.id, enq!.consentId));
    expect(consent!.recipientOrganizationIds).toEqual([a.org.id]);
    expect(consent!.textVersion).toBe(ENQUIRY_CONSENT_VERSION);
    expect(enq!.manageTokenHash).not.toBe(res.manageToken); // only the hash is stored

    const charges = await db.select().from(s.leadCharges);
    expect(charges).toHaveLength(1);
    expect(charges[0]!.included).toBe(true);

    const notes = await db.select().from(s.notifications);
    expect(notes.map((n) => n.template).sort()).toEqual(["buyer_enquiry_receipt", "provider_new_enquiry"]);
    const providerNote = notes.find((n) => n.template === "provider_new_enquiry")!;
    // Provider email carries no buyer contact details.
    expect(JSON.stringify(providerNote.payload)).not.toContain("jo@buyer.example");
    expect(JSON.stringify(providerNote.payload)).not.toContain("+971");
    expect(b.org.id).toBeDefined();
  });

  it("refuses without consent or with a stale consent version", async () => {
    const a = await makeOrg();
    expect((await submitEnquiry(db, input([a.org.id], { consentGiven: false }), ctx())).ok).toBe(false);
    expect((await submitEnquiry(db, input([a.org.id], { consentVersion: "old" }), ctx())).ok).toBe(false);
    expect(await db.select().from(s.enquiries)).toHaveLength(0);
  });

  it("refuses a hand-crafted selection of an ineligible provider (unclaimed / draft / missing credential)", async () => {
    const unclaimed = await makeOrg({ claimState: "unclaimed", withUser: false });
    const draft = await makeOrg({ listingStatus: "draft" });
    const noCred = await makeOrg({ services: ["fta-representation"] });
    for (const id of [unclaimed.org.id, draft.org.id]) {
      const r = await submitEnquiry(db, input([id]), ctx());
      expect(r.ok === false && r.code).toBe("ineligible_selection");
    }
    const r = await submitEnquiry(db, input([noCred.org.id], { answers: answers({ services: ["fta-representation"], ftaMatter: "audit" }) }), ctx());
    expect(r.ok === false && r.code).toBe("ineligible_selection");
    expect(await db.select().from(s.enquiries)).toHaveLength(0);
  });

  it("accepts a regulated service when the provider holds the verified registration", async () => {
    await makeUser("reviewer", "rev@example.invalid");
    const p = await makeOrg({ services: ["fta-representation"], verified: ["FTA_TAX_AGENCY"] });
    const r = await submitEnquiry(db, input([p.org.id], { answers: answers({ services: ["fta-representation"], ftaMatter: "audit" }) }), ctx());
    expect(r.ok).toBe(true);
  });

  it("deduplicates the same enquiry within 7 days (no second charge)", async () => {
    const a = await makeOrg();
    const first = await submitEnquiry(db, input([a.org.id]), ctx());
    const second = await submitEnquiry(db, input([a.org.id], { contact: { contactName: "Jo Buyer", contactEmail: "JO@buyer.example" } }), ctx());
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(second.duplicate).toBe(true);
      expect(second.ref).toBe(first.ref);
    }
    expect(await db.select().from(s.enquiries)).toHaveLength(1);
    expect(await db.select().from(s.leadCharges)).toHaveLength(1);
  });

  it("rejects spam without storing personal data, and rate-limits by IP", async () => {
    const a = await makeOrg();
    const spam = await submitEnquiry(db, input([a.org.id], { honeypot: "http://spam" }), ctx());
    expect(spam.ok === false && spam.code).toBe("rejected");
    expect(await db.select().from(s.enquiries)).toHaveLength(0);

    // Paid plan so the free plan's monthly cap does not interfere with the rate-limit check.
    await testBillingProvider.subscribe(db, SYSTEM, a.org.id, "premium", new Date(now.getTime() - 1000));
    const fixed = { ip: "10.9.9.9", now };
    const results = [];
    for (let i = 0; i < 6; i++) results.push(await submitEnquiry(db, input([a.org.id], { contact: { contactName: "X Y", contactEmail: `u${i}@b.example` } }), fixed));
    expect(results.slice(0, 5).every((r) => r.ok)).toBe(true);
    expect(results[5]!.ok === false && (results[5] as { code: string }).code).toBe("rate_limited");
  });

  it("caps recipients at 3", async () => {
    const orgs = await Promise.all([1, 2, 3, 4].map((i) => makeOrg({ legalName: `Cap ${i}` })));
    const r = await submitEnquiry(db, input(orgs.map((o) => o.org.id)), ctx());
    expect(r.ok === false && r.code).toBe("validation");
  });
});

describe("plan capacity and lead accounting", () => {
  it("free plan stops receiving leads at its monthly cap; paid plan charges overage", async () => {
    const free = await makeOrg({ legalName: "Free Firm" });
    for (let i = 0; i < 3; i++) expect((await submitEnquiry(db, input([free.org.id], { contact: { contactName: "Bu Yer", contactEmail: `b${i}@x.example` } }), ctx())).ok).toBe(true);
    const fourth = await submitEnquiry(db, input([free.org.id], { contact: { contactName: "Bu Yer", contactEmail: "b9@x.example" } }), ctx());
    expect(fourth.ok === false && fourth.code).toBe("ineligible_selection");

    const pro = await makeOrg({ legalName: "Pro Firm" });
    await testBillingProvider.subscribe(db, SYSTEM, pro.org.id, "professional", new Date(now.getTime() - 1000));
    for (let i = 0; i < 11; i++) await submitEnquiry(db, input([pro.org.id], { contact: { contactName: "Bu Yer", contactEmail: `p${i}@x.example` } }), ctx());
    const charges = await db.select().from(s.leadCharges).where(eq(s.leadCharges.organizationId, pro.org.id));
    expect(charges.filter((c) => c.included)).toHaveLength(10);
    expect(charges.filter((c) => !c.included).map((c) => c.amountAed)).toEqual(["150.00"]);
  });

  it("past_due subscription falls back to free-plan limits", async () => {
    const o = await makeOrg();
    const subId = await testBillingProvider.subscribe(db, SYSTEM, o.org.id, "premium", new Date(now.getTime() - 1000));
    await testBillingProvider.markPastDue(db, SYSTEM, subId);
    const { effectivePlan } = await import("@/lib/billing");
    expect((await effectivePlan(db, o.org.id, now)).code).toBe("free");
  });
});

describe("scenario 3: provider receives and manages the enquiry", () => {
  it("provider sees only its own recipients and can accept", async () => {
    const a = await makeOrg({ legalName: "Alpha" });
    const b = await makeOrg({ legalName: "Bravo" });
    await submitEnquiry(db, input([a.org.id]), ctx());
    const [rec] = await db.select().from(s.enquiryRecipients);
    // Scenario 9: another provider cannot read or act on it.
    expect(await getRecipientForProvider(db, b.org.id, rec!.id)).toBeNull();
    expect(await respondToEnquiry(db, userActor(b.user!.id), b.org.id, rec!.id, "accepted", undefined)).toBe(false);

    const view = await getRecipientForProvider(db, a.org.id, rec!.id, now);
    expect(view?.enq.contactEmail).toBe("jo@buyer.example");
    expect(await respondToEnquiry(db, userActor(a.user!.id), a.org.id, rec!.id, "accepted", "Will call today")).toBe(true);
    const [after] = await db.select().from(s.enquiryRecipients);
    expect(after!.status).toBe("accepted");
    expect(after!.viewedAt).not.toBeNull();
  });
});

describe("scenario 8: notification failure and recovery", () => {
  it("retries with backoff, dead-letters after max attempts, and an admin can requeue", async () => {
    const a = await makeOrg();
    await submitEnquiry(db, input([a.org.id]), ctx());
    const t = new MemoryTransport();
    t.failNext = 1;
    let r = await processOutbox(db, t, now);
    expect(r.sent + r.failed).toBe(2);
    expect(r.failed).toBe(1);
    const failed = (await db.select().from(s.notifications)).find((n) => n.status === "failed")!;
    expect(failed.nextAttemptAt.getTime()).toBeGreaterThan(now.getTime());

    // Not due yet: nothing happens.
    r = await processOutbox(db, t, now);
    expect(r.sent + r.failed).toBe(0);

    // Keep failing until dead.
    let clock = now.getTime();
    for (let i = 0; i < 6; i++) {
      clock += 24 * 3600_000;
      t.failNext = 1;
      await processOutbox(db, t, new Date(clock));
    }
    const [dead] = await db.select().from(s.notifications).where(eq(s.notifications.id, failed.id));
    expect(dead!.status).toBe("dead");
    const audits = await db.select().from(s.auditLog).where(eq(s.auditLog.action, "notification.dead"));
    expect(audits).toHaveLength(1);

    const admin = await makeUser("admin", "admin@example.invalid");
    t.failNext = 0;
    await retryNotification(db, userActor(admin.id), dead!.id, new Date(clock));
    r = await processOutbox(db, t, new Date(clock));
    expect(r.sent).toBe(1);
    const recips = await db.select().from(s.enquiryRecipients);
    expect(recips.every((x) => x.notifiedAt !== null)).toBe(true);
  });

  it("concurrent workers do not double-send", async () => {
    const a = await makeOrg();
    await submitEnquiry(db, input([a.org.id]), ctx());
    const t = new MemoryTransport();
    await Promise.all([processOutbox(db, t, now), processOutbox(db, t, now), processOutbox(db, t, now)]);
    expect(t.sent).toHaveLength(2);
  });
});

describe("buyer withdrawal, erasure and retention", () => {
  it("erases contact data, closes recipients and notifies providers", async () => {
    const a = await makeOrg();
    const res = await submitEnquiry(db, input([a.org.id]), ctx());
    if (!res.ok || !res.manageToken) throw new Error("setup");
    expect((await withdrawEnquiry(db, "wrong-token")).ok).toBe(false);
    expect((await withdrawEnquiry(db, res.manageToken)).ok).toBe(true);
    const [enq] = await db.select().from(s.enquiries);
    expect(enq!.status).toBe("erased");
    expect(enq!.contactEmail).toBe("[erased]");
    expect(enq!.message).toBeNull();
    const [rec] = await db.select().from(s.enquiryRecipients);
    expect(rec!.status).toBe("closed");
    const notes = await db.select().from(s.notifications).where(eq(s.notifications.template, "provider_enquiry_withdrawn"));
    expect(notes).toHaveLength(1);
    // Provider can no longer accept it.
    expect(await respondToEnquiry(db, userActor(a.user!.id), a.org.id, rec!.id, "accepted", undefined)).toBe(false);
  });

  it("retention erases enquiries older than 12 months only", async () => {
    const a = await makeOrg();
    await submitEnquiry(db, input([a.org.id]), ctx());
    await db.execute(sql`update enquiries set created_at = now() - interval '13 months'`);
    await submitEnquiry(db, input([a.org.id], { contact: { contactName: "New One", contactEmail: "new@x.example" } }), { ip: "1.1.1.1", now: new Date() });
    const n = await applyRetention(db, SYSTEM, new Date());
    expect(n).toBe(1);
    const rows = await db.select().from(s.enquiries);
    expect(rows.filter((r) => r.status === "erased")).toHaveLength(1);
  });
});
