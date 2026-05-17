/**
 * F12 — recovery override rules.
 *
 * Given tomorrow's planned sessions + an athlete's current feeling state,
 * produces a SwapPlan suggesting how to ease the day: substitute hard
 * runs for easier ones, swap lower-body strength for upper-body,
 * substitute plyometrics for mobility, etc.
 *
 * Pure compute. No I/O.
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.5 F12; PHASE-2.0-BUILD.md T12 step 2.
 */

import type { PlannedSessionEntry, SessionType } from "@/lib/plan/types";

export type Feeling = "sharp" | "okay" | "tired";

export interface SessionSwap {
  fromType: SessionType;
  toType: SessionType;
  reason: string;
}

export interface SwapPlan {
  /** True iff the original plan was "heavy" enough to warrant the prompt. */
  isHeavyDay: boolean;
  /** The proposed swaps, in the order they'd be applied. Empty when no swap needed. */
  swaps: SessionSwap[];
  /** Combined sessions list after the swaps (used to upsert planned_sessions). */
  swappedSessions: PlannedSessionEntry[];
  /** A one-line summary the UI surfaces ("Swap intervals → easy + skip strength"). */
  summary: string;
}

const HEAVY_RUN_TYPES = new Set<SessionType>(["tempo", "interval", "long_run"]);
const HEAVY_NON_RUN_TYPES = new Set<SessionType>(["strength"]);

const RUN_SWAP_TARGET: Record<SessionType, SessionType | null> = {
  tempo: "easy_run",
  interval: "easy_run",
  long_run: "easy_run", // shortened easy run; UI can show the "shortened" note
  easy_run: null,
  recovery: null,
  drill: null,
  strides: "easy_run",
  swim: null,
  bike: null,
  cross_training: null,
  strength: null, // handled separately below
  rest: null,
};

/**
 * Returns whether the planned day is heavy enough to be worth offering a
 * swap modal — a heavy run OR a strength session OR a plyometric-heavy
 * strength block (we don't classify plyo at session level today, so strength
 * is treated as heavy until F10 carries that detail through).
 */
export function isHeavyDay(sessions: PlannedSessionEntry[]): boolean {
  return sessions.some(
    (s) => HEAVY_RUN_TYPES.has(s.type) || HEAVY_NON_RUN_TYPES.has(s.type),
  );
}

/**
 * Build the recommended swap plan for tomorrow's sessions when the athlete
 * reports "tired".
 *
 *   - tempo / interval → easy_run
 *   - long_run → easy_run (shortened — caller may want to surface this)
 *   - strides → easy_run
 *   - strength → kept but emphasis flipped (UI handles); for the run plan
 *     here we don't change strength entries (T09's StrengthSessionDetail
 *     swaps lower→upper at render time)
 *   - other types: unchanged
 *
 * When the athlete is "sharp" or "okay", returns an empty swap plan.
 */
export function planSwap(
  feeling: Feeling,
  sessions: PlannedSessionEntry[],
): SwapPlan {
  const heavy = isHeavyDay(sessions);

  if (feeling !== "tired" || !heavy) {
    return {
      isHeavyDay: heavy,
      swaps: [],
      swappedSessions: sessions,
      summary: heavy
        ? "Keep the plan — you've got a heavy day tomorrow."
        : "Keep the plan — light day already.",
    };
  }

  const swaps: SessionSwap[] = [];
  const swappedSessions: PlannedSessionEntry[] = sessions.map((s) => {
    const target = RUN_SWAP_TARGET[s.type];
    if (target && target !== s.type) {
      swaps.push({
        fromType: s.type,
        toType: target,
        reason:
          s.type === "long_run"
            ? "Shortened easy run instead of a full long run."
            : `${humanise(s.type)} → easy run.`,
      });
      return { ...s, type: target };
    }
    return s;
  });

  const summary =
    swaps.length > 0
      ? `Swap ${swaps.map((sw) => humanise(sw.fromType)).join(", ")} → easy. Strength stays on; the detail view will offer an upper-body swap.`
      : "Keep the plan — nothing obvious to swap.";

  return { isHeavyDay: heavy, swaps, swappedSessions, summary };
}

/**
 * Detect 3+ consecutive "tired" check-ins → recommend a rest day.
 * Input is a chronologically-ordered array of check-ins (oldest first).
 */
export function shouldRecommendRestDay(
  checkIns: ReadonlyArray<{ check_in_date: string; feeling: Feeling }>,
): boolean {
  if (checkIns.length < 3) return false;
  const last3 = checkIns.slice(-3);
  return last3.every((c) => c.feeling === "tired");
}

function humanise(type: SessionType): string {
  switch (type) {
    case "easy_run":
      return "easy run";
    case "long_run":
      return "long run";
    case "tempo":
      return "tempo";
    case "interval":
      return "intervals";
    case "drill":
      return "drills";
    case "strides":
      return "strides";
    case "recovery":
      return "recovery";
    case "swim":
      return "swim";
    case "bike":
      return "bike";
    case "cross_training":
      return "cross-training";
    case "strength":
      return "strength";
    case "rest":
      return "rest";
  }
}
