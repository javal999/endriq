import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkLimit, llmFeedbackLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const ALLOWED_PROMPT_TYPES = new Set([
  "weekly_analysis",
  "intensity_explanation",
  "session_statuses",
]);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { allowed } = await checkLimit(llmFeedbackLimit, user.id);
    if (!allowed) {
      return NextResponse.json(
        { ok: false, error: "Too many requests — try again in a minute." },
        { status: 429 },
      );
    }

    const body = (await request.json()) as {
      week_start?: string;
      prompt_type?: string;
      rating?: number;
    };

    const { week_start, prompt_type, rating } = body;

    if (
      typeof week_start !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(week_start)
    ) {
      return NextResponse.json({ ok: false, error: "Invalid week_start" }, { status: 400 });
    }
    if (!prompt_type || !ALLOWED_PROMPT_TYPES.has(prompt_type)) {
      return NextResponse.json({ ok: false, error: "Invalid prompt_type" }, { status: 400 });
    }
    if (rating !== 1 && rating !== -1) {
      return NextResponse.json({ ok: false, error: "rating must be 1 or -1" }, { status: 400 });
    }

    const { error } = await supabase.from("llm_feedback").upsert(
      {
        athlete_id: user.id,
        week_start,
        prompt_type,
        rating,
        created_at: new Date().toISOString(),
      },
      { onConflict: "athlete_id,week_start,prompt_type" },
    );

    if (error) {
      console.error("[llm-feedback]", error.message);
      return NextResponse.json({ ok: false, error: "DB error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[llm-feedback] unexpected", err);
    return NextResponse.json({ ok: false, error: "Unexpected error" }, { status: 500 });
  }
}
