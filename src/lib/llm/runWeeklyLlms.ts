import { completeAnthropic } from "@/lib/llm/client";
import { checkAndDecrementQuota } from "@/lib/llm/quota";
import type { SupabaseClient } from "@supabase/supabase-js";
import { translateToBahasaCasual } from "@/lib/llm/translate";
import {
  intensityExplanationFallback,
  sessionStaticExplanation,
  weeklySectionsFromFindings,
} from "@/lib/llm/fallback";
import {
  parseSessionStatusesJson,
  parseWeeklySectionsJson,
} from "@/lib/llm/parse";
import {
  intensityUserPrompt,
  sessionsUserPrompt,
  weeklyUserPrompt,
  weeklyUserPromptRoast,
} from "@/lib/llm/prompts";
import type {
  LlmSessionStatusRow,
  LlmWeeklyBundle,
  LlmWeeklySections,
} from "@/lib/llm/types";
import { validateLlmOutput, validateRoastOutput } from "@/lib/llm/validator";
import type { WeeklyReportModel } from "@/lib/report/model";

const WEEKLY_SECTIONS_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    went_well: { type: "string" },
    needs_work: { type: "string" },
    next_week: { type: "string" },
  },
  required: ["went_well", "needs_work", "next_week"],
  additionalProperties: false,
};

const SESSION_STATUSES_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    sessions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          workout_id: { type: "string" },
          explanation: { type: "string" },
        },
        required: ["workout_id", "explanation"],
        additionalProperties: false,
      },
    },
  },
  required: ["sessions"],
  additionalProperties: false,
};

const AUDIT_TEXT_CAP = 12_000;
const PROMPT_EXCERPT_CAP = 8_000;

function truncateForAudit(s: string, max = AUDIT_TEXT_CAP): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function auditInputSnapshot(
  bundle: LlmWeeklyBundle,
): Record<string, unknown> {
  return {
    athleteId: bundle.athleteId,
    weekStart: bundle.weekStart,
    goalRaceType: bundle.goalRaceType,
    goalRaceDate: bundle.goalRaceDate,
    goalWeeklyKm: bundle.goalWeeklyKm,
    weeksOfDataApprox: bundle.weeksOfDataApprox,
    totalDistanceKm: bundle.totalDistanceKm,
    prevWeekDistanceKm: bundle.prevWeekDistanceKm,
    monthAvgDistanceKm: bundle.monthAvgDistanceKm,
    runningSessions: bundle.runningSessions,
    strengthSessions: bundle.strengthSessions,
    totalTimeMinutes: bundle.totalTimeMinutes,
    pctEasy: bundle.pctEasy,
    pctModerate: bundle.pctModerate,
    pctHard: bundle.pctHard,
    loadRatio: bundle.loadRatio,
    loadStatusWord: bundle.loadStatusWord,
    maxHr: bundle.maxHr,
    z2Ceiling: bundle.z2Ceiling,
    avgEasyRunHr: bundle.avgEasyRunHr,
    interferenceDetected: bundle.interferenceDetected,
    findings_excerpt: bundle.findingsText.slice(0, 3500),
    sessions_lines_excerpt: bundle.sessionsText.slice(0, 3500),
    session_ledger_chars: bundle.sessionLedgerJson.length,
  };
}

export type LlmAuditInsert = {
  prompt_type: string;
  input_tokens: number | null;
  output_tokens: number | null;
  model: string | null;
  output_text: string | null;
  input_data: Record<string, unknown> | null;
  validation_passed: boolean;
  validation_reason: string | null;
};

export type LlmPackForUpsert = {
  llm_weekly_analysis: string;
  llm_intensity_explanation: string;
  llm_session_statuses: LlmSessionStatusRow[];
  /** True when the three-part weekly narrative was parsed from Haiku output (not rules-only fallback). */
  llm_weekly_from_api: boolean;
  /** Bahasa Indonesia translations (only set when athlete.preferred_locale === "id"). */
  llm_weekly_analysis_id?: string;
  llm_intensity_explanation_id?: string;
  llm_session_statuses_id?: LlmSessionStatusRow[];
  /** Roast variant (only set when athlete.roast_enabled === true and no High-severity safety finding). */
  llm_weekly_analysis_roast?: string;
  audits: LlmAuditInsert[];
};

/**
 * T15 quota gate. Decrements the athlete's monthly LLM quota by 1; returns
 * true iff the call should proceed. Failure paths (DB error, missing RPC
 * in dev) fail open — the alternative would block the whole report.
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.9 F16.B; PHASE-2.0-BUILD.md T15.
 */
async function quotaAllows(
  athleteId: string,
  db: SupabaseClient | null,
): Promise<boolean> {
  if (!db) return true; // dev / unit-test path: no quota enforcement
  if (process.env.ENDURANCEIQ_FORCE_LLM === "1") return true; // dev override
  try {
    const { allowed } = await checkAndDecrementQuota(athleteId, 1, db);
    return allowed;
  } catch {
    return true; // fail-open per docstring above
  }
}

/** Runs three Anthropic calls in parallel; validates output; fills gaps with deterministic fallback. */
export async function runWeeklyLlms(
  bundle: LlmWeeklyBundle,
  baseModel: WeeklyReportModel,
  db: SupabaseClient | null = null,
): Promise<LlmPackForUpsert> {
  const allowedIds = new Set(bundle.workoutIds);
  const audits: LlmAuditInsert[] = [];

  const weeklyPrompt = weeklyUserPrompt(bundle);
  const intensityPrompt = intensityUserPrompt(bundle);
  const sessionsPrompt = sessionsUserPrompt(bundle);

  // T15 conditional skip — sessions-statuses call burns ~30% of weekly LLM
  // tokens; for an athlete with ≤2 logged sessions the per-session
  // explanation surface adds little, so skip the call entirely (PRD AC5).
  const skipSessionsCall = bundle.workoutIds.length <= 2;

  // T15 quota gates run BEFORE the API calls. Failed gates produce null
  // responses; the existing `if (!wRes)` / fallback paths below already
  // handle that gracefully (deterministic content stays available).
  const [weeklyAllowed, intensityAllowed, sessionsAllowed] = await Promise.all([
    quotaAllows(bundle.athleteId, db),
    quotaAllows(bundle.athleteId, db),
    skipSessionsCall ? Promise.resolve(false) : quotaAllows(bundle.athleteId, db),
  ]);

  const [wRes, iRes, sRes] = await Promise.all([
    weeklyAllowed
      ? completeAnthropic({
          user: weeklyPrompt,
          maxTokens: 900,
          outputSchema: WEEKLY_SECTIONS_SCHEMA,
        }).catch(() => null)
      : Promise.resolve(null),
    intensityAllowed
      ? completeAnthropic({
          user: intensityPrompt,
          maxTokens: 400,
        }).catch(() => null)
      : Promise.resolve(null),
    sessionsAllowed
      ? completeAnthropic({
          user: sessionsPrompt,
          maxTokens: 1200,
          outputSchema: SESSION_STATUSES_SCHEMA,
        }).catch(() => null)
      : Promise.resolve(null),
  ]);

  let weeklySections: LlmWeeklySections | null = null;
  let weeklyFromApi = false;
  let weeklyReason: string | null = null;

  if (wRes) {
    const parsed = parseWeeklySectionsJson(wRes.text);
    const ok =
      !!parsed &&
      validateLlmOutput(parsed.wentWell).ok &&
      validateLlmOutput(parsed.needsWork).ok &&
      validateLlmOutput(parsed.nextWeek).ok;
    if (ok && parsed) {
      weeklySections = parsed;
      weeklyFromApi = true;
      weeklyReason = null;
    } else if (!parsed) {
      weeklyReason = "parse_weekly_json";
    } else {
      const bad =
        !validateLlmOutput(parsed.wentWell).ok
          ? "blocklist_went_well"
          : !validateLlmOutput(parsed.needsWork).ok
            ? "blocklist_needs_work"
            : "blocklist_next_week";
      weeklyReason = bad;
    }

    audits.push({
      prompt_type: "weekly_analysis",
      input_tokens: wRes.inputTokens,
      output_tokens: wRes.outputTokens,
      model: wRes.model,
      output_text: truncateForAudit(wRes.text),
      input_data: {
        snapshot: auditInputSnapshot(bundle),
        user_prompt_excerpt: truncateForAudit(weeklyPrompt, PROMPT_EXCERPT_CAP),
      },
      validation_passed: weeklyFromApi,
      validation_reason: weeklyFromApi ? null : weeklyReason,
    });
  }

  if (!wRes) {
    // API transport failure — no response at all
    audits.push({
      prompt_type: "weekly_analysis",
      input_tokens: null,
      output_tokens: null,
      model: null,
      output_text: null,
      input_data: { snapshot: auditInputSnapshot(bundle) },
      validation_passed: false,
      validation_reason: "api_transport_error",
    });
  }

  if (!weeklySections) {
    weeklySections = weeklySectionsFromFindings(baseModel.findings);
  }

  let intensityText: string | null = null;
  let intensityPass = false;
  let intensityReason: string | null = null;

  if (iRes) {
    const trimmed = iRes.text.trim();
    const v = trimmed ? validateLlmOutput(trimmed) : { ok: false, reason: "empty" };
    intensityPass = v.ok;
    if (intensityPass) intensityText = trimmed;
    else intensityReason = v.reason ?? "blocked_or_empty";

    audits.push({
      prompt_type: "intensity_explanation",
      input_tokens: iRes.inputTokens,
      output_tokens: iRes.outputTokens,
      model: iRes.model,
      output_text: truncateForAudit(iRes.text),
      input_data: {
        snapshot: auditInputSnapshot(bundle),
        user_prompt_excerpt: truncateForAudit(intensityPrompt, PROMPT_EXCERPT_CAP),
      },
      validation_passed: intensityPass,
      validation_reason: intensityPass ? null : intensityReason,
    });
  }

  if (!iRes) {
    audits.push({
      prompt_type: "intensity_explanation",
      input_tokens: null,
      output_tokens: null,
      model: null,
      output_text: null,
      input_data: { snapshot: auditInputSnapshot(bundle) },
      validation_passed: false,
      validation_reason: "api_transport_error",
    });
  }

  if (!intensityText) {
    intensityText = intensityExplanationFallback(baseModel);
  }

  let sessions: LlmSessionStatusRow[] | null = null;
  let sessionsPass = false;
  let sessionsReason: string | null = null;

  if (sRes) {
    sessions = parseSessionStatusesJson(sRes.text, allowedIds);
    sessionsPass =
      !!sessions &&
      sessions.length === bundle.workoutIds.length &&
      sessions.every((r) => validateLlmOutput(r.explanation).ok);
    if (!sessions) sessionsReason = "parse_sessions_json";
    else if (!sessionsPass)
      sessionsReason =
        sessions.length !== bundle.workoutIds.length
          ? "session_count_mismatch"
          : "blocklist_session_copy";

    audits.push({
      prompt_type: "session_statuses",
      input_tokens: sRes.inputTokens,
      output_tokens: sRes.outputTokens,
      model: sRes.model,
      output_text: truncateForAudit(sRes.text),
      input_data: {
        snapshot: auditInputSnapshot(bundle),
        user_prompt_excerpt: truncateForAudit(sessionsPrompt, PROMPT_EXCERPT_CAP),
      },
      validation_passed: sessionsPass,
      validation_reason: sessionsPass ? null : sessionsReason,
    });
  }

  if (!sRes) {
    audits.push({
      prompt_type: "session_statuses",
      input_tokens: null,
      output_tokens: null,
      model: null,
      output_text: null,
      input_data: { snapshot: auditInputSnapshot(bundle) },
      validation_passed: false,
      validation_reason: "api_transport_error",
    });
  }

  const repairedSessions: LlmSessionStatusRow[] = bundle.workoutIds.map(
    (id) => {
      const fromLlm = sessions?.find((r) => r.workout_id === id);
      if (
        fromLlm &&
        validateLlmOutput(fromLlm.explanation).ok &&
        fromLlm.explanation.length >= 20
      ) {
        return fromLlm;
      }
      const sess = baseModel.sessions.find((s) => s.workoutId === id);
      if (!sess) {
        return {
          workout_id: id,
          explanation:
            "No structured HR summary is available for this logged session.",
        };
      }
      const z2 =
        baseModel.intensity.z2CeilingHr ??
        Math.round((baseModel.intensity.observedMaxHr * 3) / 4);
      return {
        workout_id: id,
        explanation: sessionStaticExplanation({
          statusLabel: sess.statusLabel,
          tone: sess.tone,
          z2CeilingHr: z2,
          observedMaxHr: baseModel.intensity.observedMaxHr,
        }),
      };
    },
  );

  // Translate-after pass for Bahasa users.
  // English source is the canonical safety surface; translation gets a lighter check (length-only).
  let llm_weekly_analysis_id: string | undefined;
  let llm_intensity_explanation_id: string | undefined;
  let llm_session_statuses_id: LlmSessionStatusRow[] | undefined;

  if (bundle.preferredLocale === "id") {
    // T15 quota gate for the translation passes (2 main + N session lines).
    // If quota is exhausted, skip translation entirely; the report
    // renders in English which the UI handles gracefully (existing
    // Phase 1.3 fallback path).
    const translateAllowed = await quotaAllows(bundle.athleteId, db);
    if (!translateAllowed) {
      llm_weekly_analysis_id = undefined;
      llm_intensity_explanation_id = undefined;
      llm_session_statuses_id = undefined;
    } else {
    try {
      const [wTr, iTr, sTrs] = await Promise.all([
        translateToBahasaCasual(JSON.stringify(weeklySections)).catch(() => null),
        translateToBahasaCasual(intensityText).catch(() => null),
        Promise.all(
          repairedSessions.map(async (row) => {
            const tr = await translateToBahasaCasual(row.explanation).catch(() => null);
            return tr && tr.text.length > 10
              ? { workout_id: row.workout_id, explanation: tr.text }
              : row;
          }),
        ),
      ]);

      if (wTr && wTr.text.length > 20) llm_weekly_analysis_id = wTr.text;
      if (iTr && iTr.text.length > 10) llm_intensity_explanation_id = iTr.text;
      llm_session_statuses_id = sTrs;
    } catch {
      // Non-fatal — fall back to English display
    }
    }
  }

  // Roast generation — skipped when roast_enabled is false OR a High-severity safety finding fired.
  let llm_weekly_analysis_roast: string | undefined;

  const hasHighSafetyFinding = baseModel.findings.some(
    (f) =>
      f.severity === "High" &&
      /interference|spike|stop/i.test(f.title),
  );

  if (bundle.roastEnabled && !hasHighSafetyFinding) {
    // T15 quota gate. Roast is an extra cost on top of the main weekly
    // narrative; if quota is exhausted, skip silently and the coach
    // narrative remains as the only output.
    const roastAllowed = await quotaAllows(bundle.athleteId, db);
    try {
      const roastPrompt = weeklyUserPromptRoast(bundle);
      const roastRes = roastAllowed
        ? await completeAnthropic({
            user: roastPrompt,
            maxTokens: 900,
            outputSchema: WEEKLY_SECTIONS_SCHEMA,
          }).catch(() => null)
        : null;

      if (roastRes) {
        const parsed = parseWeeklySectionsJson(roastRes.text);
        if (parsed) {
          const validRoast =
            validateRoastOutput(parsed.wentWell).ok &&
            validateRoastOutput(parsed.needsWork).ok &&
            validateRoastOutput(parsed.nextWeek).ok;
          if (validRoast) {
            llm_weekly_analysis_roast = JSON.stringify(parsed);
          }
        }
        audits.push({
          prompt_type: "weekly_roast",
          input_tokens: roastRes.inputTokens,
          output_tokens: roastRes.outputTokens,
          model: roastRes.model,
          output_text: truncateForAudit(roastRes.text),
          input_data: { snapshot: auditInputSnapshot(bundle) },
          validation_passed: Boolean(llm_weekly_analysis_roast),
          validation_reason: llm_weekly_analysis_roast ? null : "roast_validation_failed",
        });
      }
    } catch {
      // Non-fatal — fall back to coach copy for roast tab
    }
  } else if (bundle.roastEnabled && hasHighSafetyFinding) {
    // Safety skip — log it
    audits.push({
      prompt_type: "weekly_roast",
      input_tokens: null,
      output_tokens: null,
      model: null,
      output_text: null,
      input_data: { snapshot: auditInputSnapshot(bundle) },
      validation_passed: false,
      validation_reason: "skipped_high_severity_safety",
    });
  }

  return {
    llm_weekly_analysis: JSON.stringify(weeklySections),
    llm_intensity_explanation: intensityText,
    llm_session_statuses: repairedSessions,
    llm_weekly_from_api: weeklyFromApi,
    llm_weekly_analysis_id,
    llm_intensity_explanation_id,
    llm_session_statuses_id,
    llm_weekly_analysis_roast,
    audits,
  };
}
