/**
 * Maps a COROS summary activity to the canonical `workouts` insert shape.
 * Activity type codes: verify against COROS Open Platform docs at build time.
 */
// @ts-nocheck


import type { CorоsSummaryActivity } from "./types";
import {
  classifySession,
  hrZoneDistributionFromAvg,
  runningTrainingStress,
  strengthTrainingStress,
} from "@/lib/normalizer";

/**
 * COROS activity mode codes → canonical sport type.
 * Mode IDs are subject to change — verify against opens.coros.com documentation.
 * Currently known mappings based on COROS Open Platform v2 (2025):
 *   100 = Outdoor Run, 101 = Indoor Run, 102 = Trail Run, 103 = Virtual Run
 *   200 = Outdoor Bike, 201 = Indoor Bike
 *   401 = Strength Training, 402 = Gym
 */
function corosModeToSport(mode: number | undefined): "run" | "strength" | "bike" | "other" {
  if (mode == null) return "other";
  if (mode >= 100 && mode <= 109) return "run";
  if (mode >= 200 && mode <= 209) return "bike";
  if (mode === 401 || mode === 402) return "strength";
  return "other";
}

/** Parse COROS startTime — may be ISO string or Unix seconds. */
function parseStartTime(raw: string | number | undefined): string {
  if (raw == null) return new Date().toISOString();
  if (typeof raw === "number") return new Date(raw * 1000).toISOString();
  return new Date(raw).toISOString();
}

export interface CorosWorkoutInsertRow {
  athlete_id: string;
  source: "coros";
  source_id: string;
  sport_type: string;
  session_label: string | null;
  started_at: string;
  duration_seconds: number;
  distance_meters: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  avg_cadence: number | null;
  elevation_gain_meters: number | null;
  calories: number | null;
  total_sets: number | null;
  training_stress: number | null;
  hr_zone_distribution: Record<string, number> | null;
}

export function mapCorosActivityToWorkout(
  athleteId: string,
  a: CorоsSummaryActivity,
  observedMaxHr: number,
): CorosWorkoutInsertRow {
  const sport_type = corosModeToSport(a.mode);
  const source_id = a.sportDataId ?? a.labelId ?? `coros-${Date.now()}`;
  const started_at = parseStartTime(a.startTime);
  const duration_seconds =
    typeof a.totalTime === "number" && a.totalTime > 0 ? Math.round(a.totalTime) : 0;
  const distance_meters =
    typeof a.totalDistance === "number" ? Math.round(a.totalDistance) : null;
  const avg_hr =
    typeof a.avgHeartRate === "number" ? Math.round(a.avgHeartRate) : null;
  const max_hr =
    typeof a.maxHeartRate === "number" ? Math.round(a.maxHeartRate) : null;

  const session_label = classifySession(
    sport_type,
    avg_hr,
    max_hr,
    duration_seconds,
    distance_meters,
  );

  const hr_zone_distribution =
    sport_type === "run" ? hrZoneDistributionFromAvg(avg_hr, observedMaxHr) : null;

  const training_stress =
    sport_type === "run"
      ? runningTrainingStress(duration_seconds, avg_hr, observedMaxHr)
      : sport_type === "strength"
        ? strengthTrainingStress(null, null)
        : null;

  return {
    athlete_id: athleteId,
    source: "coros",
    source_id,
    sport_type,
    session_label,
    started_at,
    duration_seconds,
    distance_meters,
    avg_hr,
    max_hr,
    avg_cadence: typeof a.avgCadence === "number" ? Math.round(a.avgCadence) : null,
    elevation_gain_meters:
      typeof a.totalAscent === "number" ? Math.round(a.totalAscent) : null,
    calories: typeof a.calorie === "number" ? Math.round(a.calorie) : null,
    total_sets: null,
    training_stress,
    hr_zone_distribution,
  };
}
