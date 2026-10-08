import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { organizations } from "@/db/schema";
import { requireProvider } from "@/lib/session";
import { ProviderNav } from "./_nav";

export const metadata: Metadata = { title: "Provider dashboard", robots: { index: false, follow: false } };

export default async function ProviderLayout({ children }: { children: React.ReactNode }) {
  const user = await requireProvider();
  const [org] = await getDb()
    .select({ legalName: organizations.legalName, tradeName: organizations.tradeName })
    .from(organizations)
    .where(eq(organizations.id, user.organizationId));
  return (
    <div className="container">
      <p className="mono muted" style={{ margin: "0 0 10px" }}>
        Signed in as {user.name} · {org ? (org.tradeName ?? org.legalName) : "Unknown firm"}
      </p>
      <ProviderNav />
      {children}
    </div>
  );
}
