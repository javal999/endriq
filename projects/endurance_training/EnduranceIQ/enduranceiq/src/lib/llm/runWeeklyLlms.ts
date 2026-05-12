import { completeAnthropic } from "@/lib/llm/client";
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
} from "@/lib/llm/prompts";
import type {
  LlmSessionStatusRow,
  LlmWeeklyBundle,
  LlmWeeklySections,
} from "@/lib/llm/types";
import { validateLlmOutput } from "@/lib/llm/validator";
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
  audits: LlmAuditInsert[];
};

/** Runs three Anthropic calls in parallel; validates output; fills gaps with deterministic fallback. */
export async function runWeeklyLlms(
  bundle: LlmWeeklyBundle,
  baseModel: WeeklyReportModel,
): Promise<LlmPackForUpsert> {
  const allowedIds = new Set(bundle.workoutIds);
  const audits: LlmAuditInsert[] = [];

  const weeklyPrompt = weeklyUserPrompt(bundle);
  const intensityPrompt = intensityUserPrompt(bundle);
  const sessionsPrompt = sessionsUserPrompt(bundle);

  const [wRes, iRes, sRes] = await Promise.all([
    completeAnthropic({
      user: weeklyPrompt,
      maxTokens: 900,
      outputSchema: WEEKLY_SECTIONS_SCHEMA,
    }).catch(() => null),
    completeAnthropic({
      user: intensityPrompt,
      maxTokens: 400,
    }).catch(() => null),
    completeAnthropic({
      user: sessionsPrompt,
      maxTokens: 1200,
      outputSchema: SESSION_STATUSES_SCHEMA,
    }).catch(() => null),
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

  return {
    llm_weekly_analysis: JSON.stringify(weeklySections),
    llm_intensity_explanation: intensityText,
    llm_session_statuses: repairedSessions,
    llm_weekly_from_api: weeklyFromApi,
    audits,
  };
}
