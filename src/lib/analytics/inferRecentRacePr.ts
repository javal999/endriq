/**
 * Find a recent race-like workout to serve as recentRacePr.
 *
 * Used by F14.B (predicted finish) until/unless the athlete profile gains
 * an explicit "log your PR" field.
 *
 * Strategy:
 *   1. Filter `workouts` to runs in the last 12 months with valid time +
 *      distance ≥ 4.5km.
 *   2. Prefer workouts whose session_label is "race"; if multiple, pick
 *      the fastest pace.
 *   3. If no race-labeled workout exists, fall back to the fastest pace
 *      among long enough runs — this catches solo time-trials and
 *      hard tempo sessions that the parser missed.
 *   4. Map the actual distance to the nearest standard race distance
 *      (5K / 10K / half / marathon).
 *
 * Pure function. No I/O.
 */

import type { AthleteHistorySlice, WorkoutForAnalysis } from "./types";

const TWELVE_MONTHS_MS = 365 * 24 * 60 * 60 * 1000;
const MIN_DISTANCE_M = 4500;

const STANDARDS: ReadonlyArray<{ km: number }> = [
  { km: 5 },
  { km: 10 },
  { km: 21.0975 },
  { km: 42.195 },
];

function nearestStandardKm(actualKm: number): number {
  let best = STANDARDS[0].km;
  let bestDelta = Math.abs(actualKm - best);
  for (const s of STANDARDS) {
    const d = Math.abs(actualKm - s.km);
    if (d < bestDelta) {
      best = s.km;
      bestDelta = d;
    }
  }
  return best;
}

export function inferRecentRacePr(
  recentWorkouts: WorkoutForAnalysis[],
  today: Date = new Date(),
): AthleteHistorySlice["recentRacePr"] | undefined {
  const cutoff = today.getTime() - TWELVE_MONTHS_MS;
  const candidates = recentWorkouts.filter((w) => {
    if (w.sport_type !== "run") return false;
    if (w.distance_meters == null || w.distance_meters < MIN_DISTANCE_M) return false;
    if (w.duration_seconds <= 0) return false;
    const t = new Date(w.started_at).getTime();
    return !Number.isNaN(t) && t >= cutoff;
  });
  if (candidates.length === 0) return undefined;

  const labeled = candidates.filter((w) => w.session_label === "race");
  const pool = labeled.length > 0 ? labeled : candidates;

  // Best = fastest pace among the pool. Filter out absurd outliers (≥6:00/km
  // is unlikely to be a race even for novices over 5K).
  const ranked = pool
    .map((w) => ({
      w,
      paceSecPerKm: w.duration_seconds / ((w.distance_meters ?? 1) / 1000),
    }))
    .filter((x) => x.paceSecPerKm <= 6 * 60 && x.paceSecPerKm >= 2 * 60)
    .sort((a, b) => a.paceSecPerKm - b.paceSecPerKm);
  if (ranked.length === 0) return undefined;

  const best = ranked[0];
  const actualKm = (best.w.distance_meters ?? 0) / 1000;
  const targetKm = nearestStandardKm(actualKm);
  // Scale time linearly to the nearest standard distance to avoid biasing
  // the prediction by a few hundred metres of GPS drift.
  const timeSec = Math.round((best.w.duration_seconds / actualKm) * targetKm);

  return {
    distanceKm: targetKm,
    timeSec,
    raceDate: best.w.started_at.slice(0, 10),
  };
}
