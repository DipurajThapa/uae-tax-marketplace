"use client";

import Link from "next/link";

/** Shown when a page fails (review L8). No technical details are exposed. */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container narrow">
      <h1>Something went wrong</h1>
      <p>We could not load this page. Nothing you entered was lost or shared. Please try again in a moment.</p>
      <div className="row">
        <button className="btn" type="button" onClick={() => reset()}>Try again</button>
        <Link className="btn btn-secondary" href="/">Go to the home page</Link>
      </div>
    </div>
  );
}
