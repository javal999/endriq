// @ts-nocheck
import type { StravaSummaryActivity } from "./types";
import {
  classifySession,
  hrZoneDistributionFromAvg,
  runningTrainingStress,
  strengthTrainingStress,
} from "@/lib/normalizer";

function stravaTypeToSport(type: string): "run" | "strength" | "bike" | "other" {
  const t = type.toLowerCase();
  if (t === "run" || t === "trail run" || t === "virtualrun") return "run";
  if (
    t === "weighttraining" ||
    t === "workout" ||
    t === "crossfit" ||
    t.includes("strength")
  )
    return "strength";
  if (t === "ride" || t === "virtualride" || t === "ebikeride") return "bike";
  return "other";
}

export interface WorkoutInsertRow {
  athlete_id: string;
  source: "strava";
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

/**
 * Maps a Strava summary activity into rows ready for `workouts` insert.
 * `observedMaxHr` drives zone distribution + stress when avg HR exists.
 */
export function mapStravaActivityToWorkout(
  athleteId: string,
  a: StravaSummaryActivity,
  observedMaxHr: number,
): WorkoutInsertRow {
  const sport_type = stravaTypeToSport(a.type);
  const started_at = new Date(a.start_date).toISOString();
  const duration_seconds =
    a.moving_time > 0 ? a.moving_time : a.elapsed_time ?? 0;
  const distance_meters =
    typeof a.distance === "number" && Number.isFinite(a.distance)
      ? Math.round(a.distance)
      : null;

  const avg_hr =
    typeof a.average_heartrate === "number"
      ? Math.round(a.average_heartrate)
      : null;
  const max_hr =
    typeof a.max_heartrate === "number" ? Math.round(a.max_heartrate) : null;

  const session_label = classifySession(
    sport_type,
    avg_hr,
    max_hr,
    duration_seconds,
    distance_meters,
  );

  const hr_zone_distribution =
    sport_type === "run"
      ? hrZoneDistributionFromAvg(avg_hr, observedMaxHr)
      : null;

  const training_stress =
    sport_type === "run"
      ? runningTrainingStress(duration_seconds, avg_hr, observedMaxHr)
      : sport_type === "strength"
        ? strengthTrainingStress(null, null)
        : null;

  return {
    athlete_id: athleteId,
    source: "strava",
    source_id: String(a.id),
    sport_type,
    session_label,
    started_at,
    duration_seconds,
    distance_meters,
    avg_hr,
    max_hr,
    avg_cadence: null,
    elevation_gain_meters: null,
    calories: null,
    total_sets: null,
    training_stress,
    hr_zone_distribution,
  };
}
