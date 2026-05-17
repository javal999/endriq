/**
 * F15 — periodisation phase detection.
 *
 * Single source of truth: every Phase 2.0 feature that needs to know "where
 * is the athlete in their season?" reads from currentPhase(). Strength
 * volume (F10), countdown card (F14), recovery override rules (F12), and
 * pre-session preview (F11) all consume this.
 *
 * Pure function. Deterministic. No I/O.
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.8; PHASE-2.0-ARCHITECTURE.md §3.4 / §5.1.
 */

import { taperBoundaryDays } from "@/lib/data/taperBoundaries";

export type PeriodizationPhase =
  | "transition"
  | "general_prep"
  | "specific_prep"
  | "pre_competition"
  | "taper"
  | "race_week"
  | "recovery";

export interface PrimaryRaceLike {
  /** ISO date string (YYYY-MM-DD or full ISO). The function reads only the date. */
  race_date: string;
  /**
   * Race type string. Anything outside the known enum falls through to the
   * "other_endurance" defaults via taperBoundaryDays.
   */
  race_type: string | null | undefined;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * UTC-midnight floor of a Date — drops local-time skew so two timestamps on
 * the same calendar day always produce daysToRace = 0.
 */
function floorToUtcDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function parseRaceDateToUtcDay(raceDate: string): number | null {
  // Accept "YYYY-MM-DD" without time, or full ISO. Both parse to a valid Date;
  // we then floor to UTC day.
  const d = new Date(raceDate);
  if (Number.isNaN(d.getTime())) return null;
  return floorToUtcDay(d);
}

/**
 * Returns the athlete's current periodisation phase.
 *
 * Behaviour matrix (PRD §5.8 error matrix):
 *   - primaryRace null / undefined           → "transition"
 *   - race_date unparseable / NaN            → "transition"
 *   - race in distant past (> 14 days ago)   → "transition"
 *   - race in recent past (0–14 days ago)    → "recovery"
 *   - race_type unknown                      → "other_endurance" defaults
 *
 * `today` defaults to the current wall-clock time, but every consumer should
 * pass an explicit Date for testability and SSR determinism.
 */
export function currentPhase(
  primaryRace: PrimaryRaceLike | null | undefined,
  today: Date = new Date(),
): PeriodizationPhase {
  if (!primaryRace) return "transition";

  const raceDay = parseRaceDateToUtcDay(primaryRace.race_date);
  if (raceDay == null) return "transition";

  const todayDay = floorToUtcDay(today);
  const daysToRace = Math.round((raceDay - todayDay) / MS_PER_DAY);

  if (daysToRace < -14) return "transition";
  if (daysToRace < 0) return "recovery";

  const { taperDays, raceWeekDays } = taperBoundaryDays(primaryRace.race_type);

  if (daysToRace <= raceWeekDays) return "race_week";
  if (daysToRace <= taperDays) return "taper";
  if (daysToRace <= 42) return "pre_competition"; // 6 weeks
  if (daysToRace <= 84) return "specific_prep"; // 12 weeks
  if (daysToRace <= 154) return "general_prep"; // 22 weeks
  return "transition"; // > 22 weeks out
}

/**
 * Helper for UI surfaces that want to display "days to race" alongside the
 * phase label. Returns null when the race is missing or unparseable.
 */
export function daysToRace(
  primaryRace: PrimaryRaceLike | null | undefined,
  today: Date = new Date(),
): number | null {
  if (!primaryRace) return null;
  const raceDay = parseRaceDateToUtcDay(primaryRace.race_date);
  if (raceDay == null) return null;
  return Math.round((raceDay - floorToUtcDay(today)) / MS_PER_DAY);
}
