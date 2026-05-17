/**
 * /api/strength-set-log — T09 per-set logging.
 *
 * POST { completion_id?, exercise_id, set_number, weight_kg?, reps?, rpe? }
 *       Upserts one set row keyed by (completion_id, exercise_id, set_number).
 *       completion_id is optional — when null, the row is athlete-scoped only
 *       and can be linked later when Mark Complete runs.
 *
 * Refs: PHASE-2.1-BUILD.md §6 T09 step 1-2.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkLimit, raceWriteLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

function isFiniteNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
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

  if (typeof body.exercise_id !== "string" || body.exercise_id.trim().length === 0) {
    return NextResponse.json(
      { ok: false, error: "exercise_id required" },
      { status: 400 },
    );
  }
  if (
    !isFiniteNum(body.set_number) ||
    !Number.isInteger(body.set_number) ||
    body.set_number < 1 ||
    body.set_number > 20
  ) {
    return NextResponse.json(
      { ok: false, error: "set_number must be integer 1-20" },
      { status: 400 },
    );
  }
  const weight = body.weight_kg == null ? null : Number(body.weight_kg);
  if (weight != null && (!isFiniteNum(weight) || weight < 0 || weight > 999.99)) {
    return NextResponse.json(
      { ok: false, error: "weight_kg must be 0-999.99" },
      { status: 400 },
    );
  }
  const reps = body.reps == null ? null : Number(body.reps);
  if (
    reps != null &&
    (!isFiniteNum(reps) || !Number.isInteger(reps) || reps < 0 || reps > 200)
  ) {
    return NextResponse.json(
      { ok: false, error: "reps must be integer 0-200" },
      { status: 400 },
    );
  }
  const rpe = body.rpe == null ? null : Number(body.rpe);
  if (rpe != null && (!isFiniteNum(rpe) || rpe < 1 || rpe > 10)) {
    return NextResponse.json(
      { ok: false, error: "rpe must be 1-10" },
      { status: 400 },
    );
  }
  const completionId =
    typeof body.completion_id === "string" && body.completion_id.length > 0
      ? body.completion_id
      : null;

  const { data, error } = await supabase
    .from("strength_set_logs")
    .upsert(
      {
        athlete_id: user.id,
        completion_id: completionId,
        exercise_id: body.exercise_id.trim(),
        set_number: body.set_number,
        weight_kg: weight,
        reps,
        rpe,
        logged_at: new Date().toISOString(),
      },
      { onConflict: "completion_id,exercise_id,set_number" },
    )
    .select("id, exercise_id, set_number, weight_kg, reps, rpe, logged_at")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, setLog: data });
}
