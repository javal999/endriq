// @ts-nocheck
import { createAdminClient } from "@/lib/supabase/admin";
import { mapStravaActivityToWorkout } from "@/lib/strava/mapActivity";
import type { StravaSummaryActivity } from "@/lib/strava/types";
import {
  expiresAtFromStrava,
  refreshAccessToken,
} from "@/lib/strava/oauth";
import { readToken, encryptToken } from "@/lib/oauth/tokens";
import { withAthleteRefreshLock } from "@/lib/oauth/refreshLock";

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
      const { error: insErr } = await admin.from("workouts").insert(fresh);
      if (insErr) throw new Error(insErr.message);
      inserted += fresh.length;
    }

    if (activities.length < 100) break;
    page += 1;
  }

  return { fetchedPages, inserted };
}
