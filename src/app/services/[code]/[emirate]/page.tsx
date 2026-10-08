import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { SERVICE_BY_CODE, EMIRATE_BY_CODE } from "@/lib/taxonomy";
import { isIndexable, robotsFor } from "@/lib/seo";
import { Landing } from "../../_landing";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ code: string; emirate: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { code, emirate } = await params;
  const s = SERVICE_BY_CODE[code];
  const e = EMIRATE_BY_CODE[emirate];
  if (!s || !e) return {};
  return {
    title: `${s.name} in ${e.name}`,
    description: `Providers offering ${s.name.toLowerCase()} in ${e.name}, with services, languages and checked registrations.`,
    alternates: { canonical: `/services/${code}/${emirate}` },
    robots: robotsFor(await isIndexable(getDb(), { service: code, emirate })),
  };
}

export default async function Page({ params }: P) {
  const { code, emirate } = await params;
  if (!SERVICE_BY_CODE[code] || !EMIRATE_BY_CODE[emirate]) notFound();
  return <Landing service={code} emirate={emirate} />;
}
