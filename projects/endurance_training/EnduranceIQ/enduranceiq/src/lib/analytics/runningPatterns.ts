/**
 * Running pattern detector for Strength v2 focus engine.
 *
 * Each detector is independent. Multiple patterns can fire simultaneously;
 * the focus engine picks the highest-priority one (lowest array index).
 *
 * Priority order (high → low):
 *   1. interference_safe     — Rule 6 fired High this week
 *   2. taper_or_high_load    — load spike or race within 3 weeks
 *   3. low_cadence_intervals — avg_cadence < 168 on intervals
 *   4. long_run_drift        — HR drift in final third (requires per-segment data; no-ops without it)
 *   5. low_easy_load_share   — pct_load_z1_2 < 60% (uses intensity v2 shadow)
 *   6. default               — fallback when nothing else fires
 */

import type { WeeklyReportModel } from "@/lib/report/model";
import type { IntensityV2Breakdown } from "@/lib/analytics/intensityV2";

export type RunningPatternId =
  | "interference_safe"
  | "taper_or_high_load"
  | "low_cadence_intervals"
  | "long_run_drift"
  | "low_easy_load_share"
  | "default";

export interface WorkoutForPatterns {
  sport_type: string;
  session_label: string | null;
  started_at: string;
  avg_cadence: number | null;
  avg_hr: number | null;
}

export interface LoadMetricsForPatterns {
  loadRatio: number | null;
}

export function detectRunningPatterns(input: {
  weekWorkouts: WorkoutForPatterns[];
  load: LoadMetricsForPatterns;
  intensityV2: IntensityV2Breakdown | null;
  raceDateIso: string | null;
  referenceMs: number;
  findings: WeeklyReportModel["findings"];
}): { primary: RunningPatternId; all: RunningPatternId[] } {
  const { weekWorkouts, load, intensityV2, raceDateIso, referenceMs, findings } = input;
  const detected: RunningPatternId[] = [];

  // Pattern 1: interference_safe
  // Rule 6 fired with High severity this week → recovery-style only
  const hasHighInterference = findings.some(
    (f) =>
      f.severity === "High" &&
      /interference|strength\s+close/i.test(f.title),
  );
  if (hasHighInterference) detected.push("interference_safe");

  // Pattern 2: taper_or_high_load
  // loadRatio > 1.3 OR race within 3 weeks
  const weeksToRace =
    raceDateIso && /^\d{4}-\d{2}-\d{2}/.test(raceDateIso)
      ? Math.floor((Date.parse(raceDateIso + "T23:59:59Z") - referenceMs) / (7 * 86400000))
      : null;
  const isHighLoad = load.loadRatio != null && load.loadRatio > 1.3;
  const isTaper = weeksToRace != null && weeksToRace >= 0 && weeksToRace <= 3;
  if (isHighLoad || isTaper) detected.push("taper_or_high_load");

  // Pattern 3: low_cadence_intervals
  // At least one interval session with avg_cadence < 168 spm
  const hasLowCadenceInterval = weekWorkouts.some(
    (w) =>
      w.sport_type === "run" &&
      w.session_label === "interval" &&
      w.avg_cadence != null &&
      w.avg_cadence < 168,
  );
  if (hasLowCadenceInterval) detected.push("low_cadence_intervals");

  // Pattern 4: long_run_drift
  // Requires per-segment HR data (Strava streams API — Phase 1.4).
  // Gracefully no-op for now.
  // (Placeholder: never fires until segment HR data is available)

  // Pattern 5: low_easy_load_share
  // pct_load_z1_2 < 60% from intensity v2 shadow — single-leg + economy emphasis
  if (intensityV2 != null && intensityV2.pctEasyLoad < 60) {
    detected.push("low_easy_load_share");
  }

  // Pattern 6: default — always present as fallback
  detected.push("default");

  return {
    primary: detected[0]!,
    all: detected,
  };
}
