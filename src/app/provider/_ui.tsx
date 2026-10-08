import { redirect } from "next/navigation";

/** Shared, non-routed helpers for the provider area. */

export const fmtDate = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "–");

export const fmtAed = (n: number | string) => {
  const v = typeof n === "string" ? Number(n) : n;
  return `AED ${Number.isFinite(v) ? v.toLocaleString("en-US", { maximumFractionDigits: 2 }) : String(n)}`;
};

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Redirects back to a provider page with a one-line message (POST-redirect-GET). Never call inside try. */
export function back(path: string, kind: "notice" | "error", message: string): never {
  redirect(`${path}?${kind}=${encodeURIComponent(message.slice(0, 300))}`);
}

export function Flash({ notice, error }: { notice?: string; error?: string }) {
  return (
    <>
      {notice && (
        <div className="alert alert-ok" role="status">
          {notice}
        </div>
      )}
      {error && (
        <div className="alert alert-bad" role="alert">
          {error}
        </div>
      )}
    </>
  );
}

export const LISTING_STATUS: Record<string, { label: string; cls: string; meaning: string }> = {
  draft: {
    label: "In review",
    cls: "badge-warn",
    meaning: "Your listing is awaiting review by our team. It is not visible in the directory and cannot receive enquiries yet.",
  },
  published: { label: "Published", cls: "badge-ok", meaning: "Your listing is visible in the directory." },
  suspended: {
    label: "Suspended",
    cls: "badge-bad",
    meaning: "Your listing is hidden from the directory and cannot receive enquiries. Contact support to find out why.",
  },
  removed: { label: "Removed", cls: "badge-bad", meaning: "Your listing has been removed from the directory. Contact support for details." },
};

export const CLAIM_STATE: Record<string, { label: string; meaning: string }> = {
  claimed: { label: "Claimed", meaning: "Your firm controls this listing." },
  claim_pending: { label: "Claim in review", meaning: "A claim for this listing is being reviewed. Enquiries start once the claim is approved." },
  unclaimed: { label: "Unclaimed", meaning: "Nobody controls this listing yet, so it cannot receive enquiries." },
};

export const RECIPIENT_STATUS: Record<string, [string, string]> = {
  pending: ["New", "badge-warn"],
  notified: ["New", "badge-warn"],
  viewed: ["Viewed", "badge-neutral"],
  accepted: ["Accepted", "badge-ok"],
  declined: ["Declined", "badge-neutral"],
  closed: ["Closed", "badge-neutral"],
};

export function RecipientStatus({ status, erased }: { status: string; erased?: boolean }) {
  if (erased) return <span className="badge badge-neutral">Withdrawn</span>;
  const [label, cls] = RECIPIENT_STATUS[status] ?? [status, "badge-neutral"];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export const REVIEW_STATE: Record<string, [string, string]> = {
  pending: ["Awaiting review", "badge-warn"],
  approved: ["Approved", "badge-ok"],
  rejected: ["Not approved", "badge-bad"],
};

/** Lead charge description for one enquiry recipient. Test mode: nothing is collected. */
export function chargeLabel(c: { included: boolean; amountAed: string; status: string } | null | undefined): string {
  if (!c) return "No charge recorded";
  if (c.status === "waived") return "Waived";
  if (c.included) return "Included in your plan";
  const state = c.status === "disputed" ? " (disputed)" : c.status === "invoiced" ? " (invoiced)" : "";
  return `Overage: ${fmtAed(c.amountAed)}${state}`;
}
