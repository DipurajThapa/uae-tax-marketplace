import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "./config";

/**
 * Signed one-line messages for POST-redirect-GET (review L3). The message travels in the URL as
 * "text~signature"; pages show it only when the signature matches, so a crafted link cannot put
 * arbitrary text (e.g. a fake phone number) in a trusted alert box.
 */
const sig = (msg: string) => createHmac("sha256", config.appSecret).update(`flash:${msg}`).digest("base64url").slice(0, 22);

export function signFlash(message: string): string {
  const msg = message.slice(0, 300);
  return `${msg}~${sig(msg)}`;
}

export function readFlash(value: string | string[] | undefined | null): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  if (!v) return undefined;
  const i = v.lastIndexOf("~");
  if (i < 0) return undefined;
  const msg = v.slice(0, i);
  const given = Buffer.from(v.slice(i + 1));
  const expected = Buffer.from(sig(msg));
  return given.length === expected.length && timingSafeEqual(given, expected) ? msg : undefined;
}

export function flashUrl(path: string, kind: "notice" | "error", message: string): string {
  return `${path}${path.includes("?") ? "&" : "?"}${kind}=${encodeURIComponent(signFlash(message))}`;
}
