"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Tab-style section navigation (admin and provider areas). The current section is marked for assistive tech and styled by CSS. */
export function SectionNav({ items, label, root }: { items: { href: string; label: string }[]; label: string; root: string }) {
  const path = usePathname();
  return (
    <nav className="admin-nav" aria-label={label}>
      {items.map((i) => {
        const current = i.href === root ? path === root : path === i.href || path.startsWith(`${i.href}/`);
        return (
          <Link key={i.href} href={i.href} aria-current={current ? "page" : undefined}>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
