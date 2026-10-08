import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { getDb, closeDb } from "@/db/client";
import * as s from "@/db/schema";
import { addProfessional, updateProfessional, removeProfessional, submitIndividualCredential } from "@/lib/people";
import { approveSubmission, openDispute, freezeForDispute, duplicateRegistrations, verifyCredential } from "@/lib/verification";
import { expectDbError } from "./helpers";
import { loadCandidates, getProviderBySlug } from "@/lib/providers";
import { matchProviders } from "@/lib/matching";
import { userActor } from "@/lib/audit";
import { resetDb, makeOrg, makeUser } from "./helpers";

const db = getDb();
const now = new Date();
beforeEach(resetDb);
afterAll(closeDb);

const assessment = { services: ["fta-representation"], emirate: "dubai", languages: [], answers: { revenueBand: "1m-10m", employeesBand: "10-49", ftaMatter: "audit" } };

describe("ENG-07 individual professionals", () => {
  it("a verified individual tax agent makes the firm eligible for FTA representation", async () => {
    const { org, user } = await makeOrg({ services: ["fta-representation"] });
    const reviewer = await makeUser("reviewer", "rev@example.invalid");
    let m = matchProviders(await loadCandidates(db, ["fta-representation"], now), assessment);
    expect(m.matches).toHaveLength(0);

    const added = await addProfessional(db, userActor(user!.id), org.id, { fullName: "Aisha Rahman", title: "Tax Manager", languages: ["en", "ar"] });
    if (!added.ok || !added.id) throw new Error("setup");
    const sub = await submitIndividualCredential(db, userActor(user!.id), org.id, { professionalId: added.id, credentialType: "FTA_TAX_AGENT", registrationNumber: "TAAN-IND-1", evidenceNote: "Search FTA register by TAAN" });
    expect(sub.ok).toBe(true);
    const [submission] = await db.select().from(s.credentialSubmissions);
    expect(submission!.professionalId).toBe(added.id);

    await approveSubmission(db, userActor(reviewer.id), submission!.id, { method: "official_register", evidenceNote: "Found on FTA register, linked to the firm" }, now);
    const [cred] = await db.select().from(s.credentials).where(eq(s.credentials.professionalId, added.id));
    expect(cred!.status).toBe("verified");
    expect(cred!.organizationId).toBeNull();

    m = matchProviders(await loadCandidates(db, ["fta-representation"], now), assessment);
    expect(m.matches.map((x) => x.candidateId)).toEqual([org.id]);
    const profile = await getProviderBySlug(db, org.slug);
    expect(profile!.people[0]!.credentials[0]!.status).toBe("verified");
  });

  it("refuses firm-level types for people, people from other firms, and renaming a verified person", async () => {
    const a = await makeOrg();
    const b = await makeOrg();
    const reviewer = await makeUser("reviewer", "rev@example.invalid");
    const p = await addProfessional(db, userActor(a.user!.id), a.org.id, { fullName: "Omar Said" });
    if (!p.ok || !p.id) throw new Error("setup");
    expect((await submitIndividualCredential(db, userActor(a.user!.id), a.org.id, { professionalId: p.id, credentialType: "FTA_TAX_AGENCY", registrationNumber: "X-123", evidenceNote: "firm type on a person" })).ok).toBe(false);
    expect((await submitIndividualCredential(db, userActor(b.user!.id), b.org.id, { professionalId: p.id, credentialType: "ACCA", registrationNumber: "A-123", evidenceNote: "someone else's employee" })).ok).toBe(false);

    await submitIndividualCredential(db, userActor(a.user!.id), a.org.id, { professionalId: p.id, credentialType: "ACCA", registrationNumber: "A-999", evidenceNote: "ACCA member directory" });
    const [sub] = await db.select().from(s.credentialSubmissions);
    await approveSubmission(db, userActor(reviewer.id), sub!.id, { method: "document_review", evidenceNote: "Membership certificate checked" }, now);
    const rename = await updateProfessional(db, userActor(a.user!.id), a.org.id, p.id, { fullName: "Someone Else" });
    expect(rename.ok).toBe(false);
    expect((await updateProfessional(db, userActor(a.user!.id), a.org.id, p.id, { fullName: "Omar Said", title: "Senior Manager" })).ok).toBe(true);
    await expect(removeProfessional(db, userActor(b.user!.id), b.org.id, p.id)).rejects.toThrow(/not found/);
  });

  it("staff linked to a firm cannot verify that firm's individual registrations", async () => {
    const { org, user } = await makeOrg();
    const reviewer = await makeUser("reviewer", "rev@example.invalid");
    await db.update(s.users).set({ organizationId: org.id }).where(eq(s.users.id, reviewer.id));
    const p = await addProfessional(db, userActor(user!.id), org.id, { fullName: "Lina Haddad" });
    if (!p.ok || !p.id) throw new Error("setup");
    await submitIndividualCredential(db, userActor(user!.id), org.id, { professionalId: p.id, credentialType: "FTA_TAX_AGENT", registrationNumber: "T-1", evidenceNote: "register lookup please" });
    const [sub] = await db.select().from(s.credentialSubmissions);
    await expect(approveSubmission(db, userActor(reviewer.id), sub!.id, { method: "official_register", evidenceNote: "checked my own colleague" }, now)).rejects.toThrow(/own organisation/);
  });

  it("provider bios go through the copy rules", async () => {
    const { org, user } = await makeOrg();
    const r = await addProfessional(db, userActor(user!.id), org.id, { fullName: "Sam Lee", bio: "FTA-approved expert, guaranteed outcomes" });
    expect(r.ok).toBe(false);
  });
});

describe("review2 fixes for people", () => {
  const person = async (orgId: string, userId: string, fullName: string) => {
    const r = await addProfessional(db, userActor(userId), orgId, { fullName });
    if (!r.ok || !r.id) throw new Error("setup");
    return r.id;
  };
  const submit = (orgId: string, userId: string, professionalId: string, registrationNumber = "TAAN-1") =>
    submitIndividualCredential(db, userActor(userId), orgId, { professionalId, credentialType: "FTA_TAX_AGENT", registrationNumber, evidenceNote: "Search FTA register by TAAN" });

  it("H1: a demo firm's people are demo records and can never be verified", async () => {
    const { org, user } = await makeOrg({ isSynthetic: true });
    const reviewer = await makeUser("reviewer", "rev@example.invalid");
    const id = await person(org.id, user!.id, "Demo Person");
    const [row] = await db.select().from(s.professionals).where(eq(s.professionals.id, id));
    expect(row!.isSynthetic).toBe(true);
    await submit(org.id, user!.id, id);
    const [sub] = await db.select().from(s.credentialSubmissions);
    await expectDbError(approveSubmission(db, userActor(reviewer.id), sub!.id, { method: "official_register", evidenceNote: "Looked it up on the register" }, now), /synthetic/);
    // The trigger checks the firm too, even if the person's own flag were wrong.
    await db.update(s.professionals).set({ isSynthetic: false }).where(eq(s.professionals.id, id));
    const [cred] = await db.select().from(s.credentials).where(eq(s.credentials.professionalId, id));
    await expectDbError(verifyCredential(db, userActor(reviewer.id), cred!.id, { method: "official_register", evidenceNote: "Looked it up on the register" }, now), /synthetic/);
  });

  it("M4: no rename while a registration is pending, and approval refuses a changed name", async () => {
    const { org, user } = await makeOrg();
    const reviewer = await makeUser("reviewer", "rev@example.invalid");
    const id = await person(org.id, user!.id, "Aisha Rahman");
    await submit(org.id, user!.id, id);
    expect((await updateProfessional(db, userActor(user!.id), org.id, id, { fullName: "Someone Else" })).ok).toBe(false);
    const [sub] = await db.select().from(s.credentialSubmissions);
    expect(sub!.professionalName).toBe("Aisha Rahman");
    // Even if the name changed by another route, approval refuses.
    await db.update(s.professionals).set({ fullName: "Someone Else" }).where(eq(s.professionals.id, id));
    await expect(approveSubmission(db, userActor(reviewer.id), sub!.id, { method: "official_register", evidenceNote: "Looked it up on the register" }, now)).rejects.toThrow(/name changed/);
  });

  it("M5: removing a person keeps the record, hides it, and blocks approval", async () => {
    const { org, user } = await makeOrg({ services: ["fta-representation"] });
    const reviewer = await makeUser("reviewer", "rev@example.invalid");
    const id = await person(org.id, user!.id, "Omar Said");
    await submit(org.id, user!.id, id);
    const [sub] = await db.select().from(s.credentialSubmissions);
    await removeProfessional(db, userActor(user!.id), org.id, id, now);
    const [row] = await db.select().from(s.professionals).where(eq(s.professionals.id, id));
    expect(row!.removedAt).not.toBeNull();
    expect((await getProviderBySlug(db, org.slug))!.people).toHaveLength(0);
    await expect(approveSubmission(db, userActor(reviewer.id), sub!.id, { method: "official_register", evidenceNote: "Looked it up on the register" }, now)).rejects.toThrow(/removed/);
    await expect(removeProfessional(db, userActor(user!.id), org.id, id, now)).rejects.toThrow(/not found/);
  });

  it("M5: a verified person stops counting for the firm once removed", async () => {
    const { org, user } = await makeOrg({ services: ["fta-representation"] });
    const reviewer = await makeUser("reviewer", "rev@example.invalid");
    const id = await person(org.id, user!.id, "Lina Haddad");
    await submit(org.id, user!.id, id);
    const [sub] = await db.select().from(s.credentialSubmissions);
    await approveSubmission(db, userActor(reviewer.id), sub!.id, { method: "official_register", evidenceNote: "Looked it up on the register" }, now);
    expect(matchProviders(await loadCandidates(db, ["fta-representation"], now), assessment).matches).toHaveLength(1);
    await removeProfessional(db, userActor(user!.id), org.id, id, now);
    expect(matchProviders(await loadCandidates(db, ["fta-representation"], now), assessment).matches).toHaveLength(0);
  });

  it("M5: an individual's registration can be reported and frozen", async () => {
    const { org, user } = await makeOrg();
    const other = await makeOrg();
    const reviewer = await makeUser("reviewer", "rev@example.invalid");
    const id = await person(org.id, user!.id, "Sara Ali");
    await submit(org.id, user!.id, id);
    const [sub] = await db.select().from(s.credentialSubmissions);
    await approveSubmission(db, userActor(reviewer.id), sub!.id, { method: "official_register", evidenceNote: "Looked it up on the register" }, now);
    const [cred] = await db.select().from(s.credentials).where(eq(s.credentials.professionalId, id));
    const input = { organizationId: org.id, credentialId: cred!.id, reporterEmail: "r@example.invalid", reason: "incorrect_credential" as const, details: "This person left the firm last year." };
    // The credential belongs to org's person, not to another firm.
    await expect(openDispute(db, { ...input, organizationId: other.org.id }, { ip: "203.0.113.9", now })).rejects.toThrow(/does not belong/);
    const d = await openDispute(db, input, { ip: "203.0.113.9", now });
    if (!d.ok) throw new Error("dispute");
    await freezeForDispute(db, userActor(reviewer.id), d.id, now);
    const [after] = await db.select().from(s.credentials).where(eq(s.credentials.id, cred!.id));
    expect(after!.status).toBe("disputed");
  });

  it("M5: the reviewer sees the same registration number held elsewhere", async () => {
    const a = await makeOrg();
    const b = await makeOrg();
    const reviewer = await makeUser("reviewer", "rev@example.invalid");
    const pa = await person(a.org.id, a.user!.id, "First Holder");
    await submit(a.org.id, a.user!.id, pa, "TAAN-777");
    const [subA] = await db.select().from(s.credentialSubmissions);
    await approveSubmission(db, userActor(reviewer.id), subA!.id, { method: "official_register", evidenceNote: "Looked it up on the register" }, now);
    const pb = await person(b.org.id, b.user!.id, "Second Claimant");
    await submit(b.org.id, b.user!.id, pb, "taan 777");
    const [subB] = await db.select().from(s.credentialSubmissions).where(eq(s.credentialSubmissions.professionalId, pb));
    const dups = await duplicateRegistrations(db, "FTA_TAX_AGENT", subB!.registrationNumber, subB!.id);
    expect(dups.map((d) => d.person)).toEqual(["First Holder"]);
    expect(await duplicateRegistrations(db, "FTA_TAX_AGENT", subA!.registrationNumber, subA!.id)).toEqual(
      expect.arrayContaining([expect.objectContaining({ person: "Second Claimant", status: "pending" })]),
    );
  });
});
