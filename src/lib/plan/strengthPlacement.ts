/**
 * F9 — strength placement rules.
 *
 * Pure compute. Given an athlete's typical-week pattern, surface advisories
 * about strength scheduling:
 *
 *   - 48-hour buffer before a heavy run (tempo / interval / long)
 *   - Volume cap per phase (default 2/week; race-week bans all strength
 *     from Wednesday onward — that rule is handled at consumer time when
 *     phase context is available)
 *   - "All rest week" detection — surfaces a banner upstream
 *
 * Race-week lockdown handled by consumers (F10 has the phase context); this
 * module produces advisories that compose with phase-aware rules.
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.2 F9; PHASE-2.0-BUILD.md T07.
 */

import type {
  PlannedSessionEntry,
  SessionType,
  TypicalWeekPattern,
  WeekdayIndex,
} from "./types";

const HEAVY_RUN_TYPES = new Set<SessionType>(["tempo", "interval", "long_run"]);
const STRENGTH_TYPE: SessionType = "strength";
const REST_TYPE: SessionType = "rest";

export type AdvisoryKind =
  | "strength_48h_buffer"
  | "strength_volume_cap"
  | "all_rest_week"
  | "no_training_days";

export interface PlacementAdvisory {
  kind: AdvisoryKind;
  /** 0=Mon..6=Sun, or null for week-level advisories. */
  weekday: WeekdayIndex | null;
  /** Short human-readable message (English; UI localises). */
  message: string;
  /** Optional suggested move: relocate strength from `from` to `to`. */
  suggestedMove?: { from: WeekdayIndex; to: WeekdayIndex };
  /** Severity hint — UI maps to AdvisoryTone. */
  severity: "info" | "warn" | "block";
}

export interface StrengthPlacementResult {
  advisories: PlacementAdvisory[];
  /** Quick counters used by consumers (e.g. for a "X strength days" header). */
  strengthDayCount: number;
  trainingDayCount: number;
}

const WEEKDAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export interface CheckOptions {
  /** Strength sessions allowed in this week. Default 2 (build-phase cap). */
  maxStrengthPerWeek?: number;
}

export function checkStrengthPlacement(
  pattern: TypicalWeekPattern,
  options: CheckOptions = {},
): StrengthPlacementResult {
  const maxStrength = options.maxStrengthPerWeek ?? 2;

  // Materialise a 7-slot array regardless of which days the pattern lists.
  const byDay: Array<PlannedSessionEntry[]> = Array.from({ length: 7 }, () => []);
  for (const d of pattern) {
    if (d.weekday >= 0 && d.weekday < 7) byDay[d.weekday] = d.sessions;
  }

  const advisories: PlacementAdvisory[] = [];
  let strengthCount = 0;
  let trainingDayCount = 0;
  const strengthDays: WeekdayIndex[] = [];

  for (let w = 0 as WeekdayIndex; w < 7; w = ((w + 1) as WeekdayIndex)) {
    const sessions = byDay[w];
    const hasNonRest = sessions.some((s) => s.type !== REST_TYPE);
    if (hasNonRest) trainingDayCount += 1;
    if (sessions.some((s) => s.type === STRENGTH_TYPE)) {
      strengthCount += 1;
      strengthDays.push(w);
    }
  }

  // 48h buffer: for each strength day, check whether day+1 has a heavy run.
  for (const sDay of strengthDays) {
    const nextDay = ((sDay + 1) % 7) as WeekdayIndex;
    const nextSessions = byDay[nextDay];
    if (nextSessions.some((s) => HEAVY_RUN_TYPES.has(s.type))) {
      // Suggested move: shift strength one day earlier if that slot is light.
      let suggested: PlacementAdvisory["suggestedMove"];
      const earlier = ((sDay + 6) % 7) as WeekdayIndex;
      const earlierLight = !byDay[earlier].some(
        (s) => HEAVY_RUN_TYPES.has(s.type) || s.type === STRENGTH_TYPE,
      );
      if (earlierLight) suggested = { from: sDay, to: earlier };

      advisories.push({
        kind: "strength_48h_buffer",
        weekday: sDay,
        message: `Heavy strength on ${WEEKDAY_NAMES[sDay]} is <48h before ${WEEKDAY_NAMES[nextDay]}'s heavy run. ${
          suggested
            ? `Move strength to ${WEEKDAY_NAMES[suggested.to]} or skip?`
            : "Consider skipping or moving to an easier-recovery day."
        }`,
        severity: "warn",
        suggestedMove: suggested,
      });
    }
  }

  // Volume cap.
  if (strengthCount > maxStrength) {
    advisories.push({
      kind: "strength_volume_cap",
      weekday: null,
      message: `${strengthCount} strength sessions exceeds the recommended cap for your phase (${maxStrength}/week).`,
      severity: "warn",
    });
  }

  // All-rest detection.
  if (trainingDayCount === 0) {
    advisories.push({
      kind: "all_rest_week",
      weekday: null,
      message: "No training planned this week — is that intentional?",
      severity: "info",
    });
  }

  return {
    advisories,
    strengthDayCount: strengthCount,
    trainingDayCount,
  };
}
