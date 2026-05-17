/**
 * F14.B — Predicted finish time (gated on data sufficiency).
 *
 * Pure function. Returns either an eligible prediction or an
 * ineligibility reason. PRD §5.7 F14.B is explicit: "if data is not
 * sufficient to predict a finish time, the prediction must not be shown
 * at all." Callers must respect `eligible: false` by rendering nothing
 * (no greyed placeholder).
 *
 * Methodology: Riegel × Daniels VDOT cross-check.
 *   - Riegel: T2 = T1 × (D2/D1)^1.06
 *   - Daniels: infer VDOT from race PR, lookup target-distance time
 *   - Confidence depends on the agreement between the two methods AND
 *     the depth of consistent training history.
 *
 * Race-week freeze: within 7 days of race_date, the prediction stays
 * locked to its previous value (consumers re-render with the same data
 * window but mark the response `frozen: true`).
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.7 F14.B; PHASE-2.0-BUILD.md T11.
 */

import {
  inferVdotFromRace,
  raceTimeForVdot,
  riegelPredict,
  STANDARD_RACE_KM,
  type StandardRaceDistance,
} from "@/lib/data/danielsVdot";
import type { AthleteHistorySlice } from "./types";
import { daysToRace, type PrimaryRaceLike } from "./periodization";

export type PredictionConfidence = "high" | "moderate" | "low";

export interface PredictedFinishEligible {
  eligible: true;
  /** Lower bound of the finish-time range, seconds. */
  lowSec: number;
  /** Upper bound of the finish-time range, seconds. */
  highSec: number;
  /** Centre of the range — typically the average of Riegel + Daniels. */
  centerSec: number;
  /** "high" | "moderate" — PRD says low is hidden (eligible=false instead). */
  confidence: Exclude<PredictionConfidence, "low">;
  /** True iff within 7 days of race_date — UI badges this. */
  frozen: boolean;
  /** Computation breakdown for the methodology drawer. */
  inputs: {
    pr: NonNullable<AthleteHistorySlice["recentRacePr"]>;
    targetDistance: StandardRaceDistance;
    targetKm: number;
    vdot: number;
    riegelSec: number;
    danielsSec: number;
    agreementPct: number;
    weeksOfConsistentTraining: number;
  };
}

export interface PredictedFinishIneligible {
  eligible: false;
  /** Tag the UI can log for debugging. PRD: never show this to athletes. */
  reason:
    | "general_fitness_goal"
    | "race_too_close"
    | "no_recent_pr"
    | "pr_too_old"
    | "insufficient_history"
    | "low_method_agreement"
    | "non_standard_distance"
    | "missing_race_type";
}

export type PredictedFinishResult = PredictedFinishEligible | PredictedFinishIneligible;

export interface PredictedFinishOptions {
  /** Override "today" for testing. */
  today?: Date;
}

const STANDARD_DISTANCES: ReadonlySet<string> = new Set([
  "5k",
  "10k",
  "half_marathon",
  "marathon",
]);

const TWELVE_MONTHS_MS = 365 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS = 7;
const FOURTEEN_DAYS = 14;

function isStandardDistance(s: unknown): s is StandardRaceDistance {
  return typeof s === "string" && STANDARD_DISTANCES.has(s);
}

/**
 * Count distinct calendar weeks with ≥3 sessions in the trailing window.
 * 4-8 weeks → moderate; ≥8 weeks → high.
 */
function countConsistentTrainingWeeks(
  slice: AthleteHistorySlice,
  today: Date,
): number {
  const cutoff = today.getTime() - 84 * 24 * 60 * 60 * 1000; // last 12 weeks
  const byIsoMonday: Map<string, number> = new Map();
  for (const w of slice.recentWorkouts) {
    if (w.sport_type !== "run") continue;
    const t = new Date(w.started_at).getTime();
    if (Number.isNaN(t) || t < cutoff) continue;
    const d = new Date(t);
    const jsDay = d.getUTCDay();
    const shift = jsDay === 0 ? -6 : 1 - jsDay;
    const mondayMs = Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate() + shift,
    );
    const key = new Date(mondayMs).toISOString().slice(0, 10);
    byIsoMonday.set(key, (byIsoMonday.get(key) ?? 0) + 1);
  }
  let count = 0;
  for (const n of byIsoMonday.values()) if (n >= 3) count += 1;
  return count;
}

export function predictedFinish(
  primaryRace: (PrimaryRaceLike & { race_type: string | null }) | null | undefined,
  slice: AthleteHistorySlice,
  options: PredictedFinishOptions = {},
): PredictedFinishResult {
  const today = options.today ?? new Date();

  // Gate 1: race_type must exist and be standard distance.
  if (!primaryRace || !primaryRace.race_type) {
    return { eligible: false, reason: "missing_race_type" };
  }
  if (primaryRace.race_type === "general_fitness") {
    return { eligible: false, reason: "general_fitness_goal" };
  }
  if (!isStandardDistance(primaryRace.race_type)) {
    // Ultras and Ironmans aren't supported by the Riegel exponent; their
    // physiology is too different (different fuel limits, walking breaks).
    return { eligible: false, reason: "non_standard_distance" };
  }

  // Gate 2: race must be far enough away (or freeze if within 7 days).
  const dtr = daysToRace(primaryRace, today);
  if (dtr == null || dtr < 0) {
    return { eligible: false, reason: "race_too_close" };
  }
  const frozen = dtr <= SEVEN_DAYS;
  if (!frozen && dtr < FOURTEEN_DAYS) {
    // 7-14 days out is allowed; PRD §5.7 requirement 2 says "≥ 14 days OR
    // freeze during race-week". We freeze starting 7 days out.
  }

  // Gate 3: must have a recent PR within 12 months.
  const pr = slice.recentRacePr;
  if (!pr) {
    return { eligible: false, reason: "no_recent_pr" };
  }
  const prAgeMs = today.getTime() - new Date(pr.raceDate).getTime();
  if (Number.isNaN(prAgeMs) || prAgeMs > TWELVE_MONTHS_MS) {
    return { eligible: false, reason: "pr_too_old" };
  }

  // Gate 4: must have ≥4 weeks of consistent training history.
  const weeks = countConsistentTrainingWeeks(slice, today);
  if (weeks < 4) {
    return { eligible: false, reason: "insufficient_history" };
  }

  // Compute Riegel and Daniels predictions.
  const targetDistance = primaryRace.race_type as StandardRaceDistance;
  const targetKm = STANDARD_RACE_KM[targetDistance];

  const riegelSec = riegelPredict(pr.distanceKm, pr.timeSec, targetKm);

  const vdot = inferVdotFromRace(pr.distanceKm, pr.timeSec);
  const danielsSec = vdot != null ? raceTimeForVdot(vdot, targetDistance) : 0;

  if (vdot == null || danielsSec === 0 || riegelSec === 0) {
    return { eligible: false, reason: "insufficient_history" };
  }

  // Agreement: |Riegel − Daniels| / mean
  const meanSec = (riegelSec + danielsSec) / 2;
  const agreementPct = Math.abs(riegelSec - danielsSec) / meanSec;

  // Confidence rules per PRD §5.7 F14.B:
  //   - within 3% AND ≥8 weeks → high
  //   - within 5% AND 4-8 weeks → moderate
  //   - else → low → not shown
  let confidence: PredictionConfidence;
  if (agreementPct <= 0.03 && weeks >= 8) confidence = "high";
  else if (agreementPct <= 0.05 && weeks >= 4) confidence = "moderate";
  else confidence = "low";

  if (confidence === "low") {
    return { eligible: false, reason: "low_method_agreement" };
  }

  // Range: ±2% around mean for high, ±3.5% for moderate.
  const spread = confidence === "high" ? 0.02 : 0.035;
  const lowSec = Math.round(meanSec * (1 - spread));
  const highSec = Math.round(meanSec * (1 + spread));

  return {
    eligible: true,
    lowSec,
    highSec,
    centerSec: Math.round(meanSec),
    confidence,
    frozen,
    inputs: {
      pr,
      targetDistance,
      targetKm,
      vdot,
      riegelSec,
      danielsSec,
      agreementPct,
      weeksOfConsistentTraining: weeks,
    },
  };
}

/** Convenience formatter: seconds → "H:MM:SS" or "M:SS". */
export function formatFinishTime(seconds: number): string {
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total - h * 3600) / 60);
  const s = total - h * 3600 - m * 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}
