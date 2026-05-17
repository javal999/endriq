/**
 * /api/recovery-check-in — F11 nightly feeling log.
 *
 * POST { check_in_date, feeling }
 *      Upserts the (athlete, date) row; RLS scopes to auth.uid().
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.4 F11; PHASE-2.0-BUILD.md T12 step 5.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkLimit, raceWriteLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const FEELINGS = new Set(["sharp", "okay", "tired"]);

function isIsoDate(s: unknown): s is string {
  if (typeof s !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime());
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { allowed } = await checkLimit(raceWriteLimit, user.id);
  if (!allowed) {
    return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!isIsoDate(body.check_in_date)) {
    return NextResponse.json(
      { ok: false, error: "check_in_date must be YYYY-MM-DD" },
      { status: 400 },
    );
  }
  if (typeof body.feeling !== "string" || !FEELINGS.has(body.feeling)) {
    return NextResponse.json(
      { ok: false, error: "feeling must be sharp | okay | tired" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("recovery_check_in")
    .upsert(
      {
        athlete_id: user.id,
        check_in_date: body.check_in_date,
        feeling: body.feeling,
      },
      { onConflict: "athlete_id,check_in_date" },
    )
    .select("id, check_in_date, feeling, created_at")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, checkIn: data });
}
