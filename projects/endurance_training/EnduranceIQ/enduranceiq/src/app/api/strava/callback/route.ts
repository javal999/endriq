import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  exchangeAuthorizationCode,
  expiresAtFromStrava,
} from "@/lib/strava/oauth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const err = searchParams.get("error");

  if (err) {
    redirect(
      `${base}/settings?strava=error&reason=${encodeURIComponent(err)}`,
    );
  }

  if (!code || !state) {
    redirect(
      `${base}/settings?strava=error&reason=${encodeURIComponent("missing_code_or_state")}`,
    );
  }

  const athleteId = state;

  try {
    const token = await exchangeAuthorizationCode(code);
    const admin = createAdminClient();

    const { error } = await admin.from("oauth_connections").upsert(
      {
        athlete_id: athleteId,
        provider: "strava",
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expires_at: expiresAtFromStrava(token.expires_at),
        scope: process.env.STRAVA_SCOPE ?? null,
        external_athlete_id: token.athlete?.id
          ? String(token.athlete.id)
          : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "athlete_id,provider" },
    );

    if (error) {
      redirect(
        `${base}/settings?strava=error&reason=${encodeURIComponent(error.message)}`,
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "token_exchange_failed";
    redirect(
      `${base}/settings?strava=error&reason=${encodeURIComponent(msg)}`,
    );
  }

  redirect(`${base}/settings?strava=connected`);
}
