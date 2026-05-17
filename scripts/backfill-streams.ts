/**
 * One-time backfill: populate `workouts.hr_per_km` for existing run
 * workouts that pre-date the T10 stream-ingestion code path.
 *
 * After Phase 2.1 ships, only NEW runs get streams (via syncActivities
 * and the webhook). Existing runs in the DB have `hr_per_km IS NULL`
 * and `streams_status IS NULL`. This script walks them, fetches streams
 * from Strava, and updates each row.
 *
 *   NEXT_PUBLIC_SUPABASE_URL=<url> \
 *   SUPABASE_SERVICE_ROLE_KEY=<key> \
 *   TOKEN_ENCRYPTION_KEY=<key> \
 *   npx tsx scripts/backfill-streams.ts [--athlete-id <uuid>] [--limit 200] [--since 2026-01-01]
 *
 * Rate-limit policy:
 *   Strava free tier = 200 requests / 15 min. We default to 1.5 seconds
 *   between fetches (≈ 600/15min upper bound) and stop after `--limit`
 *   workouts per run. Re-run as many times as you like; idempotent on
 *   `streams_status` (re-running skips already-processed rows).
 *
 * Refs: PHASE-2.1-BUILD.md §6 T10 step 5; PHASE-2.1-AUDIT.md follow-up.
 */

import { createClient } from "@supabase/supabase-js";
import {
  fetchActivityStreamsDetailed,
} from "../src/lib/strava/streams";
import { bucketHrByKm } from "../src/lib/strava/bucketHrByKm";
import {
  expiresAtFromStrava,
  refreshAccessToken,
} from "../src/lib/strava/oauth";
import { readToken, encryptToken } from "../src/lib/oauth/tokens";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("ERROR: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!process.env.TOKEN_ENCRYPTION_KEY) {
  console.error("ERROR: TOKEN_ENCRYPTION_KEY is required to decrypt OAuth tokens");
  process.exit(1);
}

interface Args {
  athleteId: string | null;
  limit: number;
  since: string | null;
  delayMs: number;
}

function parseArgs(): Args {
  const a: Args = { athleteId: null, limit: 200, since: null, delayMs: 1500 };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--athlete-id" && next) { a.athleteId = next; i += 1; continue; }
    if (arg === "--limit" && next) { a.limit = Math.max(1, Math.min(2000, Number(next))); i += 1; continue; }
    if (arg === "--since" && next) { a.since = next; i += 1; continue; }
    if (arg === "--delay-ms" && next) { a.delayMs = Math.max(0, Number(next)); i += 1; continue; }
  }
  return a;
}

const args = parseArgs();
const admin = createClient(url, key);

interface OAuthRow {
  athlete_id: string;
  access_token: string | null;
  refresh_token: string | null;
  access_token_enc: string | null;
  refresh_token_enc: string | null;
  expires_at: string;
}

async function getValidAccessToken(conn: OAuthRow): Promise<string> {
  let accessToken = readToken(conn.access_token_enc ?? "", conn.access_token ?? "");
  let refreshToken = readToken(conn.refresh_token_enc ?? "", conn.refresh_token ?? "");
  const expMs = new Date(conn.expires_at).getTime();
  if (expMs > Date.now() + 60_000) return accessToken;

  const refreshed = await refreshAccessToken(refreshToken);
  accessToken = refreshed.access_token;
  refreshToken = refreshed.refresh_token;
  const { error } = await admin
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
  if (error) throw new Error(`refresh upsert failed: ${error.message}`);
  return accessToken;
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function main() {
  console.log(`[backfill-streams] starting with`, args);

  let q = admin
    .from("workouts")
    .select("id, athlete_id, source_id, started_at, streams_status")
    .eq("sport_type", "run")
    .eq("source", "strava")
    .is("hr_per_km", null)
    .is("streams_status", null)
    .order("started_at", { ascending: false })
    .limit(args.limit);

  if (args.athleteId) q = q.eq("athlete_id", args.athleteId);
  if (args.since) q = q.gte("started_at", `${args.since}T00:00:00Z`);

  const { data: workouts, error: wErr } = await q;
  if (wErr) { console.error(wErr); process.exit(1); }
  if (!workouts || workouts.length === 0) {
    console.log("[backfill-streams] nothing to do");
    return;
  }
  console.log(`[backfill-streams] ${workouts.length} run workouts to process`);

  // Group by athlete so we resolve tokens once per athlete
  const byAthlete = new Map<string, typeof workouts>();
  for (const w of workouts) {
    const arr = byAthlete.get(w.athlete_id) ?? [];
    arr.push(w);
    byAthlete.set(w.athlete_id, arr);
  }

  let fetched = 0;
  let unavailable = 0;
  let failed = 0;

  for (const [athleteId, list] of byAthlete) {
    const { data: connRaw, error: cErr } = await admin
      .from("oauth_connections")
      .select(
        "athlete_id, access_token, refresh_token, access_token_enc, refresh_token_enc, expires_at",
      )
      .eq("athlete_id", athleteId)
      .eq("provider", "strava")
      .maybeSingle();
    if (cErr || !connRaw) {
      console.warn(`  athlete ${athleteId.slice(0, 8)} — no Strava connection, skipping ${list.length} rows`);
      continue;
    }
    let accessToken: string;
    try {
      accessToken = await getValidAccessToken(connRaw as OAuthRow);
    } catch (e) {
      console.warn(`  athlete ${athleteId.slice(0, 8)} — token refresh failed: ${(e as Error).message}`);
      continue;
    }

    console.log(`  athlete ${athleteId.slice(0, 8)} — ${list.length} workouts`);
    for (const w of list) {
      const activityId = Number(w.source_id);
      if (!Number.isFinite(activityId)) {
        console.warn(`    workout ${w.id.slice(0, 8)} — bad source_id, skipping`);
        continue;
      }
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
            .eq("id", w.id);
          unavailable += 1;
          process.stdout.write(`.`);
        } else {
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
            .eq("id", w.id);
          fetched += 1;
          process.stdout.write(`✓`);
        }
      } else {
        const status = outcome.kind === "unavailable" ? "unavailable" : "failed";
        await admin
          .from("workouts")
          .update({
            streams_status: status,
            streams_fetched_at: new Date().toISOString(),
          })
          .eq("id", w.id);
        if (status === "unavailable") {
          unavailable += 1;
          process.stdout.write(`.`);
        } else {
          failed += 1;
          process.stdout.write(`✗`);
        }
      }
      await sleep(args.delayMs);
    }
    process.stdout.write(`\n`);
  }

  console.log(`\n[backfill-streams] done`);
  console.log(`  fetched:     ${fetched}`);
  console.log(`  unavailable: ${unavailable}`);
  console.log(`  failed:      ${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
