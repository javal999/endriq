// @ts-nocheck
import crypto from "node:crypto";
import { waitUntil } from "@vercel/functions";
import type { NextRequest } from "next/server";
import { generateWeeklyAnalysis } from "@/lib/analytics/weekly-analysis";
import { createAdminClient } from "@/lib/supabase/admin";
import { utcIsoMondayContainingTimestamp } from "@/lib/report/date";
import { mapStravaActivityToWorkout } from "@/lib/strava/mapActivity";
import {
  expiresAtFromStrava,
  refreshAccessToken,
} from "@/lib/strava/oauth";
import { readToken, encryptToken } from "@/lib/oauth/tokens";
import { withAthleteRefreshLock } from "@/lib/oauth/refreshLock";
import type { StravaSummaryActivity } from "@/lib/strava/types";

export const runtime = "nodejs";

type StravaWebhookEvent = {
  aspect_type?: string;
  object_id?: number;
  object_type?: string;
  owner_id?: number;
};

function observedMaxFromActivity(
  profileHr: number | null | undefined,
  a: StravaSummaryActivity,
): number {
  let peak = profileHr ?? 0;
  if (typeof a.max_heartrate === "number") {
    peak = Math.max(peak, Math.round(a.max_heartrate));
  }
  if (typeof a.average_heartrate === "number") {
    peak = Math.max(peak, Math.round(a.average_heartrate));
  }
  if (peak <= 0) return 185;
  return peak;
}

async function upsertStravaWorkout(
  admin: ReturnType<typeof createAdminClient>,
  row: ReturnType<typeof mapStravaActivityToWorkout>,
): Promise<void> {
  const { data: existing } = await admin
    .from("workouts")
    .select("id")
    .eq("athlete_id", row.athlete_id)
    .eq("source", "strava")
    .eq("source_id", row.source_id)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await admin.from("workouts").update(row).eq("id", existing.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await admin.from("workouts").insert(row);
  if (error) throw new Error(error.message);
}

async function processStravaWebhookEvent(event: StravaWebhookEvent): Promise<void> {
  const admin = createAdminClient();

  const { data: conn, error: connErr } = await admin
    .from("oauth_connections")
    .select("athlete_id, access_token, refresh_token, access_token_enc, refresh_token_enc, expires_at")
    .eq("provider", "strava")
    .eq("external_athlete_id", String(event.owner_id))
    .maybeSingle();

  if (connErr) {
    console.error("[webhook] oauth lookup:", connErr.message);
    return;
  }
  if (!conn) {
    console.warn(`[webhook] No connection for Strava owner ${String(event.owner_id)}`);
    return;
  }

  let accessToken = readToken(conn.access_token_enc as string, conn.access_token as string);
  let refreshToken = readToken(conn.refresh_token_enc as string, conn.refresh_token as string);
  const expMs = new Date(conn.expires_at as string).getTime();
  if (expMs < Date.now() + 60_000) {
    await withAthleteRefreshLock(admin, conn.athlete_id as string, async () => {
      const refreshed = await refreshAccessToken(refreshToken);
      accessToken = refreshed.access_token;
      refreshToken = refreshed.refresh_token;
      const { error: upErr } = await admin
        .from("oauth_connections")
        .update({
          access_token: accessToken,
          refresh_token: refreshToken,
          access_token_enc: encryptToken(accessToken),
          refresh_token_enc: encryptToken(refreshToken),
          expires_at: expiresAtFromStrava(refreshed.expires_at),
          updated_at: new Date().toISOString(),
        })
        .eq("athlete_id", conn.athlete_id)
        .eq("provider", "strava");
      if (upErr) throw new Error(upErr.message);
    });
  }

  const activityId = event.object_id;
  if (typeof activityId !== "number") return;

  const activityRes = await fetch(
    `https://www.strava.com/api/v3/activities/${activityId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!activityRes.ok) {
    console.error(`[webhook] Strava API error: ${activityRes.status}`);
    return;
  }

  const activity = (await activityRes.json()) as StravaSummaryActivity;

  const { data: athlete } = await admin
    .from("athletes")
    .select("observed_max_hr")
    .eq("id", conn.athlete_id)
    .maybeSingle();

  const observedMaxHr = observedMaxFromActivity(
    athlete?.observed_max_hr ?? null,
    activity,
  );

  const row = mapStravaActivityToWorkout(conn.athlete_id, activity, observedMaxHr);
  await upsertStravaWorkout(admin, row);

  const weekStart = utcIsoMondayContainingTimestamp(row.started_at);
  await generateWeeklyAnalysis(conn.athlete_id, weekStart, admin);
}

/**
 * Strava Push API subscription (Phase 1 Task 4).
 *
 * GET — subscription validation (`hub.mode`, `hub.verify_token`, `hub.challenge`).
 * POST — activity events (create/update). Acknowledges immediately; processes async.
 */
export async function GET(request: NextRequest) {
  const verify = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN?.trim();
  if (!verify) {
    return new Response("STRAVA_WEBHOOK_VERIFY_TOKEN not configured", {
      status: 503,
    });
  }

  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === verify &&
    challenge != null &&
    challenge.length > 0
  ) {
    return Response.json({ "hub.challenge": challenge });
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  // Verify HMAC signature — Strava signs with STRAVA_CLIENT_SECRET.
  // Header: X-Hub-Signature (format: sha256=<hex>).
  // Note: Strava docs historically mention both X-Hub-Signature and X-Strava-Signature;
  // the live API uses X-Hub-Signature as of 2025.
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature");
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (clientSecret) {
    const expected =
      "sha256=" +
      crypto
        .createHmac("sha256", clientSecret)
        .update(rawBody)
        .digest("hex");

    if (
      !signature ||
      signature.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    ) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  let event: StravaWebhookEvent;
  try {
    event = JSON.parse(rawBody) as StravaWebhookEvent;
  } catch {
    return Response.json({ ok: true });
  }

  if (event.object_type !== "activity") {
    return Response.json({ ok: true });
  }

  if (event.aspect_type !== "create" && event.aspect_type !== "update") {
    return Response.json({ ok: true });
  }

  waitUntil(processStravaWebhookEvent(event).catch((err) => {
    console.error("[webhook] Processing error:", err);
  }));

  return Response.json({ ok: true });
}
