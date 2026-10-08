/**
 * Effective status at READ time. A stored "verified" whose re-check date or expiry has passed
 * reads as "expired" immediately, whether or not the background sweep has run (fail closed).
 */
export type CredentialLike = { status: string; recheckDueAt: Date | null; expiresAt: Date | null };

export function effectiveStatus(c: CredentialLike, now: Date): string {
  if (c.status !== "verified") return c.status;
  if (!c.recheckDueAt || c.recheckDueAt <= now) return "expired";
  if (c.expiresAt && c.expiresAt <= now) return "expired";
  return "verified";
}

export function withEffectiveStatus<T extends CredentialLike>(rows: T[], now: Date): T[] {
  return rows.map((c) => ({ ...c, status: effectiveStatus(c, now) }));
}
