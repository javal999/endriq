/**
 * /api/daily-journal — T07 daily journal tags.
 *
 * POST { check_in_date, slept_well?, travelling?, stressed? }
 *   Upserts the (athlete, date) row; nullable booleans, only the supplied
 *   fields are written. RLS scopes to auth.uid().
 *
 * Refs: PHASE-2.1-BUILD.md §6 T07 step 3.
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

function asNullableBool(v: unknown): boolean | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v === "boolean") return v;
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

  if (!isIsoDate(body.check_in_date)) {
    return NextResponse.json(
      { ok: false, error: "check_in_date must be YYYY-MM-DD" },
      { status: 400 },
    );
  }

  const slept = asNullableBool(body.slept_well);
  const travel = asNullableBool(body.travelling);
  const stressed = asNullableBool(body.stressed);

  if (slept === undefined && travel === undefined && stressed === undefined) {
    return NextResponse.json(
      { ok: false, error: "supply at least one of slept_well / travelling / stressed" },
      { status: 400 },
    );
  }

  const patch: Record<string, unknown> = {
    athlete_id: user.id,
    check_in_date: body.check_in_date,
    updated_at: new Date().toISOString(),
  };
  if (slept !== undefined) patch.slept_well = slept;
  if (travel !== undefined) patch.travelling = travel;
  if (stressed !== undefined) patch.stressed = stressed;

  const { data, error } = await supabase
    .from("daily_journal_tags")
    .upsert(patch, { onConflict: "athlete_id,check_in_date" })
    .select("id, check_in_date, slept_well, travelling, stressed")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, journal: data });
}
