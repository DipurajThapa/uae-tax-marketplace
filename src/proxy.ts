import { NextResponse, type NextRequest } from "next/server";
import { buildCsp } from "@/lib/csp";

/** Per-request nonce and CSP for every page (ENG-15). Pages are dynamically rendered, so each gets a fresh nonce. */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce, process.env.NODE_ENV === "development");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

// Every response gets the CSP, prefetches included (review2 M6). Only exact static paths are skipped:
// the exclusions are anchored, so a look-alike such as /api/health-x or /favicon.ico.html is covered.
export const config = {
  matcher: ["/((?!_next/static/|_next/image$|favicon\\.ico$|api/health$).*)"],
};
