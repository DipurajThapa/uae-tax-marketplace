import { and, eq, gte, sql } from "drizzle-orm";
import type { DB } from "@/db/client";
import { analyticsEvents, enquiryRecipients, leadCharges } from "@/db/schema";

/**
 * Provider performance over a window (ENG-10). Counts come from first-party, non-personal events
 * and the provider's own enquiry records; nothing about buyers is exposed here.
 */
export async function providerStats(db: DB, organizationId: string, now: Date, days = 30) {
  const since = new Date(now.getTime() - days * 86400_000);
  const [events] = await db
    .select({
      profileViews: sql<number>`count(*) filter (where ${analyticsEvents.name} = 'profile_viewed')::int`,
      matchImpressions: sql<number>`count(*) filter (where ${analyticsEvents.name} = 'provider_matched')::int`,
    })
    .from(analyticsEvents)
    .where(and(gte(analyticsEvents.createdAt, since), sql`${analyticsEvents.props}->>'orgId' = ${organizationId}`));
  const [recips] = await db
    .select({
      enquiries: sql<number>`count(*)::int`,
      accepted: sql<number>`count(*) filter (where ${enquiryRecipients.status} = 'accepted')::int`,
      declined: sql<number>`count(*) filter (where ${enquiryRecipients.status} = 'declined')::int`,
      awaiting: sql<number>`count(*) filter (where ${enquiryRecipients.status} in ('pending','notified','viewed'))::int`,
      medianResponseHours: sql<number | null>`(percentile_cont(0.5) within group (order by extract(epoch from (${enquiryRecipients.respondedAt} - ${enquiryRecipients.createdAt})) / 3600) filter (where ${enquiryRecipients.respondedAt} is not null))::float`,
    })
    .from(enquiryRecipients)
    .where(and(eq(enquiryRecipients.organizationId, organizationId), gte(enquiryRecipients.createdAt, since)));
  const [charges] = await db
    .select({
      waived: sql<number>`count(*) filter (where ${leadCharges.status} = 'waived')::int`,
    })
    .from(leadCharges)
    .where(and(eq(leadCharges.organizationId, organizationId), gte(leadCharges.createdAt, since)));
  const e = events ?? { profileViews: 0, matchImpressions: 0 };
  const r = recips ?? { enquiries: 0, accepted: 0, declined: 0, awaiting: 0, medianResponseHours: null };
  const responded = r.accepted + r.declined;
  return {
    days,
    profileViews: e.profileViews,
    matchImpressions: e.matchImpressions,
    enquiries: r.enquiries,
    accepted: r.accepted,
    declined: r.declined,
    awaiting: r.awaiting,
    waived: charges?.waived ?? 0,
    acceptanceRate: responded > 0 ? r.accepted / responded : null,
    enquiriesPerImpression: e.matchImpressions > 0 ? r.enquiries / e.matchImpressions : null,
    medianResponseHours: r.medianResponseHours,
  };
}
