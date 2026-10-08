import Link from "next/link";

export const metadata = { title: "Enquiry sent", robots: { index: false } };

export default async function Sent({ searchParams }: { searchParams: Promise<{ ref?: string; duplicate?: string }> }) {
  const { ref, duplicate } = await searchParams;
  const safeRef = /^ENQ-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(ref ?? "") ? ref : null;
  return (
    <div className="container narrow">
      <h1>{duplicate ? "You already sent this enquiry" : "Your enquiry has been sent"}</h1>
      {safeRef && <p>Reference: <strong>{safeRef}</strong></p>}
      {duplicate ? (
        <p>The same enquiry to the same providers was sent in the last few days, so we did not send it again. Check your inbox for the original confirmation, which has the link to manage it.</p>
      ) : (
        <>
          <p>We have sent your enquiry only to the providers you chose. They will contact you directly.</p>
          <p>We have also emailed you a confirmation. It contains a private link you can use to withdraw the enquiry and erase your details at any time.</p>
        </>
      )}
      <div className="alert alert-info">This directory does not give tax advice and is not part of any agreement you make with a provider. Before you engage a provider, check their registration yourself if it matters to you; each profile explains how we checked it.</div>
      <p style={{ marginTop: 24 }}><Link href="/providers">Back to providers</Link></p>
    </div>
  );
}
