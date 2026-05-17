/**
 * Shared types for the F9 typical-week + planned-session domain.
 *
 * The JSONB shape in athletes.typical_week_pattern and
 * planned_sessions.sessions is intentionally identical so reads/writes can
 * share the same TypeScript surface.
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.2 F9.
 */

export type SessionType =
  | "easy_run"
  | "long_run"
  | "tempo"
  | "interval"
  | "drill"
  | "strides"
  | "recovery"
  | "swim"
  | "bike"
  | "cross_training"
  | "strength"
  | "rest";

/** 0 = Monday … 6 = Sunday (ISO weekday minus one). */
export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface PlannedSessionEntry {
  type: SessionType;
  default_duration_min?: number;
  default_rpe?: number;
  default_instruction?: string;
  /** Optional free-form note shown on the planner cell. */
  note?: string;
}

export interface TypicalWeekDay {
  weekday: WeekdayIndex;
  sessions: PlannedSessionEntry[];
}

export type TypicalWeekPattern = TypicalWeekDay[];

export interface PlannedSessionsRow {
  id: string;
  athlete_id: string;
  planned_date: string; // YYYY-MM-DD
  sessions: PlannedSessionEntry[];
  interpretation_json: unknown | null;
  coach_instruction_text: string | null;
  updated_at: string;
}

/**
 * Read-shape returned by getPlannedSession — the unified view that combines
 * the typical-week fallback with any per-date override.
 */
export interface PlannedSessionsForDate {
  /** The session list to show on this date. */
  sessions: PlannedSessionEntry[];
  /** True when this date has an explicit override row (vs falling back to pattern). */
  isOverride: boolean;
  /** Free-form coach instruction attached to the override, if any. */
  coachInstructionText: string | null;
  /** Cached F8 interpretation, if any. */
  interpretationJson: unknown | null;
}

/**
 * Convert an ISO date string (YYYY-MM-DD) to the 0=Monday weekday index.
 * Floors to UTC day to avoid local-time off-by-one bugs.
 */
export function isoDateToWeekday(isoDate: string): WeekdayIndex {
  const d = new Date(`${isoDate}T00:00:00Z`);
  // JS getUTCDay returns 0=Sunday..6=Saturday; we want 0=Monday..6=Sunday.
  const jsDay = d.getUTCDay();
  return (((jsDay + 6) % 7) as WeekdayIndex);
}
