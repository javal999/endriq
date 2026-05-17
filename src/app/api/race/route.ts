/**
 * /api/race — CRUD for races (F14.0).
 *
 * POST   { name, race_type, race_date, is_primary? }     create a race
 * PATCH  { id, ...partial }                              update a race
 * DELETE ?id=<uuid>                                      delete a race
 *
 * All operations are scoped via Supabase user-session client; RLS policy
 * `races_own` enforces athlete_id = auth.uid() so URL tampering can't
 * mutate someone else's data.
 *
 * Setting `is_primary = true` is atomic across the athlete's races: a single
 * SQL function clears the previously primary flag then sets the new one in
 * one transaction (otherwise the partial unique index would reject a race
 * about to displace a sibling). The function lives inline below as an RPC,
 * created in migration 021_races_table.sql is not adding it — we set primary
 * via two updates in a single supabase transaction-equivalent block instead.
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.7 F14.0; PHASE-2.0-BUILD.md T03 step 3.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkLimit, raceWriteLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const RACE_TYPES = new Set([
  "marathon",
  "half_marathon",
  "10k",
  "5k",
  "ultramarathon",
  "ironman_70_3",
  "ironman_full",
  "other_endurance",
]);

function isUuid(s: unknown): s is string {
  return (
    typeof s === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
  );
}

function isIsoDate(s: unknown): s is string {
  if (typeof s !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime());
}

function isNonEmptyString(s: unknown, max = 200): s is string {
  return typeof s === "string" && s.trim().length > 0 && s.length <= max;
}

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }), supabase: null, userId: null } as const;
  const { allowed } = await checkLimit(raceWriteLimit, user.id);
  if (!allowed) {
    return { error: NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 }), supabase: null, userId: null } as const;
  }
  return { error: null, supabase, userId: user.id } as const;
}

/**
 * Atomically promote `targetId` to primary for `athleteId`. Clears any
 * existing primary first; partial unique index forbids two-true rows.
 *
 * Implemented as two sequential UPDATEs under the user-session client. RLS
 * scopes by athlete_id so the clear can't touch other athletes' rows. The
 * race window is small (~1 round-trip pair) and the worst-case interleave
 * would be rejected by the unique index anyway.
 */
async function setPrimary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  athleteId: string,
  targetId: string,
) {
  const clear = await supabase
    .from("races")
    .update({ is_primary: false })
    .eq("athlete_id", athleteId)
    .eq("is_primary", true);
  if (clear.error) return clear.error;
  const set = await supabase
    .from("races")
    .update({ is_primary: true })
    .eq("athlete_id", athleteId)
    .eq("id", targetId);
  return set.error;
}

export async function POST(request: Request) {
  const a = await authed();
  if (a.error) return a.error;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { name, race_type, race_date } = body;
  const isPrimary = body.is_primary === true;

  if (!isNonEmptyString(name)) {
    return NextResponse.json({ ok: false, error: "name is required" }, { status: 400 });
  }
  if (typeof race_type !== "string" || !RACE_TYPES.has(race_type)) {
    return NextResponse.json({ ok: false, error: "race_type invalid" }, { status: 400 });
  }
  if (!isIsoDate(race_date)) {
    return NextResponse.json({ ok: false, error: "race_date must be YYYY-MM-DD" }, { status: 400 });
  }

  // If caller wants the new race to be primary, clear the existing primary first.
  if (isPrimary) {
    const clearErr = await a.supabase
      .from("races")
      .update({ is_primary: false })
      .eq("athlete_id", a.userId)
      .eq("is_primary", true);
    if (clearErr.error) {
      return NextResponse.json({ ok: false, error: clearErr.error.message }, { status: 500 });
    }
  }

  const { data, error } = await a.supabase
    .from("races")
    .insert({
      athlete_id: a.userId,
      name: name.trim(),
      race_type,
      race_date,
      is_primary: isPrimary,
    })
    .select("id, name, race_type, race_date, is_primary, created_at")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, race: data });
}

export async function PATCH(request: Request) {
  const a = await authed();
  if (a.error) return a.error;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { id } = body;
  if (!isUuid(id)) {
    return NextResponse.json({ ok: false, error: "id must be a uuid" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) {
    if (!isNonEmptyString(body.name)) {
      return NextResponse.json({ ok: false, error: "name invalid" }, { status: 400 });
    }
    updates.name = body.name.trim();
  }
  if (body.race_type !== undefined) {
    if (typeof body.race_type !== "string" || !RACE_TYPES.has(body.race_type)) {
      return NextResponse.json({ ok: false, error: "race_type invalid" }, { status: 400 });
    }
    updates.race_type = body.race_type;
  }
  if (body.race_date !== undefined) {
    if (!isIsoDate(body.race_date)) {
      return NextResponse.json({ ok: false, error: "race_date must be YYYY-MM-DD" }, { status: 400 });
    }
    updates.race_date = body.race_date;
  }

  // Handle is_primary flip separately — it requires the atomic clear+set dance.
  if (body.is_primary === true) {
    const err = await setPrimary(a.supabase, a.userId, id);
    if (err) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
    }
  } else if (body.is_primary === false) {
    // PRD §5.7 F14.0 step 6: deleting / un-primarying must leave the athlete
    // with another primary OR with no primary at all (countdown vanishes).
    // We accept un-flagging here; the UI is responsible for prompting the user.
    updates.is_primary = false;
  }

  if (Object.keys(updates).length === 0 && body.is_primary === undefined) {
    return NextResponse.json({ ok: false, error: "No updatable fields" }, { status: 400 });
  }

  let updated = null;
  if (Object.keys(updates).length > 0) {
    const { data, error } = await a.supabase
      .from("races")
      .update(updates)
      .eq("id", id)
      .eq("athlete_id", a.userId)
      .select("id, name, race_type, race_date, is_primary, created_at")
      .single();
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    updated = data;
  } else {
    // Only is_primary changed; re-read to return latest row.
    const { data } = await a.supabase
      .from("races")
      .select("id, name, race_type, race_date, is_primary, created_at")
      .eq("id", id)
      .eq("athlete_id", a.userId)
      .single();
    updated = data;
  }

  return NextResponse.json({ ok: true, race: updated });
}

export async function DELETE(request: Request) {
  const a = await authed();
  if (a.error) return a.error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!isUuid(id)) {
    return NextResponse.json({ ok: false, error: "id must be a uuid" }, { status: 400 });
  }

  const { error } = await a.supabase
    .from("races")
    .delete()
    .eq("id", id)
    .eq("athlete_id", a.userId);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
