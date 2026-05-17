/**
 * Today's Plan — pure synthesis of recovery + load + planned-session.
 *
 * Phase 2.1 §T02. Rules-based, no LLM. The output drives /dashboard's
 * "Today's plan" tile. Returns a recommendation enum + a deterministic
 * summary sentence + the three contributors that produced it (so the
 * athlete can see which inputs drove the call).
 *
 * No AISparkle on the consuming tile — this is deterministic compute.
 */

import type { Feeling } from "./recoveryOverride";
import type { PeriodizationPhase } from "./periodization";
import type { PlannedSessionEntry, SessionType } from "@/lib/plan/types";

export type TodaysPlanRecommendation =
  | "train_as_planned"
  | "ease_back"
  | "consider_rest"
  | "no_session";

export interface PlannedSessionToday {
  sessions: PlannedSessionEntry[];
}

export interface TodaysPlanInput {
  latestRecoveryCheckIn: Feeling | null;
  loadRatio: number | null;
  plannedSession: PlannedSessionToday | null;
  phase: PeriodizationPhase;
  /** True when the athlete has at least one weekday in typical_week_pattern. */
  hasTypicalWeekPattern?: boolean;
  /** Most recent post-session "feel" surveys for the same session type — newest first. */
  recentSurveyFeels?: ReadonlyArray<"easier_than_expected" | "right" | "harder_than_expected">;
}

export interface TodaysPlanContributor {
  label: string;
  value: string;
  tone: "good" | "warn" | "bad" | "neutral";
}

export interface TodaysPlanOutput {
  recommendation: TodaysPlanRecommendation;
  /** One- or two-sentence rationale, deterministic from rules. */
  summarySentence: string;
  contributors: TodaysPlanContributor[];
  /** True when the tile should render with a warn-tone left border (council fix #10). */
  isOverride: boolean;
}

const HEAVY_RUN_TYPES = new Set<SessionType>(["tempo", "interval", "long_run"]);
const HEAVY_TYPES = new Set<SessionType>([...HEAVY_RUN_TYPES, "strength"]);

function isHeavyToday(sessions: PlannedSessionEntry[] | undefined): boolean {
  if (!sessions) return false;
  return sessions.some((s) => HEAVY_TYPES.has(s.type));
}

function formatSessionList(sessions: PlannedSessionEntry[]): string {
  if (sessions.length === 0) return "rest";
  const labels: Record<SessionType, string> = {
    easy_run: "easy run",
    long_run: "long run",
    tempo: "tempo",
    interval: "intervals",
    strides: "strides",
    drill: "drills",
    recovery: "recovery",
    swim: "swim",
    bike: "bike",
    cross_training: "cross-training",
    strength: "strength",
    rest: "rest",
  };
  return sessions.map((s) => labels[s.type]).join(" + ");
}

function loadTone(loadRatio: number | null): TodaysPlanContributor["tone"] {
  if (loadRatio == null) return "neutral";
  if (loadRatio > 1.5) return "bad";
  if (loadRatio > 1.3) return "warn";
  if (loadRatio < 0.8) return "warn";
  return "good";
}

function loadValue(loadRatio: number | null): string {
  if (loadRatio == null) return "—";
  return loadRatio.toFixed(2);
}

function feelingValue(feeling: Feeling | null): string {
  if (!feeling) return "Not yet checked in";
  return { sharp: "Sharp", okay: "Okay", tired: "Tired" }[feeling];
}

function feelingTone(feeling: Feeling | null): TodaysPlanContributor["tone"] {
  if (feeling === "sharp") return "good";
  if (feeling === "okay") return "neutral";
  if (feeling === "tired") return "warn";
  return "neutral";
}

function surveySignalsHarder(
  recent: TodaysPlanInput["recentSurveyFeels"] | undefined,
): boolean {
  if (!recent || recent.length < 2) return false;
  const lastTwo = recent.slice(0, 2);
  return lastTwo.every((f) => f === "harder_than_expected");
}

/**
 * Pure: given an input, returns the recommendation + sentence + contributors.
 *
 * Decision logic (PRD §5.5 + Phase 2.1 §T02):
 *   - no planned session AND (no typical-week pattern OR pattern empty) → no_session
 *   - tired + heavy session + load > 1.3 → consider_rest
 *   - tired + heavy session → ease_back
 *   - recent surveys signal "harder than expected" + heavy session → ease_back
 *   - otherwise → train_as_planned
 */
export function computeTodaysPlan(input: TodaysPlanInput): TodaysPlanOutput {
  const sessions = input.plannedSession?.sessions ?? [];
  const heavy = isHeavyToday(sessions);
  const noSession = sessions.length === 0 || sessions.every((s) => s.type === "rest");

  const contributors: TodaysPlanContributor[] = [
    {
      label: "Recovery",
      value: feelingValue(input.latestRecoveryCheckIn),
      tone: feelingTone(input.latestRecoveryCheckIn),
    },
    {
      label: "Load ratio",
      value: loadValue(input.loadRatio),
      tone: loadTone(input.loadRatio),
    },
    {
      label: "Planned",
      value: noSession ? "Rest" : formatSessionList(sessions),
      tone: "neutral",
    },
  ];

  // Branch 1: no session at all and no typical-week pattern → hide
  if (noSession && !input.hasTypicalWeekPattern) {
    return {
      recommendation: "no_session",
      summarySentence: "No session planned. Set a typical week in Settings to see daily plans.",
      contributors,
      isOverride: false,
    };
  }

  // Branch 2: rest day on the pattern
  if (noSession) {
    return {
      recommendation: "no_session",
      summarySentence: "Rest day — recover, hydrate, sleep well.",
      contributors,
      isOverride: false,
    };
  }

  // Branch 3: tired + heavy + load spike → consider rest
  if (
    input.latestRecoveryCheckIn === "tired" &&
    heavy &&
    input.loadRatio != null &&
    input.loadRatio > 1.3
  ) {
    return {
      recommendation: "consider_rest",
      summarySentence:
        "You logged tired and your load is elevated. A rest day or easy 30 minutes is a better trade than the planned hard work.",
      contributors,
      isOverride: true,
    };
  }

  // Branch 4: tired + heavy → ease back
  if (input.latestRecoveryCheckIn === "tired" && heavy) {
    return {
      recommendation: "ease_back",
      summarySentence:
        "Tired and a hard day planned — swap to easy at the same duration, or shorten the planned work.",
      contributors,
      isOverride: true,
    };
  }

  // Branch 5: post-session signals → ease back on the next quality session
  if (heavy && surveySignalsHarder(input.recentSurveyFeels)) {
    return {
      recommendation: "ease_back",
      summarySentence:
        "Your last two same-type sessions felt harder than expected — go in conservative, RPE-led today.",
      contributors,
      isOverride: true,
    };
  }

  // Default
  return {
    recommendation: "train_as_planned",
    summarySentence:
      heavy
        ? `Planned ${formatSessionList(sessions)}. Recovery + load look fine — train as planned.`
        : `Easy day on plan (${formatSessionList(sessions)}). Conversational pace, full breath.`,
    contributors,
    isOverride: false,
  };
}
