import "server-only";
import { redirect, unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { requireRole, type SessionUser } from "@/lib/session";

/** Staff guard (admin or reviewer). Call at the top of every admin page AND every server action. */
export async function requireStaff(): Promise<SessionUser> {
  return requireRole("admin", "reviewer");
}

/** Admin-only guard for billing, promotions, import and erasure. Reviewers are sent to /forbidden. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireRole("admin", "reviewer");
  if (user.role !== "admin") redirect("/forbidden");
  return user;
}

export type Flash = { notice?: string; error?: string };

function withParam(path: string, key: "notice" | "error", message: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${key}=${encodeURIComponent(message.slice(0, 300))}`;
}

/** POST-redirect-GET with a success message. */
export function done(path: string, message: string): never {
  redirect(withParam(path, "notice", message));
}

/** POST-redirect-GET with an error message. */
export function fail(path: string, message: string): never {
  redirect(withParam(path, "error", message));
}

/** Human-readable message from a thrown value (zod issues are listed). */
export function errorMessage(err: unknown): string {
  if (err instanceof z.ZodError) return err.issues.map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message)).join("; ");
  if (err instanceof Error && err.message) return err.message;
  return "Something went wrong";
}

/**
 * Runs a lib call and returns its result, or an error message. Never swallows Next.js
 * control-flow errors (redirect/notFound), so redirects stay outside the try/catch.
 */
export async function attempt<T>(fn: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  try {
    return { ok: true, value: await fn() };
  } catch (err) {
    unstable_rethrow(err);
    console.error("[admin] action failed", err);
    return { ok: false, error: errorMessage(err) };
  }
}

// ---------- Form input coercion ----------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);

/** Trimmed string from FormData, capped at `max` characters. Files and missing values give "". */
export function text(fd: FormData, name: string, max = 2000): string {
  const v = fd.get(name);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export function uuidField(fd: FormData, name: string): string | null {
  const v = text(fd, name, 64);
  return isUuid(v) ? v : null;
}

export function oneOf<T extends string>(fd: FormData, name: string, allowed: readonly T[]): T | null {
  const v = text(fd, name, 100);
  return (allowed as readonly string[]).includes(v) ? (v as T) : null;
}

/** Parses an <input type="date"> value. "" → undefined; malformed → null. */
export function dateField(fd: FormData, name: string): Date | undefined | null {
  const v = text(fd, name, 20);
  if (!v) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v ? null : d;
}

/** Normalises a search param that may be an array. */
export function param(v: string | string[] | undefined, max = 200): string {
  const s = Array.isArray(v) ? v[0] : v;
  return (s ?? "").trim().slice(0, max);
}

// ---------- Display helpers ----------

export function fmtDate(d: Date | null | undefined): string {
  return d ? d.toISOString().slice(0, 10) : "—";
}

export function fmtDateTime(d: Date | null | undefined): string {
  return d ? `${d.toISOString().slice(0, 16).replace("T", " ")} UTC` : "—";
}

/** "jane@firm.ae" → "j***@firm.ae". Erased and malformed values are returned as a placeholder. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1) return email.startsWith("[") ? email : "***";
  return `${email[0]}***${email.slice(at)}`;
}

export const pct = (n: number, base: number): string => (base > 0 ? `${((n / base) * 100).toFixed(1)}%` : "—");

export function FlashMessages({ notice, error }: Flash) {
  return (
    <>
      {notice && (
        <div className="alert alert-ok" role="status" style={{ marginBottom: 16 }}>
          {notice}
        </div>
      )}
      {error && (
        <div className="alert alert-bad" role="alert" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}
    </>
  );
}

export function TestModeBanner() {
  return (
    <div className="alert alert-warn" role="note" style={{ marginBottom: 16 }}>
      <strong>TEST MODE: no real payments.</strong> Subscriptions and charges here are recorded in the internal test ledger only. No money moves.
    </div>
  );
}

export function StatusBadge({ value }: { value: string }) {
  const good = ["published", "claimed", "verified", "approved", "sent", "active", "committed", "valid", "accepted", "upheld"];
  const warn = ["draft", "claim_pending", "pending", "failed", "past_due", "trialing", "disputed", "duplicate", "expired", "staged", "open", "notified", "viewed"];
  const bad = ["suspended", "removed", "revoked", "rejected", "dead", "canceled", "invalid", "erased", "spam", "declined"];
  const cls = good.includes(value) ? "badge-ok" : warn.includes(value) ? "badge-warn" : bad.includes(value) ? "badge-bad" : "badge-neutral";
  return <span className={`badge ${cls}`}>{value.replace(/_/g, " ")}</span>;
}
