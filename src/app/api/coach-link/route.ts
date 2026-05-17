/**
 * /api/coach-link — F13 coach link management.
 *
 * POST   { } → generates a new 90-day link, returns { id, expires_at }.
 * DELETE ?id=<uuid> → revokes the link (sets revoked_at = now()).
 *
 * RLS coach_links_own scopes operations to athlete_id = auth.uid().
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.6 F13; PHASE-2.0-BUILD.md T13 step 2.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkLimit, raceWriteLimit } from "@/lib/ratelimit";
import { flags } from "@/lib/featureFlags";

export const runtime = "nodejs";

function isUuid(s: unknown): s is string {
  return (
    typeof s === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
  );
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

export async function POST() {
  if (!flags.COACH_VIEW_PUBLIC) {
    return NextResponse.json({ ok: false, error: "Feature disabled" }, { status: 404 });
  }
  const a = await authed();
  if (a.error) return a.error;

  const { data, error } = await a.supabase
    .from("coach_links")
    .insert({ athlete_id: a.userId })
    .select("id, created_at, expires_at")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, link: data });
}

export async function DELETE(request: Request) {
  if (!flags.COACH_VIEW_PUBLIC) {
    return NextResponse.json({ ok: false, error: "Feature disabled" }, { status: 404 });
  }
  const a = await authed();
  if (a.error) return a.error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!isUuid(id)) {
    return NextResponse.json({ ok: false, error: "id must be a uuid" }, { status: 400 });
  }

  const { error } = await a.supabase
    .from("coach_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("athlete_id", a.userId);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function GET() {
  if (!flags.COACH_VIEW_PUBLIC) {
    return NextResponse.json({ ok: false, error: "Feature disabled" }, { status: 404 });
  }
  const a = await authed();
  if (a.error) return a.error;

  const { data, error } = await a.supabase
    .from("coach_links")
    .select("id, created_at, expires_at, revoked_at")
    .eq("athlete_id", a.userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, links: data ?? [] });
}
