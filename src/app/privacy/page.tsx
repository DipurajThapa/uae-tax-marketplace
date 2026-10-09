import { LegalPage } from "@/components/legal";

export const metadata = { title: "Privacy notice", robots: { index: false } };

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy notice"
      mark="notice"
      updated="Draft"
      lead="What Taxdar collects, why, who sees it and how long we keep it. In short: your enquiry goes only to the providers you choose, and you can erase it at any time."
      sections={[
        {
          id: "who",
          title: "Who we are",
          body: (
            <p>
              Taxdar is operated by [Company legal name], licensed in [emirate or free zone] under licence number [number]. Taxdar is an independent directory. It is
              not affiliated with the Federal Tax Authority or the Ministry of Finance, and it does not give tax advice.
            </p>
          ),
        },
        {
          id: "collect",
          title: "What we collect",
          body: (
            <div className="facts">
              <div><p className="kicker">Enquiries</p><p>Your name, email, optional phone and company, your answers to the questions, and an optional message.</p></div>
              <div><p className="kicker">Provider accounts</p><p>The name and email of the person managing a listing, and the business details they submit.</p></div>
              <div><p className="kicker">Usage counts</p><p>Anonymous counts of searches and page views, with no cookies and no personal identifiers.</p></div>
              <div><p className="kicker">Security records</p><p>A one-way hash of your IP address, used to limit abuse.</p></div>
            </div>
          ),
        },
        {
          id: "why",
          title: "Why, and on what basis",
          body: <p>We share an enquiry only with the providers you select, and only after you agree. We record the wording you agreed to and the providers it named.</p>,
        },
        {
          id: "share",
          title: "Who sees it",
          body: (
            <>
              <ol className="flow" aria-label="Where an enquiry goes">
                <li><p className="kicker">You</p><p>Answer the questions and choose up to three providers.</p></li>
                <li className="flow-key"><p className="kicker">Your consent</p><p>You agree to share with the providers named on screen.</p></li>
                <li><p className="kicker">Chosen providers only</p><p>They see your details in their dashboard. Nobody else does.</p></li>
              </ol>
              <p>
                Emails to providers never contain your contact details. Providers must use them only to respond to your enquiry. A provider&apos;s paid plan gives it
                no extra access to your data.
              </p>
            </>
          ),
        },
        {
          id: "keep",
          title: "How long we keep it",
          body: <p>Enquiries are erased after 12 months, or sooner if you use the withdraw link in your confirmation email.</p>,
        },
        {
          id: "rights",
          title: "Your rights",
          body: (
            <p>
              You can withdraw an enquiry and have your details erased at any time using that link, or by contacting us. When you withdraw, we ask the providers
              who received it to delete their copy.
            </p>
          ),
        },
        { id: "where", title: "Where it is stored", body: <p>Hosting location and processors are to be confirmed before launch.</p> },
        { id: "contact", title: "Contact", body: <p>Questions about this notice or your data: [privacy contact email].</p> },
      ]}
    />
  );
}
