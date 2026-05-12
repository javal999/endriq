import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeWeeklyReportPayload } from "@/lib/report/computeWeeklyReportPayload";
import { enrichWeeklyReportWithLlm } from "@/lib/report/enrichWeeklyLlm";
import { runWeeklyLlms } from "@/lib/llm/runWeeklyLlms";
import type { WeeklyReportPayload } from "@/lib/report/computeWeeklyReportPayload";

/**
 * Computes weekly analytics, upserts `weekly_analyses`, optionally runs server-side LLM
 * explanations once per week (cached on subsequent page loads), writes `llm_audit_log`.
 * Pass the server `createClient()` for logged-in flows (RLS). Use default admin for webhooks/OG.
 */
export async function generateWeeklyAnalysis(
  athleteId: string,
  weekStart: string,
  db: SupabaseClient = createAdminClient(),
): Promise<WeeklyReportPayload> {
  const payload = await computeWeeklyReportPayload(athleteId, weekStart, db);

  const apiKey = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  const force = process.env.ENDURANCEIQ_FORCE_LLM === "1";

  const { data: existing } = await db
    .from("weekly_analyses")
    .select(
      "llm_weekly_analysis, llm_intensity_explanation, llm_session_statuses, llm_weekly_from_api",
    )
    .eq("athlete_id", athleteId)
    .eq("week_start", weekStart)
    .maybeSingle();

  const hasStoredWeekly = Boolean(existing?.llm_weekly_analysis?.trim());

  const shouldRunLlm =
    apiKey &&
    !payload.model.emptyWeek &&
    payload.llmBundle != null &&
    (force || !hasStoredWeekly);

  let llm_weekly_analysis: string | null =
    existing?.llm_weekly_analysis ?? null;
  let llm_intensity_explanation: string | null =
    existing?.llm_intensity_explanation ?? null;
  let llm_session_statuses: unknown = existing?.llm_session_statuses ?? [];
  let llm_weekly_from_api = Boolean(existing?.llm_weekly_from_api);

  if (shouldRunLlm && payload.llmBundle) {
    const pack = await runWeeklyLlms(payload.llmBundle, payload.model);
    llm_weekly_analysis = pack.llm_weekly_analysis;
    llm_intensity_explanation = pack.llm_intensity_explanation;
    llm_session_statuses = pack.llm_session_statuses;
    llm_weekly_from_api = pack.llm_weekly_from_api;

    for (const a of pack.audits) {
      const { error: logErr } = await db.from("llm_audit_log").insert({
        athlete_id: athleteId,
        week_start: weekStart,
        prompt_type: a.prompt_type,
        input_tokens: a.input_tokens,
        output_tokens: a.output_tokens,
        model: a.model,
        output_text: a.output_text,
        input_data: a.input_data,
        validation_passed: a.validation_passed,
        validation_reason: a.validation_reason,
      });
      if (logErr) console.error("[EnduranceIQ] llm_audit_log insert:", logErr);
    }
  }

  const { error } = await db.from("weekly_analyses").upsert(
    {
      ...payload.analysisRow,
      llm_weekly_analysis,
      llm_intensity_explanation,
      llm_session_statuses,
      llm_weekly_from_api,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "athlete_id,week_start" },
  );
  if (error) throw error;

  const model = enrichWeeklyReportWithLlm(payload.model, {
    llm_weekly_analysis,
    llm_intensity_explanation,
    llm_session_statuses,
    llm_weekly_from_api,
    llmDisabledReason: apiKey ? undefined : "no_api_key",
  });

  return { ...payload, model };
}
