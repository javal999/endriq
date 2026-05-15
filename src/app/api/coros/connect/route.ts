import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signState, STATE_COOKIE } from "@/lib/oauth/state";

export const runtime = "nodejs";

/** Starts COROS OAuth for the signed-in user. Binds signed state to session cookie. */
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
      `/settings?coros=error&reason=${encodeURIComponent("athlete_mismatch")}`,
    );
  }

  const clientId = process.env.COROS_CLIENT_ID;
  const redirectUri =
    process.env.COROS_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")}/api/coros/callback`;

  if (!clientId || !redirectUri) {
    redirect(
      `/settings?coros=error&reason=${encodeURIComponent("Missing COROS_CLIENT_ID or NEXT_PUBLIC_APP_URL")}`,
    );
  }

  const { state, nonce } = signState(user.id);

  const auth = new URL("https://open.coros.com/oauth2/authorize");
  auth.searchParams.set("client_id", clientId);
  auth.searchParams.set("redirect_uri", redirectUri);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("scope", "activity.read");
  auth.searchParams.set("state", state);

  const response = NextResponse.redirect(auth.toString());
  response.cookies.set(STATE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
