import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { getDb, closeDb } from "@/db/client";
import * as s from "@/db/schema";
import { providerStats } from "@/lib/provider-analytics";
import { track } from "@/lib/analytics";
import { submitEnquiry, respondToEnquiry } from "@/lib/enquiry";
import { ENQUIRY_CONSENT_VERSION } from "@/lib/consent";
import { userActor } from "@/lib/audit";
import { resetDb, makeOrg, answers } from "./helpers";

const db = getDb();
beforeEach(resetDb);
afterAll(closeDb);

describe("ENG-10 provider analytics", () => {
  it("counts views, match appearances, enquiries, responses and response time for one provider only", async () => {
    const a = await makeOrg({ legalName: "Stats Firm" });
    const b = await makeOrg({ legalName: "Other Firm" });
    await track(db, "profile_viewed", { orgId: a.org.id });
    await track(db, "profile_viewed", { orgId: a.org.id });
    await track(db, "profile_viewed", { orgId: b.org.id });
    await track(db, "provider_matched", { orgId: a.org.id, score: 80 });
    const now = new Date();
    const r = await submitEnquiry(
      db,
      {
        answers: answers(),
        contact: { contactName: "Bu Yer", contactEmail: "b@x.example" },
        selectedProviderIds: [a.org.id],
        consentGiven: true,
        consentVersion: ENQUIRY_CONSENT_VERSION,
        formStartedAt: now.getTime() - 60_000,
      },
      { ip: "10.9.0.1", now },
    );
    expect(r.ok).toBe(true);
    const [rec] = await db.select().from(s.enquiryRecipients);
    await respondToEnquiry(db, userActor(a.user!.id), a.org.id, rec!.id, "accepted", undefined, new Date(now.getTime() + 2 * 3600_000));
    const stats = await providerStats(db, a.org.id, new Date(now.getTime() + 3 * 3600_000));
    expect(stats).toMatchObject({ profileViews: 2, matchImpressions: 1, enquiries: 1, accepted: 1, acceptanceRate: 1, enquiriesPerImpression: 1 });
    expect(Math.round(stats.medianResponseHours!)).toBe(2);
    expect((await providerStats(db, b.org.id, now)).profileViews).toBe(1);
  });
});
