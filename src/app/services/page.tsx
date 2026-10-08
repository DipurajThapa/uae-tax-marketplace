import Link from "next/link";
import { getDb } from "@/db/client";
import { facetCounts } from "@/lib/providers";
import { SERVICES, SERVICE_CATEGORIES } from "@/lib/taxonomy";
import { PageHeader } from "@/components/page";

export const metadata = { title: "Tax and e-invoicing services in the UAE", alternates: { canonical: "/services" } };
export const dynamic = "force-dynamic";

export default async function Services() {
  const f = await facetCounts(getDb());
  return (
    <div className="container">
      <PageHeader kicker="Directory" title="Services" lead="Corporate Tax, VAT, e-invoicing and accounting services, with the number of listed providers for each." />
      <div className="grid grid-2">
        {Object.entries(SERVICE_CATEGORIES).map(([cat, label]) => (
          <section className="card" key={cat}>
            <h2>{label}</h2>
            <ul>
              {SERVICES.filter((s) => s.category === cat).map((s) => (
                <li key={s.code}><Link href={`/services/${s.code}`}>{s.name}</Link> <span className="muted">({f.services.get(s.code) ?? 0})</span><br /><span className="small muted">{s.description}</span></li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
