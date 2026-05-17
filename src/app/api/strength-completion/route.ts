/**
 * /api/strength-completion — F10 "Mark complete" persistence.
 *
 * POST { session_id, perceived_rpe?, duration_minutes?, notes? }
 *       Logs a completion against the athlete's row.
 *
 * RLS strength_completions_own scopes by athlete_id = auth.uid().
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.3 F10; PHASE-2.0-BUILD.md T09 step 7.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkLimit, raceWriteLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

function isInt(v: unknown, min: number, max: number): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
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

  if (typeof body.session_id !== "string" || body.session_id.trim().length === 0) {
    return NextResponse.json(
      { ok: false, error: "session_id required" },
      { status: 400 },
    );
  }
  if (body.session_id.length > 200) {
    return NextResponse.json(
      { ok: false, error: "session_id too long" },
      { status: 400 },
    );
  }

  const perceivedRpe =
    body.perceived_rpe == null ? null : Number(body.perceived_rpe);
  if (perceivedRpe != null && !isInt(perceivedRpe, 1, 10)) {
    return NextResponse.json(
      { ok: false, error: "perceived_rpe must be an integer 1-10" },
      { status: 400 },
    );
  }
  const durationMinutes =
    body.duration_minutes == null ? null : Number(body.duration_minutes);
  if (durationMinutes != null && !isInt(durationMinutes, 1, 600)) {
    return NextResponse.json(
      { ok: false, error: "duration_minutes must be an integer 1-600" },
      { status: 400 },
    );
  }
  const notes =
    typeof body.notes === "string" && body.notes.length <= 1000 ? body.notes : null;

  const { data, error } = await supabase
    .from("strength_completions")
    .insert({
      athlete_id: user.id,
      session_id: body.session_id.trim(),
      perceived_rpe: perceivedRpe,
      duration_minutes: durationMinutes,
      notes,
    })
    .select("id, session_id, completed_at, perceived_rpe, duration_minutes, notes")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, completion: data });
}
