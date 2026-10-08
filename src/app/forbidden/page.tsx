import Link from "next/link";
export const metadata = { title: "Not allowed", robots: { index: false } };
export default function Forbidden() {
  return (
    <div className="container narrow">
      <h1>You do not have access to this page</h1>
      <p>Your account cannot open this page. <Link href="/">Go to the home page</Link>.</p>
    </div>
  );
}
