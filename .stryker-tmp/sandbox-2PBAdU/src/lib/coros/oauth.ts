/**
 * COROS Open Platform OAuth 2.0 helpers.
 * Mirrors src/lib/strava/oauth.ts with COROS-specific differences:
 *   - Token endpoint: opens.coros.com
 *   - expires_in (relative seconds) instead of expires_at (absolute unix)
 *   - Env vars: COROS_CLIENT_ID, COROS_CLIENT_SECRET
 */
// @ts-nocheck


import type { CorosTokenResponse } from "./types";

const TOKEN_URL = "https://open.coros.com/oauth2/accesstoken";

export async function exchangeAuthorizationCodeCoros(
  code: string,
): Promise<CorosTokenResponse> {
  const clientId = process.env.COROS_CLIENT_ID;
  const clientSecret = process.env.COROS_CLIENT_SECRET;
  const redirectUri =
    process.env.COROS_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")}/api/coros/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("Missing COROS_CLIENT_ID or COROS_CLIENT_SECRET");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`COROS token exchange failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<CorosTokenResponse>;
}

export async function refreshAccessTokenCoros(
  refreshToken: string,
): Promise<CorosTokenResponse> {
  const clientId = process.env.COROS_CLIENT_ID;
  const clientSecret = process.env.COROS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing COROS_CLIENT_ID or COROS_CLIENT_SECRET");
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
    throw new Error(`COROS refresh failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<CorosTokenResponse>;
}

/**
 * COROS returns `expires_in` (seconds from now); convert to ISO timestamp for Postgres.
 * Compute server-side to avoid client-clock drift.
 */
export function expiresAtFromCoros(expiresInSeconds: number): string {
  return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
}
