import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { archivoDisplay } from "./fonts";
import { config } from "@/lib/config";
import { BRAND } from "@/lib/brand";
import { currentUser } from "@/lib/session";
import { LogoMark } from "@/components/logo";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  metadataBase: new URL(config.siteUrl),
  title: { default: `${BRAND.name}: ${BRAND.descriptor}`, template: `%s | ${BRAND.name}` },
  applicationName: BRAND.name,
  description: BRAND.description,
  robots: config.allowIndexing ? undefined : { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <html lang="en" className={archivoDisplay.variable}>
      <body>
        <a href="#main" className="skip">Skip to content</a>
        {config.allowSyntheticData && (
          <div className="banner banner-demo" role="note">
            <div className="container"><strong>Demo environment.</strong> Listings marked “(Demo)” are synthetic test data, not real businesses.</div>
          </div>
        )}
        <div className="topline">
          <div className="container">
            <span className="mono long">{BRAND.independence}</span>
            <span className="mono short">Independent. Not affiliated with the FTA or MoF.</span>
            <span lang="ar" dir="rtl">{BRAND.nameAr}</span>
          </div>
        </div>
        <header className="site-header">
          <div className="container bar">
            <Link href="/" className="logo"><LogoMark />{BRAND.name}</Link>
            <SiteNav
              signedIn={Boolean(user)}
              links={[
                { href: "/providers", label: "Find providers" },
                { href: "/match", label: "Get matched" },
                { href: "/guides", label: "Guides" },
                { href: "/for-providers", label: "For providers" },
                ...(user?.role === "provider" ? [{ href: "/provider", label: "My dashboard" }] : []),
                ...(user?.role === "admin" || user?.role === "reviewer" ? [{ href: "/admin", label: "Admin" }] : []),
              ]}
            />
          </div>
        </header>
        <main id="main">{children}</main>
        <footer className="site-footer">
          <div className="container cols">
            <div>
              <p className="footer-brand">{BRAND.name} <span lang="ar" dir="rtl" className="footer-ar">{BRAND.nameAr}</span></p>
              <p className="small">{BRAND.name} is a {BRAND.descriptor}. We do not give tax advice. Registration badges appear only after we check them against an official source or document.</p>
              <p className="small independence">{BRAND.independence}</p>
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
                <li><Link href="/how-ranking-works#money">How Taxdar makes money</Link></li>
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
