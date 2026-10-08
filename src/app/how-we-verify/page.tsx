import Link from "next/link";
import { CREDENTIAL_TYPES } from "@/lib/taxonomy";

export const metadata = { title: "How we verify registrations", alternates: { canonical: "/how-we-verify" } };

export default function HowWeVerify() {
  return (
    <div className="container narrow">
      <h1>How we verify registrations</h1>
      <p>Anyone can call themselves a tax consultant. Some roles, though, need a registration with a UAE authority. We show what we have checked, how we checked it, and when, so you can judge for yourself.</p>
      <h2>Three different kinds of registration</h2>
      <ul>
        <li><strong>Registered tax agents and tax agencies</strong> are registered with the Federal Tax Authority (FTA). They can represent a business in its dealings with the FTA.</li>
        <li><strong>Accredited e-invoicing service providers</strong> are accredited by the Ministry of Finance to exchange e-invoices. This is a technology role, not tax representation.</li>
        <li><strong>Professional qualifications</strong> (for example ACCA or a chartered accountancy membership) show training, but they are not UAE registrations.</li>
      </ul>
      <p>A provider can hold any combination of these. We never treat one as another.</p>
      <h2>What the statuses mean</h2>
      <dl className="dl">
        <dt>Verified</dt><dd>A named reviewer checked this registration against the official public register, or against documents the firm supplied. The profile says which, and shows the date.</dd>
        <dt>Check pending</dt><dd>The firm has submitted it and a reviewer has not finished checking it.</dd>
        <dt>Not verified</dt><dd>Declared by the firm and not checked. It earns no badge and does not count for matching.</dd>
        <dt>Re-check due</dt><dd>Registrations are re-checked on a schedule. If a re-check is overdue, the badge is removed until it is done.</dd>
        <dt>Under review</dt><dd>A reviewer is investigating a reported problem. The badge is hidden until the review ends. Reports alone never remove a badge.</dd>
        <dt>Not confirmed</dt><dd>A reviewer could not confirm the registration, or found it was no longer valid.</dd>
      </dl>
      <h2>Re-check schedule</h2>
      <ul>
        {CREDENTIAL_TYPES.map((c) => <li key={c.code}>{c.name}: every {c.recheckDays} days</li>)}
      </ul>
      <h2>Where the listings come from</h2>
      <p>Firms list themselves and give their registration numbers, and we check those numbers one at a time. We do not copy official registers in bulk. If you find a mistake, use “Report incorrect information” on the profile.</p>
      <p><Link href="/how-ranking-works">How matching and ranking work</Link></p>
    </div>
  );
}
