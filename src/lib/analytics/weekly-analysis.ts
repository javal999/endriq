import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeWeeklyReportPayload } from "@/lib/report/computeWeeklyReportPayload";
import { enrichWeeklyReportWithLlm } from "@/lib/report/enrichWeeklyLlm";
import { runWeeklyLlms } from "@/lib/llm/runWeeklyLlms";
import type { WeeklyReportPayload } from "@/lib/report/computeWeeklyReportPayload";

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
      "llm_weekly_analysis, llm_intensity_explanation, llm_session_statuses, llm_weekly_from_api, llm_weekly_analysis_roast, share_id",
    )
    .eq("athlete_id", athleteId)
    .eq("week_start", weekStart)
    .maybeSingle();

  const hasStoredWeekly = Boolean(existing?.llm_weekly_analysis?.trim());
  const roastEnabled = payload.llmBundle?.roastEnabled ?? false;
  const roastMissing = roastEnabled && !existing?.llm_weekly_analysis_roast;

  const shouldRunLlm =
    apiKey &&
    !payload.model.emptyWeek &&
    payload.llmBundle != null &&
    (force || !hasStoredWeekly);

  // Run roast generation independently when roast is newly enabled on a cached week
  const shouldRunRoastOnly =
    apiKey &&
    !payload.model.emptyWeek &&
    payload.llmBundle != null &&
    !shouldRunLlm &&
    roastMissing;

  let llm_weekly_analysis: string | null = existing?.llm_weekly_analysis ?? null;
  let llm_intensity_explanation: string | null = existing?.llm_intensity_explanation ?? null;
  let llm_session_statuses: unknown = existing?.llm_session_statuses ?? [];
  let llm_weekly_from_api = Boolean(existing?.llm_weekly_from_api);

  let pack: Awaited<ReturnType<typeof runWeeklyLlms>> | null = null;

  if (shouldRunLlm && payload.llmBundle) {
    pack = await runWeeklyLlms(payload.llmBundle, payload.model);
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
  } else if (shouldRunRoastOnly && payload.llmBundle) {
    // Roast was enabled after the weekly LLM already ran — generate only roast
    pack = await runWeeklyLlms(
      { ...payload.llmBundle, roastEnabled: true },
      payload.model,
    );
    // Keep existing coach narratives; only take the roast output
    pack = {
      ...pack,
      llm_weekly_analysis: llm_weekly_analysis ?? pack.llm_weekly_analysis,
      llm_intensity_explanation: llm_intensity_explanation ?? pack.llm_intensity_explanation,
      llm_session_statuses: Array.isArray(llm_session_statuses) && (llm_session_statuses as unknown[]).length > 0
        ? (llm_session_statuses as typeof pack.llm_session_statuses)
        : pack.llm_session_statuses,
    };
  }

  const { error } = await db.from("weekly_analyses").upsert(
    {
      ...payload.analysisRow,
      llm_weekly_analysis,
      llm_intensity_explanation,
      llm_session_statuses,
      llm_weekly_from_api,
      llm_weekly_analysis_id: pack?.llm_weekly_analysis_id ?? null,
      llm_intensity_explanation_id: pack?.llm_intensity_explanation_id ?? null,
      llm_session_statuses_id: pack?.llm_session_statuses_id ?? null,
      llm_weekly_analysis_roast: pack?.llm_weekly_analysis_roast ?? existing?.llm_weekly_analysis_roast ?? null,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "athlete_id,week_start" },
  );
  if (error) throw error;

  const locale = payload.llmBundle?.preferredLocale ?? "en";
  const effectiveWeekly =
    locale === "id" && pack?.llm_weekly_analysis_id
      ? pack.llm_weekly_analysis_id
      : llm_weekly_analysis;
  const effectiveIntensity =
    locale === "id" && pack?.llm_intensity_explanation_id
      ? pack.llm_intensity_explanation_id
      : llm_intensity_explanation;
  const effectiveSessions =
    locale === "id" && pack?.llm_session_statuses_id
      ? pack.llm_session_statuses_id
      : llm_session_statuses;

  const model = enrichWeeklyReportWithLlm(payload.model, {
    llm_weekly_analysis: effectiveWeekly,
    llm_intensity_explanation: effectiveIntensity,
    llm_session_statuses: effectiveSessions,
    llm_weekly_from_api,
    llm_weekly_analysis_roast: pack?.llm_weekly_analysis_roast ?? existing?.llm_weekly_analysis_roast ?? null,
    llmDisabledReason: apiKey ? undefined : "no_api_key",
  });

  const shareId =
    typeof existing?.share_id === "string" ? existing.share_id : undefined;

  return { ...payload, model: { ...model, ...(shareId ? { shareId } : {}) } };
}
