import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  isAuthEnabled,
  verifySessionCookieValue,
} from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const enabled = isAuthEnabled();
  const signedIn = enabled
    ? await verifySessionCookieValue(req.cookies.get(AUTH_COOKIE_NAME)?.value)
    : true;
  return NextResponse.json({ authEnabled: enabled, signedIn });
}
