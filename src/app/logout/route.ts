import { NextResponse } from "next/server";
import { logout } from "@/lib/session";
import { config } from "@/lib/config";

// POST only (review L4): a link or image elsewhere cannot sign someone out.
// Same-origin is enforced by SameSite=Lax cookies plus this Origin check.
export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(config.siteUrl).origin) return new NextResponse("Forbidden", { status: 403 });
  await logout();
  return NextResponse.redirect(new URL("/", config.siteUrl), { status: 303 });
}

export function GET() {
  return NextResponse.redirect(new URL("/", config.siteUrl));
}
