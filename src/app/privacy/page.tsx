export const metadata = { title: "Privacy notice", robots: { index: false } };

export default function Privacy() {
  return (
    <div className="container narrow">
      <div className="alert alert-warn" role="note"><strong>Draft for counsel review.</strong> This notice has not been approved and the site is not public.</div>
      <h1>Privacy notice</h1>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Enquiries:</strong> your name, email, optional phone and company, your answers to the questions, and an optional message.</li>
        <li><strong>Provider accounts:</strong> the name and email of the person managing a listing, and the business details they submit.</li>
        <li><strong>Usage counts:</strong> anonymous counts of searches and page views, with no cookies and no personal identifiers.</li>
        <li><strong>Security records:</strong> a one-way hash of your IP address, used to limit abuse.</li>
      </ul>
      <h2>Why, and on what basis</h2>
      <p>We share an enquiry only with the providers you select, and only after you agree. We record the wording you agreed to and the providers it named.</p>
      <h2>How long we keep it</h2>
      <p>Enquiries are erased after 12 months, or sooner if you use the withdraw link in your confirmation email.</p>
      <h2>Your rights</h2>
      <p>You can withdraw an enquiry and have your details erased at any time using that link, or by contacting us.</p>
      <h2>Where it is stored</h2>
      <p>Hosting location and processors are to be confirmed before launch.</p>
    </div>
  );
}
