"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/provider", label: "Overview" },
  { href: "/provider/enquiries", label: "Enquiries" },
  { href: "/provider/profile", label: "Profile" },
  { href: "/provider/credentials", label: "Registrations" },
  { href: "/provider/people", label: "People" },
  { href: "/provider/insights", label: "Insights" },
  { href: "/provider/billing", label: "Plan & billing" },
  { href: "/provider/security", label: "Security" },
];

export function ProviderNav() {
  const path = usePathname();
  return (
    <nav className="admin-nav" aria-label="Provider dashboard">
      {ITEMS.map((i) => {
        const current = i.href === "/provider" ? path === "/provider" : path === i.href || path.startsWith(`${i.href}/`);
        return (
          <Link key={i.href} href={i.href} aria-current={current ? "page" : undefined} style={current ? { background: "var(--brand-soft)", color: "var(--ink)" } : undefined}>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
