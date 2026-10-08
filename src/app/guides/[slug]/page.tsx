import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db/client";
import { getPublished, articleSourceSchema } from "@/lib/articles";
import { renderMarkdown } from "@/lib/markdown";
import { JsonLd } from "@/components/ui";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const a = await getPublished(getDb(), (await params).slug);
  if (!a) return { robots: { index: false } };
  return { title: a.title, description: a.summary, alternates: { canonical: `/guides/${a.slug}` } };
}

export default async function Guide({ params }: P) {
  const a = await getPublished(getDb(), (await params).slug);
  if (!a) notFound();
  const sources = z.array(articleSourceSchema).catch([]).parse(a.sources);
  return (
    <article className="container narrow">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: a.title,
          description: a.summary,
          datePublished: a.publishedAt?.toISOString(),
          dateModified: a.updatedAt.toISOString(),
          mainEntityOfPage: `${config.siteUrl}/guides/${a.slug}`,
          reviewedBy: a.reviewerName ? { "@type": "Person", name: a.reviewerName, jobTitle: a.reviewerCredential } : undefined,
          citation: sources.map((s) => s.url),
        }}
      />
      <h1>{a.title}</h1>
      <p className="muted small">Reviewed by {a.reviewerName}, {a.reviewerCredential}, on {a.reviewedAt?.toISOString().slice(0, 10)}. Last updated {a.updatedAt.toISOString().slice(0, 10)}.</p>
      <p className="lead">{a.summary}</p>
      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(a.bodyMarkdown) }} />
      <section className="card" style={{ marginTop: 32 }}>
        <h2>Sources</h2>
        <ol>{sources.map((s) => <li key={s.url}><a href={s.url} rel="noopener nofollow" target="_blank">{s.title}</a> <span className="small muted">({s.tier === 1 ? "official source" : "secondary source"}, accessed {s.accessedAt})</span></li>)}</ol>
      </section>
      <p className="small muted">This guide is general information, not advice for your situation.</p>
    </article>
  );
}
