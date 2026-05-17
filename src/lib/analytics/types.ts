/**
 * Phase 2.0 — shared analytics types.
 *
 * AthleteHistorySlice is the canonical input shape for every history-aware
 * analytics module (interpretRun, runningPatterns, predictedFinish's
 * sufficiency check, personal-calibration in F8.4).
 *
 * Adding or removing a field here is a contract change: every consumer breaks
 * on compile. That is the point — it forces synchronized updates.
 *
 * Refs: PHASE-2.0-ARCHITECTURE.md §5.1 (A1).
 */

export type SexLabel = "male" | "female";

export type WorkoutSport = "run" | "strength" | "swim" | "bike" | "other";

export interface WorkoutForAnalysis {
  id: string;
  source: string;
  sport_type: WorkoutSport;
  session_label: string | null;
  started_at: string;
  duration_seconds: number;
  distance_meters: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  avg_cadence: number | null;
  training_stress: number | null;
}

export interface WeeklyAnalysisSummary {
  week_start: string;
  total_distance_meters: number;
  acute_load: number | null;
  pct_zone1_2: number | null;
  pct_load_z1_2: number | null;
}

export interface RecentRacePr {
  distanceKm: number;
  timeSec: number;
  raceDate: string;
}

export interface AthleteHistorySlice {
  athleteId: string;
  observedMaxHr: number | null;
  hrRest: number | null;
  sex: SexLabel;
  recentRacePr?: RecentRacePr;
  /** Trailing 35 days of completed workouts with HR data, ordered started_at ASC. */
  recentWorkouts: WorkoutForAnalysis[];
  /** Trailing 4 weekly_analyses rows, ordered week_start ASC. */
  recentWeeklyAnalyses: WeeklyAnalysisSummary[];
}
