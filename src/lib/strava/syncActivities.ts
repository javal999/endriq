import { createAdminClient } from "@/lib/supabase/admin";
import { mapStravaActivityToWorkout } from "@/lib/strava/mapActivity";
import type { StravaSummaryActivity } from "@/lib/strava/types";
import {
  expiresAtFromStrava,
  refreshAccessToken,
} from "@/lib/strava/oauth";
import { readToken, encryptToken } from "@/lib/oauth/tokens";
import { withAthleteRefreshLock } from "@/lib/oauth/refreshLock";
import { fetchActivityStreamsDetailed } from "@/lib/strava/streams";
import { bucketHrByKm } from "@/lib/strava/bucketHrByKm";

/** T10: cap per-sync streams fetches to stay well under Strava's 200 req/15min budget. */
const STREAMS_PER_SYNC_CAP = 100;

function deriveObservedMaxHr(
  activities: StravaSummaryActivity[],
  profileFallback: number | null,
): number {
  let peak = profileFallback ?? 0;
  for (const a of activities) {
    if (typeof a.max_heartrate === "number")
      peak = Math.max(peak, Math.round(a.max_heartrate));
    if (typeof a.average_heartrate === "number")
      peak = Math.max(peak, Math.round(a.average_heartrate));
  }
  if (peak <= 0) return 185;
  return peak;
}

/**
 * Pull recent Strava activities into `workouts` for one athlete (single-user Phase 0).
 * Uses OAuth row stored by `/api/strava/callback`. Refreshes access token when near expiry.
 */
export async function syncStravaActivities(
  athleteId: string,
  windowDays = 90,
): Promise<{ fetchedPages: number; inserted: number }> {
  const admin = createAdminClient();

  const { data: athlete, error: athErr } = await admin
    .from("athletes")
    .select("observed_max_hr")
    .eq("id", athleteId)
    .single();

  if (athErr || !athlete) {
    throw new Error(`Athlete not found: ${athErr?.message ?? athleteId}`);
  }

  const { data: conn, error: connErr } = await admin
    .from("oauth_connections")
    .select("*")
    .eq("athlete_id", athleteId)
    .eq("provider", "strava")
    .maybeSingle();

  if (connErr || !conn) {
    throw new Error(
      "Strava is not connected for this athlete. Open Settings and connect Strava.",
    );
  }

  let accessToken = readToken(conn.access_token_enc as string, conn.access_token as string);
  let refreshToken = readToken(conn.refresh_token_enc as string, conn.refresh_token as string);

  const exp = new Date(conn.expires_at as string).getTime();
  if (exp < Date.now() + 60_000) {
    // Advisory lock prevents concurrent webhook + sync from double-refreshing
    await withAthleteRefreshLock(admin, athleteId, async () => {
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
        .eq("athlete_id", athleteId)
        .eq("provider", "strava");
      if (upErr) throw new Error(upErr.message);
    });
  }

  const after = Math.floor(Date.now() / 1000) - windowDays * 24 * 3600;
  let page = 1;
  let inserted = 0;
  let fetchedPages = 0;
  // T10: collect freshly-inserted run workouts so we can fetch streams
  // after the summary inserts complete (single round-trip per workout).
  const runStreamsQueue: Array<{
    workoutId: string;
    sourceId: string;
  }> = [];

  while (true) {
    const url = new URL("https://www.strava.com/api/v3/athlete/activities");
    url.searchParams.set("after", String(after));
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", "100");

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Strava activities failed (${res.status}): ${text}`);
    }

    const activities = (await res.json()) as StravaSummaryActivity[];
    fetchedPages += 1;

    if (!Array.isArray(activities) || activities.length === 0) break;

    const observedMaxHr = deriveObservedMaxHr(
      activities,
      athlete.observed_max_hr,
    );

    const rows = activities.map((a) =>
      mapStravaActivityToWorkout(athleteId, a, observedMaxHr),
    );
    const ids = rows.map((r) => r.source_id);

    const { data: existing, error: exErr } = await admin
      .from("workouts")
      .select("source_id")
      .eq("athlete_id", athleteId)
      .eq("source", "strava")
      .in("source_id", ids);

    if (exErr) throw new Error(exErr.message);

    const seen = new Set(
      (existing ?? []).map((e: { source_id: string }) => e.source_id),
    );
    const fresh = rows.filter((r) => !seen.has(r.source_id));

    if (fresh.length > 0) {
      const { data: insertedRows, error: insErr } = await admin
        .from("workouts")
        .insert(fresh)
        .select("id, source_id, sport_type");
      if (insErr) throw new Error(insErr.message);
      inserted += fresh.length;
      // T10: only running activities benefit from per-km HR
      for (const row of insertedRows ?? []) {
        if (row.sport_type === "run") {
          runStreamsQueue.push({
            workoutId: String(row.id),
            sourceId: String(row.source_id),
          });
          if (runStreamsQueue.length >= STREAMS_PER_SYNC_CAP) break;
        }
      }
    }

    if (activities.length < 100) break;
    page += 1;
  }

  // T10: fetch streams for newly-inserted run workouts, capped per sync.
  // Failures are recorded (streams_status='failed') but do not abort the sync.
  const toFetch = runStreamsQueue.slice(0, STREAMS_PER_SYNC_CAP);
  for (const item of toFetch) {
    await persistStreamsForWorkout(item.workoutId, item.sourceId, accessToken);
  }

  return { fetchedPages, inserted };
}

/**
 * Public — webhook handler imports this when a single activity is created.
 * Pass the workout row id and Strava activity id.
 */
export async function fetchAndPersistStreams(
  workoutId: string,
  sourceId: string,
  accessToken: string,
): Promise<void> {
  await persistStreamsForWorkout(workoutId, sourceId, accessToken);
}

async function persistStreamsForWorkout(
  workoutId: string,
  sourceId: string,
  accessToken: string,
): Promise<void> {
  const admin = createAdminClient();
  const activityId = Number(sourceId);
  if (!Number.isFinite(activityId)) return;

  const outcome = await fetchActivityStreamsDetailed(activityId, accessToken);
  if (outcome.kind === "ok") {
    const buckets = bucketHrByKm(outcome.streams);
    if (buckets.length === 0) {
      await admin
        .from("workouts")
        .update({
          streams_status: "unavailable",
          streams_fetched_at: new Date().toISOString(),
        })
        .eq("id", workoutId);
      return;
    }
    await admin
      .from("workouts")
      .update({
        hr_per_km: {
          km: buckets,
          resolution: outcome.streams.resolution,
          source: "strava_streams_v3",
        },
        streams_status: "fetched",
        streams_fetched_at: new Date().toISOString(),
      })
      .eq("id", workoutId);
  } else {
    await admin
      .from("workouts")
      .update({
        streams_status: outcome.kind === "unavailable" ? "unavailable" : "failed",
        streams_fetched_at: new Date().toISOString(),
      })
      .eq("id", workoutId);
  }
}
