import Link from "next/link";
import { getDb } from "@/db/client";
import { facetCounts } from "@/lib/providers";
import { EMIRATES } from "@/lib/taxonomy";

export const metadata = { title: "Tax providers by emirate", alternates: { canonical: "/locations" } };
export const dynamic = "force-dynamic";

export default async function Locations() {
  const f = await facetCounts(getDb());
  return (
    <div className="container">
      <h1>Providers by emirate</h1>
      <div className="grid grid-3">
        {EMIRATES.map((e) => (
          <Link className="card card-link" key={e.code} href={`/locations/${e.code}`}><h2 style={{ margin: 0 }}>{e.name}</h2><p className="muted" style={{ margin: 0 }}>{f.emirates.get(e.code) ?? 0} providers</p></Link>
        ))}
      </div>
    </div>
  );
}
