import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { EMIRATE_BY_CODE } from "@/lib/taxonomy";
import { isIndexable, robotsFor } from "@/lib/seo";
import { Landing } from "../../services/_landing";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ emirate: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { emirate } = await params;
  const e = EMIRATE_BY_CODE[emirate];
  if (!e) return {};
  return {
    title: `Tax and e-invoicing providers in ${e.name}`,
    description: `Corporate Tax, VAT and e-invoicing providers based in or serving ${e.name}.`,
    alternates: { canonical: `/locations/${emirate}` },
    robots: robotsFor(await isIndexable(getDb(), { emirate })),
  };
}

export default async function Page({ params }: P) {
  const { emirate } = await params;
  if (!EMIRATE_BY_CODE[emirate]) notFound();
  return <Landing emirate={emirate} />;
}
