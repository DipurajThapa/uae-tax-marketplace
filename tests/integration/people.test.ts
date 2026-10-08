import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { getDb, closeDb } from "@/db/client";
import * as s from "@/db/schema";
import { addProfessional, updateProfessional, removeProfessional, submitIndividualCredential } from "@/lib/people";
import { approveSubmission } from "@/lib/verification";
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
