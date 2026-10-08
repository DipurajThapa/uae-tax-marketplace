import Link from "next/link";
export default function NotFound() {
  return (
    <div className="container narrow">
      <h1>Page not found</h1>
      <p>The page may have moved, or the listing may no longer be published. <Link href="/providers">Browse providers</Link>.</p>
    </div>
  );
}
