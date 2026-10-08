import { z } from "zod";

/** Absolute http(s) URL only. Blocks javascript:, data:, etc. from ever reaching an href. */
export const httpUrl = (message = "Enter a full web address starting with https://") =>
  z
    .string()
    .trim()
    .max(200)
    .refine((v) => {
      try {
        const u = new URL(v);
        return (u.protocol === "https:" || u.protocol === "http:") && !!u.hostname && u.hostname.includes(".");
      } catch {
        return false;
      }
    }, message);

export const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/**
 * A calendar date "YYYY-MM-DD" as midnight UTC, or null. Rejects dates JavaScript would roll over,
 * such as 2026-02-31 becoming 3 March (review2 L4).
 */
export function parseIsoDate(v: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v ? d : null;
}

export const isoDate = (message = "Use a valid date") =>
  z.string().trim().transform((v, ctx) => {
    const d = parseIsoDate(v);
    if (!d) {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return d;
  });
