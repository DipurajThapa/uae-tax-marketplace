import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { PROVIDER_LISTING_CONSENT_TEXT } from "@/lib/consent";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "List your firm",
  description: "Create a listing for your tax, accounting or e-invoicing firm. Listings and registrations are reviewed before they are published.",
  robots: { index: false },
};

export default async function RegisterPage() {
  const user = await currentUser();
  if (user?.role === "provider") redirect("/provider");
  return (
    <div className="container narrow">
      <p className="small">
        <Link href="/for-providers">← For providers</Link>
      </p>
      <h1>List your firm</h1>
      <p className="muted">
        Already listed? <Link href="/providers">Find your listing and claim it</Link> instead of creating a new one. Already have an account?{" "}
        <Link href="/login">Sign in</Link>.
      </p>
      <RegisterForm consentText={PROVIDER_LISTING_CONSENT_TEXT} />
    </div>
  );
}
