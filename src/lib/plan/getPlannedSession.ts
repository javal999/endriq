/**
 * F9 — combined read path for planned sessions on a given date.
 *
 * IMPORTANT — this is the ONLY legal read path for plan data (architecture
 * A2). All other modules must call `getPlannedSession` and never query
 * `planned_sessions` or `athletes.typical_week_pattern` directly. An ESLint
 * rule (no-restricted-syntax in eslint.config.mjs) enforces this; the
 * architecture review pass enforces it for design.
 *
 * Logic:
 *   1. Look up an explicit override in planned_sessions for (athlete, date).
 *   2. If found → return it as `isOverride: true`.
 *   3. Else fall back to the relevant weekday entry in
 *      athletes.typical_week_pattern.
 *   4. If neither exists → return an empty sessions list (rest day).
 *
 * The function uses a service-role-capable Supabase client because callers
 * may be server pages, route handlers, or background jobs. Each caller
 * passes a client that is already scoped to the correct security context
 * (RLS user-session OR admin-bypass); this helper does not pick.
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.2 F9 (system behavior);
 *       PHASE-2.0-ARCHITECTURE.md §5.2 (A2 enforcement); PHASE-2.0-BUILD.md T07.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isoDateToWeekday,
  type PlannedSessionsForDate,
  type PlannedSessionsRow,
  type TypicalWeekDay,
  type TypicalWeekPattern,
} from "./types";

export interface GetPlannedSessionOptions {
  /** Override the date used for weekday computation; useful for tests. */
  dateOverride?: Date;
}

export async function getPlannedSession(
  athleteId: string,
  date: string | Date,
  db: SupabaseClient,
): Promise<PlannedSessionsForDate> {
  const isoDate = toIsoDate(date);

  const [override, athlete] = await Promise.all([
    fetchOverride(db, athleteId, isoDate),
    fetchTypicalWeek(db, athleteId),
  ]);

  if (override) {
    return {
      sessions: override.sessions ?? [],
      isOverride: true,
      coachInstructionText: override.coach_instruction_text,
      interpretationJson: override.interpretation_json,
    };
  }

  const weekday = isoDateToWeekday(isoDate);
  const dayEntry = (athlete ?? []).find((d: TypicalWeekDay) => d.weekday === weekday);
  return {
    sessions: dayEntry?.sessions ?? [],
    isOverride: false,
    coachInstructionText: null,
    interpretationJson: null,
  };
}

async function fetchOverride(
  db: SupabaseClient,
  athleteId: string,
  isoDate: string,
): Promise<PlannedSessionsRow | null> {
  const { data, error } = await db
    .from("planned_sessions")
    .select(
      "id, athlete_id, planned_date, sessions, interpretation_json, coach_instruction_text, updated_at",
    )
    .eq("athlete_id", athleteId)
    .eq("planned_date", isoDate)
    .maybeSingle();
  if (error) {
    throw new Error(`getPlannedSession.fetchOverride: ${error.message}`);
  }
  return (data as PlannedSessionsRow | null) ?? null;
}

async function fetchTypicalWeek(
  db: SupabaseClient,
  athleteId: string,
): Promise<TypicalWeekPattern | null> {
  const { data, error } = await db
    .from("athletes")
    .select("typical_week_pattern")
    .eq("id", athleteId)
    .maybeSingle();
  if (error) {
    throw new Error(`getPlannedSession.fetchTypicalWeek: ${error.message}`);
  }
  return (data?.typical_week_pattern as TypicalWeekPattern) ?? null;
}

/**
 * Public read for the athlete's typical-week pattern. Architecture A2:
 * everywhere outside lib/plan/ must use this helper rather than reading
 * athletes.typical_week_pattern directly.
 */
export async function getTypicalWeekPattern(
  athleteId: string,
  db: SupabaseClient,
): Promise<TypicalWeekPattern> {
  return (await fetchTypicalWeek(db, athleteId)) ?? [];
}

/**
 * Batch read — sessions for every date in [startIso, endInclusiveIso].
 * Used by /race to compute 22 weeks × 7 days without firing 154 sequential
 * supabase calls. Returns one entry per date (rest days included).
 *
 * Reads typical_week_pattern once and planned_sessions overrides in one
 * range query; merges in memory. Same semantics as getPlannedSession
 * date-by-date — overrides win.
 */
export async function getPlannedSessionsRange(
  athleteId: string,
  startIso: string,
  endInclusiveIso: string,
  db: SupabaseClient,
): Promise<Map<string, PlannedSessionsForDate>> {
  const [pattern, overridesRes] = await Promise.all([
    fetchTypicalWeek(db, athleteId),
    db
      .from("planned_sessions")
      .select(
        "id, athlete_id, planned_date, sessions, interpretation_json, coach_instruction_text, updated_at",
      )
      .eq("athlete_id", athleteId)
      .gte("planned_date", startIso)
      .lte("planned_date", endInclusiveIso),
  ]);

  if (overridesRes.error) {
    throw new Error(
      `getPlannedSessionsRange.fetchOverrides: ${overridesRes.error.message}`,
    );
  }

  const byDate = new Map<string, PlannedSessionsRow>();
  for (const row of (overridesRes.data ?? []) as PlannedSessionsRow[]) {
    if (typeof row.planned_date === "string") byDate.set(row.planned_date, row);
  }

  const out = new Map<string, PlannedSessionsForDate>();
  const startMs = Date.parse(`${startIso}T00:00:00Z`);
  const endMs = Date.parse(`${endInclusiveIso}T00:00:00Z`);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return out;

  const days = Math.floor((endMs - startMs) / 86400000) + 1;
  for (let i = 0; i < days; i += 1) {
    const ts = startMs + i * 86400000;
    const d = new Date(ts);
    const iso = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;

    const override = byDate.get(iso);
    if (override) {
      out.set(iso, {
        sessions: override.sessions ?? [],
        isOverride: true,
        coachInstructionText: override.coach_instruction_text,
        interpretationJson: override.interpretation_json,
      });
      continue;
    }
    const weekday = isoDateToWeekday(iso);
    const dayEntry = (pattern ?? []).find((p) => p.weekday === weekday);
    out.set(iso, {
      sessions: dayEntry?.sessions ?? [],
      isOverride: false,
      coachInstructionText: null,
      interpretationJson: null,
    });
  }
  return out;
}

function toIsoDate(d: string | Date): string {
  if (typeof d === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    return new Date(d).toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}
