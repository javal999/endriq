import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapCorosActivityToWorkout } from "@/lib/coros/mapActivity";
import {
  expiresAtFromCoros,
  refreshAccessTokenCoros,
} from "@/lib/coros/oauth";
import { readToken, encryptToken } from "@/lib/oauth/tokens";
import { checkLimit, corosSyncLimit } from "@/lib/ratelimit";
import { withAthleteRefreshLock } from "@/lib/oauth/refreshLock";
import type { CorosActivityListResponse } from "@/lib/coros/types";

export const runtime = "nodejs";

const COROS_ACTIVITIES_URL = "https://open.coros.com/v2/coros/sport/list";

/** POST — pulls last ~90 days of COROS activities into `workouts`. */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    let athleteId = user.id;
    try {
      const body = (await request.json()) as { athlete_id?: string };
      if (body?.athlete_id != null && body.athlete_id !== athleteId) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
    } catch {
      /* empty body OK */
    }

    const { allowed } = await checkLimit(corosSyncLimit, athleteId);
    if (!allowed) {
      return NextResponse.json(
        { ok: false, error: "Too many sync requests — wait a few minutes." },
        { status: 429 },
      );
    }

    const admin = createAdminClient();

    const { data: athlete } = await admin
      .from("athletes")
      .select("observed_max_hr")
      .eq("id", athleteId)
      .single();

    const { data: conn } = await admin
      .from("oauth_connections")
      .select("*")
      .eq("athlete_id", athleteId)
      .eq("provider", "coros")
      .maybeSingle();

    if (!conn) {
      return NextResponse.json(
        { ok: false, error: "COROS is not connected. Open Settings and connect COROS." },
        { status: 400 },
      );
    }

    let accessToken = readToken(conn.access_token_enc as string, conn.access_token as string);

    // Refresh if near expiry (advisory lock prevents concurrent double-refresh)
    const exp = new Date(conn.expires_at as string).getTime();
    if (exp < Date.now() + 60_000) {
      await withAthleteRefreshLock(admin, athleteId, async () => {
        const refreshToken = readToken(conn.refresh_token_enc as string, conn.refresh_token as string);
        const refreshed = await refreshAccessTokenCoros(refreshToken);
        accessToken = refreshed.access_token;
        await admin
          .from("oauth_connections")
          .update({
            access_token: accessToken,
            refresh_token: refreshed.refresh_token,
            access_token_enc: encryptToken(accessToken),
            refresh_token_enc: encryptToken(refreshed.refresh_token),
            expires_at: expiresAtFromCoros(refreshed.expires_in),
            updated_at: new Date().toISOString(),
          })
          .eq("athlete_id", athleteId)
          .eq("provider", "coros");
      });
    }

    const observedMaxHr =
      typeof athlete?.observed_max_hr === "number" ? athlete.observed_max_hr : 185;

    const after = Math.floor((Date.now() - 90 * 24 * 3600 * 1000) / 1000);

    // COROS activity list — verify endpoint + params against current API docs
    const res = await fetch(
      `${COROS_ACTIVITIES_URL}?sportType=0&startDate=${after}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { ok: false, error: `COROS API error (${res.status}): ${text}` },
        { status: 502 },
      );
    }

    const json = (await res.json()) as CorosActivityListResponse;
    const activities = json.data?.sportDataList ?? [];

    let inserted = 0;
    for (const a of activities) {
      const row = mapCorosActivityToWorkout(athleteId, a, observedMaxHr);
      if (!row.source_id || row.duration_seconds <= 0) continue;

      const { error: upsertErr } = await admin.from("workouts").upsert(
        row,
        { onConflict: "athlete_id,source,started_at", ignoreDuplicates: true },
      );
      if (!upsertErr) inserted += 1;
    }

    // Update last sync time
    await admin
      .from("oauth_connections")
      .update({ updated_at: new Date().toISOString() })
      .eq("athlete_id", athleteId)
      .eq("provider", "coros");

    return NextResponse.json({
      ok: true,
      athlete_id: athleteId,
      fetched: activities.length,
      inserted,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "sync_failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
