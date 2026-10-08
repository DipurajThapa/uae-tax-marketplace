import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { config } from "@/lib/config";
import { BRAND } from "@/lib/brand";
import { currentUser } from "@/lib/session";

export const metadata: Metadata = {
  metadataBase: new URL(config.siteUrl),
  title: { default: `${BRAND.name}: find UAE tax and e-invoicing professionals`, template: `%s | ${BRAND.name}` },
  description: BRAND.description,
  robots: config.allowIndexing ? undefined : { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip">Skip to content</a>
        {config.allowSyntheticData && (
          <div className="banner banner-demo" role="note">
            <div className="container"><strong>Demo environment.</strong> Listings marked “(Demo)” are synthetic test data, not real businesses.</div>
          </div>
        )}
        <header className="site-header">
          <div className="container bar">
            <Link href="/" className="logo"><span className="logo-mark" aria-hidden="true" />{BRAND.name}</Link>
            <nav className="nav" aria-label="Main">
              <Link href="/providers">Find providers</Link>
              <Link href="/match">Get matched</Link>
              <Link href="/guides">Guides</Link>
              <Link href="/for-providers">For providers</Link>
              {user?.role === "provider" && <Link href="/provider">My dashboard</Link>}
              {(user?.role === "admin" || user?.role === "reviewer") && <Link href="/admin">Admin</Link>}
              {user ? (
                <form action="/logout" method="post" style={{ display: "inline" }}>
                  <button type="submit" className="nav-button">Sign out</button>
                </form>
              ) : (
                <Link href="/login">Sign in</Link>
              )}
            </nav>
          </div>
        </header>
        <main id="main">{children}</main>
        <footer className="site-footer">
          <div className="container cols">
            <div>
              <strong>{BRAND.name}</strong>
              <p className="small">A directory of UAE tax and e-invoicing professionals. We do not give tax advice. Registration badges appear only after we check them against an official source or document.</p>
            </div>
            <div>
              <ul>
                <li><Link href="/providers">All providers</Link></li>
                <li><Link href="/services">Services</Link></li>
                <li><Link href="/locations">Locations</Link></li>
                <li><Link href="/guides">Guides</Link></li>
              </ul>
            </div>
            <div>
              <ul>
                <li><Link href="/how-we-verify">How we verify</Link></li>
                <li><Link href="/how-ranking-works">How matching and ranking work</Link></li>
                <li><Link href="/for-providers">List your firm</Link></li>
              </ul>
            </div>
            <div>
              <ul>
                <li><Link href="/privacy">Privacy</Link></li>
                <li><Link href="/terms">Terms</Link></li>
              </ul>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
