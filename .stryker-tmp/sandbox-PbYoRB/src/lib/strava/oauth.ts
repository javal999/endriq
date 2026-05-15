// @ts-nocheck
import type { StravaTokenResponse } from "./types";

const TOKEN_URL = "https://www.strava.com/oauth/token";

export async function exchangeAuthorizationCode(
  code: string,
): Promise<StravaTokenResponse> {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strava token exchange failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<StravaTokenResponse>;
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<StravaTokenResponse> {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strava refresh failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<StravaTokenResponse>;
}

/** Converts Strava `expires_at` (unix seconds) to ISO timestamp for Postgres. */
export function expiresAtFromStrava(expiresAtUnixSec: number): string {
  return new Date(expiresAtUnixSec * 1000).toISOString();
}
