import Link from "next/link";
import { LegalPage } from "@/components/legal";
import { MONEY, MoneyRules } from "@/components/money";

export const metadata = { title: "Terms", robots: { index: false } };

export default function Terms() {
  return (
    <LegalPage
      title="Terms of use"
      mark="use"
      updated="Draft"
      lead="The rules for businesses using Taxdar to find a provider, and for providers listed on it."
      sections={[
        {
          id: "what",
          title: "What Taxdar is",
          body: (
            <>
              <p>The directory helps businesses find and contact providers. It does not give tax, legal or accounting advice.</p>
              <p>Taxdar is independent. It is not affiliated with the Federal Tax Authority or the Ministry of Finance.</p>
            </>
          ),
        },
        {
          id: "check",
          title: "What we check",
          body: (
            <>
              <p>Providers write their own descriptions. We check only the registrations shown as “Verified”, by the method and on the date shown.</p>
              <div className="facts">
                <div><p className="kicker">Verified</p><p>A named reviewer confirmed the registration on the official source or from documents.</p></div>
                <div><p className="kicker">Not verified</p><p>Declared by the provider and not checked. Treat it as the provider&apos;s own statement.</p></div>
              </div>
              <p><Link href="/how-we-verify">How we verify registrations</Link></p>
            </>
          ),
        },
        {
          id: "engage",
          title: "Engaging a provider",
          body: <p>Any engagement is between you and the provider. We are not a party to it.</p>,
        },
        {
          id: "how-we-earn",
          title: "How Taxdar makes money",
          body: (
            <>
              <MoneyRules compact />
              <p className="mt-2">Sponsored placements are labelled and do not affect match scores. {MONEY.limit}</p>
            </>
          ),
        },
        {
          id: "providers",
          title: "Rules for providers",
          body: (
            <ul>
              <li>Keep your information accurate.</li>
              <li>Use enquiry details only to respond to that enquiry, and for no other purpose.</li>
              <li>Delete your copy of an enquiry when the business withdraws it and we ask you to.</li>
            </ul>
          ),
        },
        { id: "contact", title: "Contact", body: <p>[Company legal name], [address]. Questions about these terms: [contact email].</p> },
      ]}
    />
  );
}
