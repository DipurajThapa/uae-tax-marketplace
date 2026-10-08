import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { requireProvider } from "@/lib/session";
import { getProviderById } from "@/lib/providers";
import { effectivePlan } from "@/lib/billing";
import { EMIRATE_BY_CODE, ORG_KIND_LABELS } from "@/lib/taxonomy";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Profile", robots: { index: false } };

export default async function ProviderProfile() {
  const user = await requireProvider();
  const db = getDb();
  const detail = await getProviderById(db, user.organizationId);
  if (!detail) notFound();
  const plan = await effectivePlan(db, user.organizationId, new Date());
  const { org } = detail;

  return (
    <div className="stack">
      <h1>Profile</h1>
      <section className="card" aria-labelledby="fixed-h">
        <h2 id="fixed-h">Details that need a review to change</h2>
        <dl className="dl">
          <dt>Legal name</dt>
          <dd>{org.legalName}</dd>
          <dt>Firm type</dt>
          <dd>{ORG_KIND_LABELS[org.kind] ?? org.kind}</dd>
          <dt>Emirate</dt>
          <dd>{EMIRATE_BY_CODE[org.emirate]?.name ?? org.emirate}</dd>
        </dl>
        <p className="small muted" style={{ marginTop: 12, marginBottom: 0 }}>
          To change these, contact support. Registrations are managed on the Registrations page and are checked before a badge shows.
        </p>
      </section>
      <ProfileForm
        maxDescriptionChars={plan.features.maxDescriptionChars}
        initial={{
          tradeName: org.tradeName ?? "",
          city: org.city ?? "",
          address: org.address ?? "",
          website: org.website ?? "",
          publicEmail: org.publicEmail ?? "",
          publicPhone: org.publicPhone ?? "",
          description: org.description ?? "",
          sizeBand: org.sizeBand ?? "",
          foundedYear: org.foundedYear ? String(org.foundedYear) : "",
          acceptingEnquiries: org.acceptingEnquiries,
          languages: org.languages,
          services: detail.services,
          jurisdictions: detail.jurisdictions,
          industries: detail.industries,
        }}
      />
    </div>
  );
}
