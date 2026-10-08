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
