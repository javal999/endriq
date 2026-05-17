/**
 * /api/strength-completion — F10 "Mark complete" persistence.
 *
 * POST  { session_id, perceived_rpe?, duration_minutes?, notes?, post_session_feel? }
 *       Logs a completion. post_session_feel is the T08 survey response and is
 *       optional on initial save (often set via PATCH after the user picks).
 *
 * PATCH { id, post_session_feel }
 *       Updates an existing completion with the T08 survey response.
 *
 * RLS strength_completions_own scopes by athlete_id = auth.uid().
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.3 F10; PHASE-2.0-BUILD.md T09 step 7;
 *       PHASE-2.1-BUILD.md §6 T08 step 2.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkLimit, raceWriteLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

function isInt(v: unknown, min: number, max: number): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
}

const POST_SESSION_FEELS = new Set([
  "easier_than_expected",
  "right",
  "harder_than_expected",
]);

function asFeel(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v === "string" && POST_SESSION_FEELS.has(v)) return v;
  return undefined;
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

  const feel = asFeel(body.post_session_feel);
  if (body.post_session_feel !== undefined && feel === undefined) {
    return NextResponse.json(
      {
        ok: false,
        error: "post_session_feel must be easier_than_expected | right | harder_than_expected",
      },
      { status: 400 },
    );
  }

  const insertRow: Record<string, unknown> = {
    athlete_id: user.id,
    session_id: body.session_id.trim(),
    perceived_rpe: perceivedRpe,
    duration_minutes: durationMinutes,
    notes,
  };
  if (feel !== undefined) insertRow.post_session_feel = feel;

  const { data, error } = await supabase
    .from("strength_completions")
    .insert(insertRow)
    .select(
      "id, session_id, completed_at, perceived_rpe, duration_minutes, notes, post_session_feel",
    )
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, completion: data });
}

export async function PATCH(request: Request) {
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

  if (typeof body.id !== "string" || body.id.length === 0) {
    return NextResponse.json(
      { ok: false, error: "id required" },
      { status: 400 },
    );
  }
  const feel = asFeel(body.post_session_feel);
  if (feel === undefined) {
    return NextResponse.json(
      {
        ok: false,
        error: "post_session_feel must be easier_than_expected | right | harder_than_expected",
      },
      { status: 400 },
    );
  }

  // RLS guarantees the athlete can only update their own rows.
  const { data, error } = await supabase
    .from("strength_completions")
    .update({ post_session_feel: feel })
    .eq("id", body.id)
    .eq("athlete_id", user.id)
    .select("id, post_session_feel")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, completion: data });
}
