import type { Metadata } from "next";
import { getDb } from "@/db/client";
import { getProviderBySlug } from "@/lib/providers";
import { track } from "@/lib/analytics";
import { MatchWizard } from "./wizard";

export const metadata: Metadata = {
  title: "Get matched with UAE tax and e-invoicing providers",
  description: "Answer a few questions about your business and see which listed providers offer what you need, with the reasons for each match.",
  alternates: { canonical: "/match" },
};
export const dynamic = "force-dynamic";

export default async function MatchPage({ searchParams }: { searchParams: Promise<{ provider?: string; service?: string }> }) {
  const sp = await searchParams;
  const db = getDb();
  let preselect: { id: string; name: string; services: string[]; emirate: string } | null = null;
  if (sp.provider) {
    const p = await getProviderBySlug(db, sp.provider.slice(0, 100));
    if (p) preselect = { id: p.org.id, name: p.org.tradeName ?? p.org.legalName, services: p.services, emirate: p.org.emirate };
  }
  await track(db, "assessment_started", { service: sp.service });
  return (
    <div className="container narrow">
      <h1>Tell us what you need</h1>
      <p className="muted">About two minutes. We show matching providers and why each one matched before you share any contact details.</p>
      <MatchWizard preselect={preselect} initialService={sp.service} />
    </div>
  );
}
