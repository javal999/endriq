/**
 * Strength v2 — pattern-driven menu generator.
 * Replaces the A/B/C template alternation model from Phase 1.
 *
 * The generator picks the correct emphasis tags for the week's primary
 * running pattern, then selects 4–6 exercises matching those tags,
 * staying under 50 min per day.
 */

import {
  EXERCISES,
  getExercisesByEmphasis,
  type Exercise,
  type ExerciseEmphasis,
} from "@/lib/data/exercise-library";
import type { RunningPatternId } from "@/lib/analytics/runningPatterns";
import { citationToLink } from "@/lib/data/citations";
import type { CitationId } from "@/lib/data/citations";

// ── Scheduling helpers (unchanged from v1) ───────────────────────────────────

export interface RunForStrengthScheduling {
  sport_type: string;
  session_label: string | null;
  started_at: string;
}

/** Monday = 0 … Sunday = 6 */
export const WEEKDAY_NAMES_MON0 = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
] as const;

export function mondayBasedWeekday(startedAtIso: string): number {
  const d = new Date(startedAtIso);
  const sun0 = d.getUTCDay();
  return (sun0 + 6) % 7;
}

export function recommendStrengthDays(runsWeek: RunForStrengthScheduling[]): {
  recommendedDays: number[];
  avoidDays: number[];
  reason: string;
} {
  const qualityRunDays: number[] = [];
  const longRunDays: number[] = [];

  for (const s of runsWeek) {
    if (s.sport_type !== "run") continue;
    const wd = mondayBasedWeekday(s.started_at);
    if (s.session_label === "interval" || s.session_label === "tempo") {
      qualityRunDays.push(wd);
    }
    if (s.session_label === "long_run") {
      longRunDays.push(wd);
    }
  }

  const blocked = new Set<number>();
  for (const qd of qualityRunDays) blocked.add((qd + 6) % 7);
  for (const ld of longRunDays) blocked.add((ld + 6) % 7);

  const available: number[] = [];
  for (let d = 0; d < 7; d += 1) {
    if (!blocked.has(d)) available.push(d);
  }

  return {
    recommendedDays: available.slice(0, 2),
    avoidDays: [...blocked].sort((a, b) => a - b),
    reason:
      "Placed after quality runs or on easy days. Strength immediately before a hard or long run can blunt performance for several hours (Fyfe et al., 2014).",
  };
}

// ── Pattern → menu config ────────────────────────────────────────────────────

interface PatternConfig {
  primaryEmphasis: ExerciseEmphasis[];
  maxDays: number;
  targetDurationMin: number; // target per day
  maxDurationMin: number;    // hard cap per day
  minExercises: number;
  maxExercises: number;
  rationaleSuffix: string;
  citationIds: CitationId[];
}

const PATTERN_CONFIG: Record<RunningPatternId, PatternConfig> = {
  interference_safe: {
    primaryEmphasis: ["mobility"],
    maxDays: 1,
    targetDurationMin: 20,
    maxDurationMin: 25,
    minExercises: 4,
    maxExercises: 5,
    rationaleSuffix:
      "Recovery-style mobility only — a high-severity interference window fired this week. No heavy loading.",
    citationIds: ["fyfe_2014", "wilson_2012"],
  },
  taper_or_high_load: {
    primaryEmphasis: ["maintenance"],
    maxDays: 1,
    targetDurationMin: 25,
    maxDurationMin: 30,
    minExercises: 4,
    maxExercises: 5,
    rationaleSuffix:
      "Maintenance volume only — training load is elevated or race is within 3 weeks.",
    citationIds: ["mujika_2010"],
  },
  low_cadence_intervals: {
    primaryEmphasis: ["plyometric", "single_leg_economy"],
    maxDays: 1,
    targetDurationMin: 40,
    maxDurationMin: 45,
    minExercises: 4,
    maxExercises: 6,
    rationaleSuffix:
      "Plyometric and single-leg work to improve ground contact time and cadence.",
    citationIds: ["saunders_2006", "blagrove_2018"],
  },
  long_run_drift: {
    primaryEmphasis: ["posterior_chain", "core_stability"],
    maxDays: 1,
    targetDurationMin: 40,
    maxDurationMin: 50,
    minExercises: 4,
    maxExercises: 6,
    rationaleSuffix:
      "Posterior chain and core work for late-race fatigue resistance — long run HR drift detected.",
    citationIds: ["bourne_2017", "blagrove_2018"],
  },
  low_easy_load_share: {
    primaryEmphasis: ["single_leg_economy", "posterior_chain"],
    maxDays: 2,
    targetDurationMin: 40,
    maxDurationMin: 50,
    minExercises: 4,
    maxExercises: 6,
    rationaleSuffix:
      "Single-leg economy and posterior chain work. Better running economy makes easy pace sustainable at lower HR, which shifts load share toward Zone 1–2.",
    citationIds: ["beattie_2017", "blagrove_2018"],
  },
  default: {
    primaryEmphasis: ["single_leg_economy", "posterior_chain", "core_stability"],
    maxDays: 1,
    targetDurationMin: 45,
    maxDurationMin: 50,
    minExercises: 4,
    maxExercises: 6,
    rationaleSuffix:
      "General lower-body strength and core. No specific running weakness pattern detected this week.",
    citationIds: ["beattie_2017", "blagrove_2018"],
  },
};

// ── Menu builder ─────────────────────────────────────────────────────────────

/** Estimate exercise duration in minutes (sets × (work + rest)). */
function estimateExerciseDurationMin(ex: Exercise): number {
  // parse "3 × 6–8" → sets = 3
  const setsMatch = ex.sets_reps.match(/^(\d+)/);
  const sets = setsMatch ? Number(setsMatch[1]) : 3;
  const restMin = ex.rest_seconds / 60;
  const workMin = 0.75; // ~45s per set for most exercises
  return sets * (workMin + restMin);
}

/** Select up to maxCount exercises matching the emphasis tags within the duration budget. */
function selectExercises(
  tags: ExerciseEmphasis[],
  minCount: number,
  maxCount: number,
  maxDurationMin: number,
): Exercise[] {
  const pool = getExercisesByEmphasis(tags);
  const selected: Exercise[] = [];
  let totalMin = 0;

  // Prefer variety: avoid duplicating the same primary emphasis back-to-back
  for (const ex of pool) {
    if (selected.length >= maxCount) break;
    const dur = estimateExerciseDurationMin(ex);
    if (totalMin + dur > maxDurationMin && selected.length >= minCount) break;
    selected.push(ex);
    totalMin += dur;
  }

  return selected;
}

function formatDayList(days: number[]): string {
  const names = days.map((d) => WEEKDAY_NAMES_MON0[d]);
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} or ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, or ${names[names.length - 1]}`;
}

// ── New public interfaces ────────────────────────────────────────────────────

export interface StrengthMenuDay {
  weekday: number;      // 0 = Monday
  duration_min: number;
  exercises: Exercise[];
}

export interface StrengthMenuModel {
  pattern: RunningPatternId;
  days: StrengthMenuDay[];
  rationale: string;
  schedulingSummary: string;
  citations: Array<{ label: string; href: string }>;
}

/** Persisted JSON shape for `weekly_analyses.strength_recommendation`. */
export interface StrengthRecommendationRecord {
  pattern: RunningPatternId;
  days: Array<{
    weekday: number;
    duration_min: number;
    exercise_ids: string[];
  }>;
  rationale: string;
  scheduling_summary: string;
  citations: Array<{ label: string; href: string }>;
}

// Keep this alias so report model types still compile
export type StrengthRecommendationModel = StrengthMenuModel;

export function buildStrengthMenu(input: {
  primaryPattern: RunningPatternId;
  runsWeek: RunForStrengthScheduling[];
  loadStatusWord: string;
  loadRatio: number | null;
  raceDateIso: string | null | undefined;
  referenceMs: number;
}): StrengthMenuModel {
  const { primaryPattern, runsWeek, loadStatusWord, loadRatio, raceDateIso } = input;
  const config = PATTERN_CONFIG[primaryPattern];

  const { recommendedDays, avoidDays, reason } = recommendStrengthDays(runsWeek);

  const selectedExercises = selectExercises(
    config.primaryEmphasis,
    config.minExercises,
    config.maxExercises,
    config.maxDurationMin,
  );

  const totalDurationMin = selectedExercises.reduce(
    (s, e) => s + estimateExerciseDurationMin(e),
    0,
  );

  // Decide number of days: split into 2 when volume or exercise count warrants
  const numDays =
    config.maxDays >= 2 &&
    (totalDurationMin > 50 || selectedExercises.length > 6)
      ? 2
      : 1;

  const daySlots = recommendedDays.slice(0, numDays);
  const perDayExercises =
    numDays === 2
      ? [
          selectedExercises.slice(0, Math.ceil(selectedExercises.length / 2)),
          selectedExercises.slice(Math.ceil(selectedExercises.length / 2)),
        ]
      : [selectedExercises];

  const days: StrengthMenuDay[] = daySlots.map((wd, i) => {
    const exs = perDayExercises[i] ?? selectedExercises;
    return {
      weekday: wd,
      duration_min: Math.round(exs.reduce((s, e) => s + estimateExerciseDurationMin(e), 0)),
      exercises: exs,
    };
  });

  // Rationale
  const loadBit =
    loadRatio != null
      ? `Load ratio is ${loadRatio.toFixed(2)} (${loadStatusWord.toLowerCase()}).`
      : "Load baseline is still establishing.";
  const rationale = `${loadBit} ${config.rationaleSuffix}`;

  // Scheduling summary
  const avoidText = avoidDays.length > 0
    ? `Avoid ${formatDayList(avoidDays)} — day before quality or long runs.`
    : "";
  const schedulingSummary = daySlots.length > 0
    ? `${formatDayList(daySlots)} — after quality runs, not before. ${avoidText}`.trim()
    : `No clear strength days this week — choose any easy day. ${avoidText}`.trim();

  const citations = config.citationIds.map((id) => citationToLink(id));

  const record: StrengthRecommendationRecord = {
    pattern: primaryPattern,
    days: days.map((d) => ({
      weekday: d.weekday,
      duration_min: d.duration_min,
      exercise_ids: d.exercises.map((e) => e.id),
    })),
    rationale,
    scheduling_summary: schedulingSummary,
    citations,
  };

  return {
    pattern: primaryPattern,
    days,
    rationale,
    schedulingSummary,
    citations,
    // attach record for persistence
    ...{ record },
  } as StrengthMenuModel & { record: StrengthRecommendationRecord };
}

// Backwards-compatible wrapper (used by computeWeeklyReportPayload)
export function buildStrengthRecommendation(input: {
  runsWeek: RunForStrengthScheduling[];
  loadRatio: number | null;
  loadStatusWord: string;
  raceDateIso: string | null | undefined;
  referenceMs: number;
  primaryPattern?: RunningPatternId;
}): StrengthMenuModel & { record: StrengthRecommendationRecord } {
  const pattern = input.primaryPattern ?? "default";
  return buildStrengthMenu({
    primaryPattern: pattern,
    runsWeek: input.runsWeek,
    loadStatusWord: input.loadStatusWord,
    loadRatio: input.loadRatio,
    raceDateIso: input.raceDateIso,
    referenceMs: input.referenceMs,
  }) as StrengthMenuModel & { record: StrengthRecommendationRecord };
}

/** Parse a persisted JSON record back into a StrengthMenuModel for display. */
export function parseStrengthRecord(
  raw: unknown,
): StrengthRecommendationRecord | null {
  if (raw == null || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.pattern !== "string") return null;
  return r as unknown as StrengthRecommendationRecord;
}

/** Reconstruct a display model from a persisted record (for cached report loads). */
export function modelFromStrengthRecord(
  record: StrengthRecommendationRecord,
): StrengthMenuModel {
  const days: StrengthMenuDay[] = record.days.map((d) => {
    const exercises = d.exercise_ids
      .map((id) => EXERCISES.find((e) => e.id === id))
      .filter((e): e is Exercise => e != null);
    return {
      weekday: d.weekday,
      duration_min: d.duration_min,
      exercises,
    };
  });

  return {
    pattern: record.pattern as RunningPatternId,
    days,
    rationale: record.rationale,
    schedulingSummary: record.scheduling_summary,
    citations: record.citations,
  };
}
