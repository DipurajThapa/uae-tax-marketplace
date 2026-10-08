"use client";

/** Last-resort error page when the root layout itself fails (review L8). */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 24, maxWidth: 640, margin: "0 auto" }}>
        <h1>Service temporarily unavailable</h1>
        <p>We could not load the site. Please try again in a moment.</p>
        <button type="button" onClick={() => reset()}>Try again</button>
      </body>
    </html>
  );
}
