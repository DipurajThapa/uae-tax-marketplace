import { SectionNav } from "@/components/section-nav";

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
  return <SectionNav items={ITEMS} label="Provider dashboard" root="/provider" />;
}
