import { and, isNotNull, lt, or, sql } from "drizzle-orm";
import type { DB } from "@/db/client";
import { sessions, passwordTokens, claims, disputes, notifications } from "@/db/schema";

/**
 * Retention beyond enquiries (review M5). Periods are owner-adjustable defaults (DECISIONS D-009).
 * Records stay for audit; personal fields are scrubbed.
 */
export async function purgeExpiredPersonalData(db: DB, now: Date, months = 24) {
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
  const sessionsDeleted = (await db.delete(sessions).where(lt(sessions.expiresAt, now)).returning({ id: sessions.id })).length;
  const tokensDeleted = (
    await db.delete(passwordTokens).where(or(lt(passwordTokens.expiresAt, now), isNotNull(passwordTokens.usedAt))).returning({ id: passwordTokens.id })
  ).length;
  const claimsScrubbed = (
    await db
      .update(claims)
      .set({ claimantName: "[erased]", claimantEmail: "[erased]", evidenceNote: "[erased]" })
      .where(and(lt(claims.createdAt, cutoff), sql`${claims.claimantEmail} <> '[erased]'`, sql`${claims.state} <> 'pending'`))
      .returning({ id: claims.id })
  ).length;
  const disputesScrubbed = (
    await db
      .update(disputes)
      .set({ reporterEmail: "[erased]" })
      .where(and(lt(disputes.createdAt, cutoff), sql`${disputes.reporterEmail} <> '[erased]'`, sql`${disputes.state} <> 'open'`))
      .returning({ id: disputes.id })
  ).length;
  // Sent mail older than 90 days: keep the row for delivery history, drop the address and payload.
  const mailCutoff = new Date(now.getTime() - 90 * 86400_000);
  const mailScrubbed = (
    await db
      .update(notifications)
      .set({ toAddress: "[erased]", payload: {} })
      .where(and(lt(notifications.createdAt, mailCutoff), sql`${notifications.status} in ('sent','dead')`, sql`${notifications.toAddress} <> '[erased]'`))
      .returning({ id: notifications.id })
  ).length;
  return { sessionsDeleted, tokensDeleted, claimsScrubbed, disputesScrubbed, mailScrubbed };
}
