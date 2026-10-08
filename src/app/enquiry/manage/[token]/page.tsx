import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { withdrawEnquiry } from "@/lib/enquiry";

export const metadata = { title: "Manage your enquiry", robots: { index: false, follow: false } };

export default async function Manage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ done?: string; error?: string }> }) {
  const { token } = await params;
  const { done, error } = await searchParams;
  async function withdraw(formData: FormData) {
    "use server";
    if (formData.get("confirm") !== "yes") redirect(`/enquiry/manage/${token}?error=confirm`);
    const res = await withdrawEnquiry(getDb(), token);
    redirect(res.ok ? `/enquiry/manage/${token}?done=1` : `/enquiry/manage/${token}?error=notfound`);
  }
  if (done) {
    return (
      <div className="container narrow">
        <h1>Enquiry withdrawn</h1>
        <p>Your contact details have been erased from our records. We have told the providers that you withdrew the enquiry and asked them to delete their copy.</p>
      </div>
    );
  }
  return (
    <div className="container narrow">
      <h1>Withdraw your enquiry</h1>
      {error === "notfound" && <div className="alert alert-bad" role="alert">This link is not valid. It may have been mistyped.</div>}
      {error === "confirm" && <div className="alert alert-bad" role="alert">Please tick the box to confirm.</div>}
      <p>Withdrawing erases your name, email, phone, company and message from our records, and tells the providers you contacted to delete their copy. This cannot be undone.</p>
      <form action={withdraw} className="card">
        <label className="option"><input type="checkbox" name="confirm" value="yes" required /> I want to withdraw this enquiry and erase my details</label>
        <button className="btn btn-danger" type="submit" style={{ marginTop: 16 }}>Withdraw and erase</button>
      </form>
    </div>
  );
}
