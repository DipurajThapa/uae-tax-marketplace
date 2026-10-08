import Link from "next/link";
import { CREDENTIAL_BY_CODE, EMIRATE_BY_CODE, ORG_KIND_LABELS, SERVICE_BY_CODE } from "@/lib/taxonomy";

export function Field({ label, name, error, help, children }: { label: string; name: string; error?: string; help?: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      {children}
      {help && <div className="help" id={`${name}-help`}>{help}</div>}
      {error && <div className="error" id={`${name}-error`} role="alert">{error}</div>}
    </div>
  );
}

const STATUS_LABEL: Record<string, [string, string]> = {
  verified: ["Verified", "badge-ok"],
  pending: ["Check pending", "badge-warn"],
  unverified: ["Not verified", "badge-neutral"],
  expired: ["Re-check due", "badge-warn"],
  disputed: ["Under review", "badge-warn"],
  revoked: ["Not confirmed", "badge-bad"],
};

export function CredentialStatus({ status }: { status: string }) {
  const [label, cls] = STATUS_LABEL[status] ?? [status, "badge-neutral"];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function CredentialLine({ type, status, registrationNumber, verifiedAt }: { type: string; status: string; registrationNumber?: string | null; verifiedAt?: Date | null }) {
  const def = CREDENTIAL_BY_CODE[type];
  return (
    <div className="row" style={{ gap: 8 }}>
      <CredentialStatus status={status} />
      <span>
        {def?.name ?? type}
        {registrationNumber && status === "verified" ? <span className="muted small"> · No. {registrationNumber}</span> : null}
        {verifiedAt && status === "verified" ? <span className="muted small"> · checked {verifiedAt.toISOString().slice(0, 10)}</span> : null}
      </span>
    </div>
  );
}

export type CardProvider = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  emirate: string;
  city: string | null;
  services: string[];
  languages: string[];
  isSynthetic: boolean;
  claimState: string;
  credentials: { type: string; status: string; registrationNumber: string | null; verifiedAt: Date | null }[];
};

export function ProviderCard({ p, sponsored = false, compareHref }: { p: CardProvider; sponsored?: boolean; compareHref?: string }) {
  const verified = p.credentials.filter((c) => c.status === "verified");
  return (
    <article className="card" aria-labelledby={`p-${p.id}`}>
      <div className="row between">
        <h3 id={`p-${p.id}`} style={{ margin: 0 }}>
          <Link href={`/providers/${p.slug}`}>{p.name}</Link>
        </h3>
        <div className="row" style={{ gap: 6 }}>
          {sponsored && <span className="badge badge-sponsored" title="This placement is paid for. It does not affect match scores.">Sponsored</span>}
          {p.isSynthetic && <span className="badge badge-neutral">Demo data</span>}
        </div>
      </div>
      <p className="muted small" style={{ margin: "4px 0 10px" }}>
        {ORG_KIND_LABELS[p.kind] ?? p.kind} · {p.city ? `${p.city}, ` : ""}{EMIRATE_BY_CODE[p.emirate]?.name ?? p.emirate}
      </p>
      <div className="stack" style={{ gap: 6 }}>
        {verified.length > 0 ? (
          verified.map((c) => <CredentialLine key={c.type} {...c} />)
        ) : (
          <p className="small muted" style={{ margin: 0 }}>No registration verified yet</p>
        )}
      </div>
      <div className="chips" style={{ marginTop: 12 }}>
        {p.services.slice(0, 5).map((s) => <span className="chip" key={s}>{SERVICE_BY_CODE[s]?.name ?? s}</span>)}
        {p.services.length > 5 && <span className="chip">+{p.services.length - 5} more</span>}
      </div>
      {compareHref && (
        <p className="small" style={{ marginTop: 12, marginBottom: 0 }}>
          <Link href={compareHref}>Add to comparison</Link>
        </p>
      )}
    </article>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="card center" role="status">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export function JsonLd({ data }: { data: unknown }) {
  // JSON.stringify output escaped so a value cannot close the script tag.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
