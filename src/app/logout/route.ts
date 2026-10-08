import { NextResponse } from "next/server";
import { logout } from "@/lib/session";
import { config } from "@/lib/config";

// GET is used by the header link; it only ends the caller's own session.
export async function GET() {
  await logout();
  return NextResponse.redirect(new URL("/", config.siteUrl));
}
