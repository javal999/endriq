/**
 * /api/planned-session — per-date override CRUD (F9).
 *
 * PUT    { planned_date, sessions, coach_instruction_text?, interpretation_json? }
 *          upsert override for (athlete, date)
 * DELETE ?planned_date=YYYY-MM-DD
 *          remove override; date falls back to typical-week pattern
 *
 * RLS policy planned_sessions_own scopes by athlete_id = auth.uid().
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.2; PHASE-2.0-BUILD.md T07 step 8.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkLimit, raceWriteLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

function isIsoDate(s: unknown): s is string {
  if (typeof s !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime());
}

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }),
      supabase: null,
      userId: null,
    } as const;
  }
  // Reuse the race write limiter — 20/min/user is plenty for both surfaces.
  const { allowed } = await checkLimit(raceWriteLimit, user.id);
  if (!allowed) {
    return {
      error: NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 }),
      supabase: null,
      userId: null,
    } as const;
  }
  return { error: null, supabase, userId: user.id } as const;
}

export async function PUT(request: Request) {
  const a = await authed();
  if (a.error) return a.error;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!isIsoDate(body.planned_date)) {
    return NextResponse.json(
      { ok: false, error: "planned_date must be YYYY-MM-DD" },
      { status: 400 },
    );
  }
  if (!Array.isArray(body.sessions)) {
    return NextResponse.json({ ok: false, error: "sessions must be array" }, { status: 400 });
  }

  const payload = {
    athlete_id: a.userId,
    planned_date: body.planned_date,
    sessions: body.sessions,
    coach_instruction_text:
      typeof body.coach_instruction_text === "string"
        ? body.coach_instruction_text
        : null,
    interpretation_json: body.interpretation_json ?? null,
  };

  const { data, error } = await a.supabase
    .from("planned_sessions")
    .upsert(payload, { onConflict: "athlete_id,planned_date" })
    .select(
      "id, athlete_id, planned_date, sessions, interpretation_json, coach_instruction_text, updated_at",
    )
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, plannedSession: data });
}

export async function DELETE(request: Request) {
  const a = await authed();
  if (a.error) return a.error;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("planned_date");
  if (!isIsoDate(date)) {
    return NextResponse.json(
      { ok: false, error: "planned_date must be YYYY-MM-DD" },
      { status: 400 },
    );
  }

  const { error } = await a.supabase
    .from("planned_sessions")
    .delete()
    .eq("athlete_id", a.userId)
    .eq("planned_date", date);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
