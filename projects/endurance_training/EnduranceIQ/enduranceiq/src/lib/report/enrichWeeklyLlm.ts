import {
  intensityExplanationFallback,
  sessionStaticExplanation,
  weeklySectionsFromFindings,
} from "@/lib/llm/fallback";
import { parseWeeklySectionsJson } from "@/lib/llm/parse";
import type { LlmWeeklySectionsModel, WeeklyReportModel } from "@/lib/report/model";

function parseWeeklyStored(
  raw: string | null | undefined,
): LlmWeeklySectionsModel | null {
  if (!raw?.trim()) return null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const ww =
      typeof o.wentWell === "string"
        ? o.wentWell
        : typeof o.went_well === "string"
          ? o.went_well
          : null;
    const nw =
      typeof o.needsWork === "string"
        ? o.needsWork
        : typeof o.needs_work === "string"
          ? o.needs_work
          : null;
    const nx =
      typeof o.nextWeek === "string"
        ? o.nextWeek
        : typeof o.next_week === "string"
          ? o.next_week
          : null;
    if (ww && nw && nx) return { wentWell: ww, needsWork: nw, nextWeek: nx };
  } catch {
    /* fall through */
  }
  return parseWeeklySectionsJson(raw);
}

function normalizeSessionRows(
  raw: unknown,
): Array<{ workout_id: string; explanation: string }> {
  if (!Array.isArray(raw)) return [];
  const out: Array<{ workout_id: string; explanation: string }> = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const wid =
      typeof row.workout_id === "string"
        ? row.workout_id
        : typeof row.workoutId === "string"
          ? row.workoutId
          : null;
    const ex =
      typeof row.explanation === "string" ? row.explanation.trim() : "";
    if (wid && ex.length >= 8) out.push({ workout_id: wid, explanation: ex });
  }
  return out;
}

/** Attach weekly LLM fields for the report UI (parsed DB row + gap-fill with static copy). */
export function enrichWeeklyReportWithLlm(
  base: WeeklyReportModel,
  row: {
    llm_weekly_analysis?: string | null;
    llm_intensity_explanation?: string | null;
    llm_session_statuses?: unknown;
    llm_weekly_from_api?: boolean | null;
    llmDisabledReason?: "no_api_key";
  },
): WeeklyReportModel {
  const weekly =
    parseWeeklyStored(row.llm_weekly_analysis) ??
    weeklySectionsFromFindings(base.findings);

  const intensity =
    row.llm_intensity_explanation?.trim() ||
    intensityExplanationFallback(base);

  const sessionMap: Record<string, string> = {};
  const stored = normalizeSessionRows(row.llm_session_statuses);
  for (const r of stored) {
    sessionMap[r.workout_id] = r.explanation;
  }

  const z2 =
    base.intensity.z2CeilingHr ??
    Math.round((base.intensity.observedMaxHr * 3) / 4);

  for (const s of base.sessions) {
    if (!sessionMap[s.workoutId]) {
      sessionMap[s.workoutId] = sessionStaticExplanation({
        statusLabel: s.statusLabel,
        tone: s.tone,
        z2CeilingHr: z2,
        observedMaxHr: base.intensity.observedMaxHr,
      });
    }
  }

  return {
    ...base,
    llm: {
      weeklySections: weekly,
      intensityExplanation: intensity,
      sessionExplanations: sessionMap,
      weeklyNarrativeFromApi: Boolean(row.llm_weekly_from_api),
      llmDisabledReason: row.llmDisabledReason,
    },
  };
}
