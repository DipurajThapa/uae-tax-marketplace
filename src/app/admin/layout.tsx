import type { Metadata } from "next";
import { SectionNav } from "@/components/section-nav";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

const SECTIONS: { href: string; label: string; adminOnly?: boolean }[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/providers", label: "Providers" },
  { href: "/admin/claims", label: "Claims" },
  { href: "/admin/verification", label: "Verification" },
  { href: "/admin/disputes", label: "Disputes" },
  { href: "/admin/enquiries", label: "Enquiries" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/guides", label: "Guides" },
  { href: "/admin/import", label: "Import", adminOnly: true },
  { href: "/admin/billing", label: "Billing (test mode)", adminOnly: true },
  { href: "/admin/promotions", label: "Promotions", adminOnly: true },
  { href: "/admin/staff", label: "Staff and two-factor", adminOnly: true },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Access control for the whole section. Pages and every server action repeat the check.
  const user = await requireRole("admin", "reviewer");
  const links = SECTIONS.filter((s) => !s.adminOnly || user.role === "admin");
  return (
    <div className="container">
      <p className="mono muted" style={{ margin: "0 0 10px" }}>
        Back office · signed in as {user.name} ({user.role})
      </p>
      <SectionNav items={links.map(({ href, label }) => ({ href, label }))} label="Admin sections" root="/admin" />
      {children}
    </div>
  );
}
