import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { SERVICE_BY_CODE } from "@/lib/taxonomy";
import { isIndexable, robotsFor } from "@/lib/seo";
import { Landing } from "../_landing";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { code } = await params;
  const s = SERVICE_BY_CODE[code];
  if (!s) return {};
  return {
    title: `${s.name} providers in the UAE`,
    description: `Compare UAE providers offering ${s.name.toLowerCase()}: services, languages, locations and checked registrations.`,
    alternates: { canonical: `/services/${code}` },
    robots: robotsFor(await isIndexable(getDb(), { service: code })),
  };
}

export default async function Page({ params }: P) {
  const { code } = await params;
  if (!SERVICE_BY_CODE[code]) notFound();
  return <Landing service={code} />;
}
