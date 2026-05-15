// @ts-nocheck
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signState, STATE_COOKIE } from "@/lib/oauth/state";

export const runtime = "nodejs";

/** Starts Strava OAuth for the signed-in user. Binds signed state to session cookie. */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/login?redirect=${encodeURIComponent("/settings")}`);
  }

  const { searchParams } = new URL(request.url);
  const requested = searchParams.get("athlete_id");
  const athleteId = requested ?? user.id;
  if (athleteId !== user.id) {
    redirect(
      `/settings?strava=error&reason=${encodeURIComponent("athlete_mismatch")}`,
    );
  }

  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri =
    process.env.STRAVA_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")}/api/strava/callback`;

  if (!clientId || !redirectUri) {
    redirect(
      `/settings?strava=error&reason=${encodeURIComponent("Missing STRAVA_CLIENT_ID or STRAVA_REDIRECT_URI / NEXT_PUBLIC_APP_URL")}`,
    );
  }

  const scope =
    process.env.STRAVA_SCOPE ?? "read,activity:read,activity:read_all";

  // Generate signed state + nonce
  const { state, nonce } = signState(user.id);

  const auth = new URL("https://www.strava.com/oauth/authorize");
  auth.searchParams.set("client_id", clientId);
  auth.searchParams.set("redirect_uri", redirectUri);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("approval_prompt", "force");
  auth.searchParams.set("scope", scope);
  auth.searchParams.set("state", state);

  const response = NextResponse.redirect(auth.toString());
  response.cookies.set(STATE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600, // 10 min — matches STATE_TTL_MS
    path: "/",
  });
  return response;
}
