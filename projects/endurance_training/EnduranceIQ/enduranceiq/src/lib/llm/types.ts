/** Structured weekly narrative stored as JSON (TEXT column) after serialization. */
export interface LlmWeeklySections {
  wentWell: string;
  needsWork: string;
  nextWeek: string;
}

/** One row in `weekly_analyses.llm_session_statuses` JSONB array. */
export interface LlmSessionStatusRow {
  workout_id: string;
  explanation: string;
}

/** Prompt-facing snapshot built only from DB-derived metrics (no activity titles). */
export interface LlmWeeklyBundle {
  athleteId: string;
  weekStart: string;
  goalRaceType: string | null;
  goalRaceDate: string | null;
  goalWeeklyKm: number | null;
  weeksOfDataApprox: number;
  totalDistanceKm: number;
  prevWeekDistanceKm: number;
  monthAvgDistanceKm: number;
  runningSessions: number;
  strengthSessions: number;
  totalTimeMinutes: number;
  pctEasy: number;
  pctModerate: number;
  pctHard: number;
  loadRatio: number | null;
  loadStatusWord: string;
  maxHr: number;
  z2Ceiling: number;
  sessionsText: string;
  findingsText: string;
  interferenceDetected: boolean;
  interferenceSnippet: string;
  avgEasyRunHr: number | null;
  sessionLedgerJson: string;
  workoutIds: string[];
}
