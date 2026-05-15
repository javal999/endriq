// @ts-nocheck
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  exchangeAuthorizationCode,
  expiresAtFromStrava,
} from "@/lib/strava/oauth";
import { verifyState, STATE_COOKIE } from "@/lib/oauth/state";
import { encryptToken } from "@/lib/oauth/tokens";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  const { searchParams, cookies } = new URL(request.url) as unknown as {
    searchParams: URLSearchParams;
    cookies: never;
  };
  // Read cookies from the request headers
  const reqCookies = request.headers.get("cookie") ?? "";
  const nonceCookie = parseCookie(reqCookies, STATE_COOKIE);

  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const err = searchParams.get("error");

  if (err) {
    redirect(`${base}/settings?strava=error&reason=${encodeURIComponent(err)}`);
  }

  if (!code || !stateParam) {
    redirect(
      `${base}/settings?strava=error&reason=${encodeURIComponent("missing_code_or_state")}`,
    );
  }

  // Require an active session — the state must match the logged-in user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`${base}/auth/login?redirect=${encodeURIComponent("/settings")}`);
  }

  // Verify signed state
  let athleteId: string;
  try {
    athleteId = verifyState(stateParam, nonceCookie, user.id);
  } catch (e) {
    const reason = e instanceof Error ? e.message : "invalid_state";
    redirect(`${base}/settings?strava=error&reason=${encodeURIComponent(reason)}`);
  }

  try {
    const token = await exchangeAuthorizationCode(code);
    const admin = createAdminClient();

    const { error } = await admin.from("oauth_connections").upsert(
      {
        athlete_id: athleteId,
        provider: "strava",
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        access_token_enc: encryptToken(token.access_token),
        refresh_token_enc: encryptToken(token.refresh_token),
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

  // Clear the state nonce cookie
  const response = NextResponse.redirect(`${base}/settings?strava=connected`);
  response.cookies.delete(STATE_COOKIE);
  return response;
}

function parseCookie(header: string, name: string): string | undefined {
  const prefix = `${name}=`;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return undefined;
}
