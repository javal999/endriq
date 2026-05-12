import { NextResponse } from "next/server";
import { syncStravaActivities } from "@/lib/strava/syncActivities";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** POST JSON { athlete_id?: string } — pulls last ~90 days from Strava into `workouts`. */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    let athleteId = user.id;
    try {
      const body = (await request.json()) as { athlete_id?: string };
      if (body?.athlete_id != null && body.athlete_id !== athleteId) {
        return NextResponse.json(
          { ok: false, error: "Forbidden" },
          { status: 403 },
        );
      }
    } catch {
      /* empty body OK */
    }

    const result = await syncStravaActivities(athleteId);
    return NextResponse.json({ ok: true, athlete_id: athleteId, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "sync_failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
