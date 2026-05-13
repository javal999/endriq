import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Starts COROS OAuth for the signed-in user (`state` = Supabase user id). */
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

  const auth = new URL("https://open.coros.com/oauth2/authorize");
  auth.searchParams.set("client_id", clientId);
  auth.searchParams.set("redirect_uri", redirectUri);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("scope", "activity.read");
  // state = user.id; CSRF hardening deferred to Task 11 (same gap as Strava)
  auth.searchParams.set("state", athleteId);

  redirect(auth.toString());
}
