/** Central, validated access to environment configuration. */
function bool(v: string | undefined, dflt: boolean): boolean {
  if (v === undefined || v === "") return dflt;
  return v === "true" || v === "1";
}

export const config = {
  get siteUrl(): string {
    return (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  },
  /**
   * Production unless explicitly marked otherwise. A production build (NODE_ENV=production) is treated
   * as production unless APP_ENV is "test" or "staging", so a missing variable fails closed (finding M8).
   */
  get isProduction(): boolean {
    if (process.env.NODE_ENV !== "production") return false;
    return !["test", "staging"].includes(process.env.APP_ENV ?? "");
  },
  /** Crawlers are blocked unless the owner has authorised launch. */
  get allowIndexing(): boolean {
    return bool(process.env.ALLOW_INDEXING, false);
  },
  /** Synthetic demo records are never shown in a production environment. */
  get allowSyntheticData(): boolean {
    if (this.isProduction) return false;
    return bool(process.env.ALLOW_SYNTHETIC_DATA, false);
  },
  get appSecret(): string {
    const s = process.env.APP_SECRET;
    if (!s || s.length < 32) throw new Error("APP_SECRET must be set (>= 32 chars)");
    if (this.isProduction && s.startsWith("change-me")) throw new Error("APP_SECRET is a placeholder");
    return s;
  },
  /** The file transport is for dev/test only; production never silently writes mail to disk (finding H5). */
  get mailTransport(): "outbox-file" | "smtp" {
    if (this.isProduction) return "smtp";
    return process.env.MAIL_TRANSPORT === "smtp" ? "smtp" : "outbox-file";
  },
  get mailFrom(): string {
    return process.env.MAIL_FROM ?? "no-reply@example.invalid";
  },
  get billingProvider(): "test" {
    // Only the internal test ledger exists until live billing is authorised by the owner.
    return "test";
  },
};
