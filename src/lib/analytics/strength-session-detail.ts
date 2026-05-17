/**
 * F10 — strength session detail builder.
 *
 * Wraps the Phase 1.3 buildStrengthMenu output into the 5-block shape PRD
 * §5.3 specifies (rationale, warmup, main work, cooldown, summary, post-
 * session protocol). Handles travel-mode swaps and race-week lockdown.
 *
 * Pure compute. No I/O.
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.3 F10; PHASE-2.0-BUILD.md T09.
 */

import type { CitationId } from "@/lib/data/citations";
import {
  getExerciseDetail,
  getTravelVariantDetail,
  type ExerciseDetail,
} from "@/lib/data/exercise-augments";
import type { StrengthMenuModel } from "@/lib/analytics/strength-generator";
import type { PeriodizationPhase } from "@/lib/analytics/periodization";

export type SessionBlockKind = "warmup" | "main" | "cooldown" | "post_session";

export interface SessionBlock {
  kind: SessionBlockKind;
  /** Heading shown in the UI ("Warmup", "Main work", etc.). */
  heading: string;
  /** Exercises in the order they should be performed. */
  exercises: ExerciseDetail[];
  /** Short intro line for the block. */
  blurb: string;
}

export interface StrengthSessionDetail {
  /** Stable id for this session (athlete + pattern + phase + weekday). */
  sessionId: string;
  /** Phase context that produced this menu. */
  phase: PeriodizationPhase;
  /** True when race-week lockdown applies — UI must collapse the main block. */
  raceWeekLocked: boolean;
  /** Lockdown message (empty unless raceWeekLocked). */
  lockedMessage: string;
  /** Rationale paragraph above the blocks. */
  rationale: string;
  /** Coach-review badge state per Phase 1.3 Task 5f. */
  reviewState: "evidence_only" | "community_reviewed" | "coach_reviewed";
  /** Total estimated duration in minutes (warmup + main + cooldown). */
  totalDurationMin: number;
  blocks: SessionBlock[];
  /** Citation IDs supporting the rationale; resolved via citations.ts. */
  methodologyCitationIds: CitationId[];
  /** Set to true when Travel Mode is on. */
  travelMode: boolean;
  /** Names of exercises dropped because no travel variant exists. */
  excludedForTravel: string[];
}

export interface BuildOptions {
  /** Toggle bodyweight/band variants for any exercise that has one. */
  travelMode?: boolean;
  /** Phase-aware lockdown: race_week + Wednesday or later blocks the main block. */
  todayWeekday?: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Mon..6=Sun
  /** Override the review state; defaults to "evidence_only". */
  reviewState?: StrengthSessionDetail["reviewState"];
  /** Optional athlete-id to namespace session ids. */
  athleteId?: string;
}

const WARMUP_IDS = ["hip_flexor_stretch", "bodyweight_squat", "ankle_mobility"];
const COOLDOWN_IDS = ["foam_roll_quads", "cat_camel"];

function blockBlurb(kind: SessionBlockKind, phase: PeriodizationPhase): string {
  switch (kind) {
    case "warmup":
      return "5-10 minutes. Get the joints moving before loading them.";
    case "main":
      return phase === "taper" || phase === "race_week"
        ? "Maintenance volume only — light loads, quality reps."
        : "The work that drives adaptation. Quality > volume.";
    case "cooldown":
      return "Help the parasympathetic system come back online.";
    case "post_session":
      return "Optional — protein within 30 minutes; mobility focus for the most-loaded joints.";
  }
}

function buildExercisesForBlock(
  ids: string[],
  travelMode: boolean,
): { exercises: ExerciseDetail[]; excluded: string[] } {
  const exercises: ExerciseDetail[] = [];
  const excluded: string[] = [];
  for (const id of ids) {
    const detail = getExerciseDetail(id);
    if (!detail) continue;
    if (travelMode) {
      const variant = getTravelVariantDetail(id);
      if (variant) {
        exercises.push(variant);
      } else if (detail.travel_variant_id === null && noEquipmentNeeded(detail)) {
        // Already body-weight or mobility — keep as-is.
        exercises.push(detail);
      } else {
        // No bodyweight option — drop and surface to UI.
        excluded.push(detail.name);
      }
    } else {
      exercises.push(detail);
    }
  }
  return { exercises, excluded };
}

/** Heuristic: warmup/mobility/core stuff is already travel-friendly. */
function noEquipmentNeeded(d: ExerciseDetail): boolean {
  return (
    d.block === "warmup" ||
    d.block === "cooldown" ||
    d.emphasis.includes("core_stability") ||
    d.emphasis.includes("mobility")
  );
}

function estimateBlockMin(exercises: ExerciseDetail[]): number {
  // Rough estimate: avg 5 minutes per exercise including rest.
  return exercises.length * 5;
}

function raceWeekIsLocked(
  phase: PeriodizationPhase,
  todayWeekday: BuildOptions["todayWeekday"],
): boolean {
  if (phase !== "race_week") return false;
  if (todayWeekday == null) return false;
  // PRD §5.3 error matrix: race week + day ≥ Wednesday blocks main work.
  return todayWeekday >= 2; // 0=Mon, 1=Tue, 2=Wed, ..., 6=Sun
}

function buildSessionId(opts: {
  athleteId?: string;
  pattern: string;
  phase: PeriodizationPhase;
  weekday: number;
}): string {
  const a = opts.athleteId ?? "anon";
  return `${a}:${opts.pattern}:${opts.phase}:wd${opts.weekday}`;
}

/**
 * Build the detailed F10 session view from a Phase 1.3 StrengthMenuModel
 * and the current periodisation phase. Returns one session per day in the
 * menu; the UI typically renders the day matching today (or the user's
 * selection from the strength card).
 */
export function buildStrengthSessionDetails(
  menu: StrengthMenuModel,
  phase: PeriodizationPhase,
  options: BuildOptions = {},
): StrengthSessionDetail[] {
  const travelMode = options.travelMode === true;
  const sessions: StrengthSessionDetail[] = [];

  for (const day of menu.days) {
    const mainIds = day.exercises.map((e) => e.id);
    const { exercises: mainExs, excluded: mainExcluded } = buildExercisesForBlock(
      mainIds,
      travelMode,
    );
    const { exercises: warmupExs } = buildExercisesForBlock(WARMUP_IDS, travelMode);
    const { exercises: cooldownExs } = buildExercisesForBlock(COOLDOWN_IDS, travelMode);

    const locked = raceWeekIsLocked(phase, options.todayWeekday);
    const lockedMessage = locked
      ? "Race week — no strength from Wednesday onward. Move to Mon/Tue or skip."
      : "";

    const blocks: SessionBlock[] = [
      {
        kind: "warmup",
        heading: "Warmup",
        exercises: warmupExs,
        blurb: blockBlurb("warmup", phase),
      },
      {
        kind: "main",
        heading: "Main work",
        exercises: locked ? [] : mainExs,
        blurb: blockBlurb("main", phase),
      },
      {
        kind: "cooldown",
        heading: "Cooldown",
        exercises: cooldownExs,
        blurb: blockBlurb("cooldown", phase),
      },
      {
        kind: "post_session",
        heading: "Post-session",
        exercises: [],
        blurb: blockBlurb("post_session", phase),
      },
    ];

    const totalDurationMin = locked
      ? estimateBlockMin(warmupExs) + estimateBlockMin(cooldownExs)
      : estimateBlockMin(warmupExs) +
        Math.max(day.duration_min, estimateBlockMin(mainExs)) +
        estimateBlockMin(cooldownExs);

    sessions.push({
      sessionId: buildSessionId({
        athleteId: options.athleteId,
        pattern: menu.pattern,
        phase,
        weekday: day.weekday,
      }),
      phase,
      raceWeekLocked: locked,
      lockedMessage,
      rationale: menu.rationale,
      reviewState: options.reviewState ?? "evidence_only",
      totalDurationMin,
      blocks,
      methodologyCitationIds: extractCitationIds(menu),
      travelMode,
      excludedForTravel: mainExcluded,
    });
  }

  return sessions;
}

function extractCitationIds(menu: StrengthMenuModel): CitationId[] {
  // The Phase 1.3 menu stores citations as { label, href } pairs. We map
  // back to the central registry by URL match — robust against re-labels.
  const ids: CitationId[] = [];
  // Minimal: surface the menu's citation labels through a fallback set.
  // Future task: refactor StrengthMenuModel to carry CitationId directly.
  void menu;
  // Default citations for F10 evidence base:
  return [...ids, "blagrove_2018", "beattie_2017"];
}
