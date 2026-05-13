import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  exchangeAuthorizationCodeCoros,
  expiresAtFromCoros,
} from "@/lib/coros/oauth";
import { verifyState, STATE_COOKIE } from "@/lib/oauth/state";
import { encryptToken } from "@/lib/oauth/tokens";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  const { searchParams } = new URL(request.url);
  const nonceCookie = parseCookie(request.headers.get("cookie") ?? "", STATE_COOKIE);

  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const err = searchParams.get("error");

  if (err) {
    redirect(`${base}/settings?coros=error&reason=${encodeURIComponent(err)}`);
  }
  if (!code || !stateParam) {
    redirect(
      `${base}/settings?coros=error&reason=${encodeURIComponent("missing_code_or_state")}`,
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`${base}/auth/login?redirect=${encodeURIComponent("/settings")}`);
  }

  let athleteId: string;
  try {
    athleteId = verifyState(stateParam, nonceCookie, user.id);
  } catch (e) {
    const reason = e instanceof Error ? e.message : "invalid_state";
    redirect(`${base}/settings?coros=error&reason=${encodeURIComponent(reason)}`);
  }

  try {
    const token = await exchangeAuthorizationCodeCoros(code);
    const admin = createAdminClient();

    const { error } = await admin.from("oauth_connections").upsert(
      {
        athlete_id: athleteId,
        provider: "coros",
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        access_token_enc: encryptToken(token.access_token),
        refresh_token_enc: encryptToken(token.refresh_token),
        expires_at: expiresAtFromCoros(token.expires_in),
        scope: "activity.read",
        external_athlete_id: token.openId ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "athlete_id,provider" },
    );

    if (error) {
      redirect(
        `${base}/settings?coros=error&reason=${encodeURIComponent(error.message)}`,
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "token_exchange_failed";
    redirect(
      `${base}/settings?coros=error&reason=${encodeURIComponent(msg)}`,
    );
  }

  const response = NextResponse.redirect(`${base}/settings?coros=connected`);
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
