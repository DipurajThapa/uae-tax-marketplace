import { NextResponse, type NextRequest } from "next/server";
import { buildCsp } from "@/lib/csp";
import { stagingGate } from "@/lib/staging-gate";

/** Per-request nonce and CSP for every page (ENG-15). Pages are dynamically rendered, so each gets a fresh nonce. */
export function proxy(request: NextRequest) {
  const gate = stagingGate({ APP_ENV: process.env.APP_ENV, STAGING_BASIC_AUTH: process.env.STAGING_BASIC_AUTH }, request.headers.get("authorization"));
  if (gate === "misconfigured") return new NextResponse("Staging access is not configured.", { status: 503, headers: { "X-Robots-Tag": "noindex, nofollow" } });
  if (gate === "challenge")
    return new NextResponse("Authentication required.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="staging", charset="UTF-8"', "X-Robots-Tag": "noindex, nofollow" },
    });
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce, process.env.NODE_ENV === "development");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  if (gate === "allow") response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

// Every response gets the CSP, prefetches included (review2 M6). Only exact static paths are skipped:
// the exclusions are anchored, so a look-alike such as /api/health-x or /favicon.ico.html is covered.
export const config = {
  matcher: ["/((?!_next/static/|_next/image$|favicon\\.ico$|api/health$).*)"],
};
