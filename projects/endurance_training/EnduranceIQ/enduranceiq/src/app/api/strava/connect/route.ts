import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Starts Strava OAuth for the signed-in user (`state` = Supabase user id). */
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

  const auth = new URL("https://www.strava.com/oauth/authorize");
  auth.searchParams.set("client_id", clientId);
  auth.searchParams.set("redirect_uri", redirectUri);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("approval_prompt", "force");
  auth.searchParams.set("scope", scope);
  auth.searchParams.set("state", athleteId);

  redirect(auth.toString());
}
