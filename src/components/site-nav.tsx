"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

/**
 * Main navigation. Mobile first: on phones the links sit behind a Menu button, and the menu closes
 * after a navigation. From 760px up the links are always shown and the button is hidden (CSS).
 */
export function SiteNav({ links, signedIn }: { links: { href: string; label: string }[]; signedIn: boolean }) {
  const path = usePathname();
  // The menu counts as open only on the page where it was opened, so it closes after a navigation.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === path;
  return (
    <>
      <button type="button" className="menu-toggle" aria-expanded={open} aria-controls="site-nav" onClick={() => setOpenOn(open ? null : path)}>
        {open ? "Close" : "Menu"}
      </button>
      <nav id="site-nav" className="nav" aria-label="Main" data-open={open ? "" : undefined}>
        {links.map((l) => (
          <Link key={l.href} href={l.href} aria-current={path === l.href || path.startsWith(`${l.href}/`) ? "page" : undefined}>
            {l.label}
          </Link>
        ))}
        {signedIn ? (
          <form action="/logout" method="post">
            <button type="submit" className="nav-button">Sign out</button>
          </form>
        ) : (
          <Link href="/login">Sign in</Link>
        )}
      </nav>
    </>
  );
}
