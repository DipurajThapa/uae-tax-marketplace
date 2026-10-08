export const metadata = { title: "Terms", robots: { index: false } };

export default function Terms() {
  return (
    <div className="container narrow">
      <div className="alert alert-warn" role="note"><strong>Draft for counsel review.</strong> These terms have not been approved and the site is not public.</div>
      <h1>Terms of use</h1>
      <ul>
        <li>The directory helps businesses find and contact providers. It does not give tax, legal or accounting advice.</li>
        <li>Providers write their own descriptions. We check only the registrations shown as “Verified”, by the method and on the date shown.</li>
        <li>Any engagement is between you and the provider. We are not a party to it.</li>
        <li>Sponsored placements are labelled and do not affect match scores.</li>
        <li>Providers must keep their information accurate and must not use enquiry details for any purpose other than responding to the enquiry.</li>
      </ul>
    </div>
  );
}
