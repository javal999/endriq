/**
 * predictedFinish tests — covers every sufficiency gate + the
 * confidence pathway + Riegel/Daniels cross-check.
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.7 F14.B (AC1-AC4).
 */

import { describe, expect, it } from "vitest";
import { predictedFinish, formatFinishTime } from "./predictedFinish";
import type { AthleteHistorySlice, WorkoutForAnalysis } from "./types";
import type { PrimaryRaceLike } from "./periodization";

const TODAY = new Date("2026-05-17T00:00:00Z");

function makeRunWorkouts(weeks: number, sessionsPerWeek: number): WorkoutForAnalysis[] {
  const out: WorkoutForAnalysis[] = [];
  for (let w = 0; w < weeks; w++) {
    for (let s = 0; s < sessionsPerWeek; s++) {
      const t = TODAY.getTime() - (w * 7 + s) * 24 * 60 * 60 * 1000;
      out.push({
        id: `w-${w}-${s}`,
        source: "strava",
        sport_type: "run",
        session_label: "easy_run",
        started_at: new Date(t).toISOString(),
        duration_seconds: 3000,
        distance_meters: 8000,
        avg_hr: 145,
        max_hr: 160,
        avg_cadence: 175,
        training_stress: 40,
      });
    }
  }
  return out;
}

function slice(
  recentWorkouts: WorkoutForAnalysis[],
  pr?: AthleteHistorySlice["recentRacePr"],
): AthleteHistorySlice {
  return {
    athleteId: "test",
    observedMaxHr: 195,
    hrRest: 50,
    sex: "male",
    recentRacePr: pr,
    recentWorkouts,
    recentWeeklyAnalyses: [],
  };
}

const PR_10K_RECENT: AthleteHistorySlice["recentRacePr"] = {
  distanceKm: 10,
  timeSec: 44 * 60 + 1,
  raceDate: "2026-04-15",
};

const FUTURE_MARATHON_30D: PrimaryRaceLike & { race_type: string } = {
  race_date: "2026-06-16", // ~30 days out
  race_type: "marathon",
};

// ── Eligibility gates ────────────────────────────────────────────────────────

describe("predictedFinish — eligibility gates", () => {
  it("rejects general_fitness goal (AC1)", () => {
    const r = predictedFinish(
      { race_date: "2026-06-16", race_type: "general_fitness" },
      slice(makeRunWorkouts(10, 3), PR_10K_RECENT),
      { today: TODAY },
    );
    expect(r.eligible).toBe(false);
    if (!r.eligible) expect(r.reason).toBe("general_fitness_goal");
  });

  it("rejects ultramarathon (non-standard distance)", () => {
    const r = predictedFinish(
      { race_date: "2026-06-16", race_type: "ultramarathon" },
      slice(makeRunWorkouts(10, 3), PR_10K_RECENT),
      { today: TODAY },
    );
    expect(r.eligible).toBe(false);
    if (!r.eligible) expect(r.reason).toBe("non_standard_distance");
  });

  it("rejects missing race_type", () => {
    const r = predictedFinish(
      { race_date: "2026-06-16", race_type: null },
      slice(makeRunWorkouts(10, 3), PR_10K_RECENT),
      { today: TODAY },
    );
    expect(r.eligible).toBe(false);
    if (!r.eligible) expect(r.reason).toBe("missing_race_type");
  });

  it("rejects when race is in the past", () => {
    const r = predictedFinish(
      { race_date: "2026-04-15", race_type: "marathon" },
      slice(makeRunWorkouts(10, 3), PR_10K_RECENT),
      { today: TODAY },
    );
    expect(r.eligible).toBe(false);
    if (!r.eligible) expect(r.reason).toBe("race_too_close");
  });

  it("rejects when there is no recent PR", () => {
    const r = predictedFinish(
      FUTURE_MARATHON_30D,
      slice(makeRunWorkouts(10, 3), undefined),
      { today: TODAY },
    );
    expect(r.eligible).toBe(false);
    if (!r.eligible) expect(r.reason).toBe("no_recent_pr");
  });

  it("rejects when PR is older than 12 months", () => {
    const oldPr = { ...PR_10K_RECENT, raceDate: "2024-01-01" };
    const r = predictedFinish(
      FUTURE_MARATHON_30D,
      slice(makeRunWorkouts(10, 3), oldPr),
      { today: TODAY },
    );
    expect(r.eligible).toBe(false);
    if (!r.eligible) expect(r.reason).toBe("pr_too_old");
  });

  it("rejects when consistent training is < 4 weeks (AC3 — silent)", () => {
    const r = predictedFinish(
      FUTURE_MARATHON_30D,
      slice(makeRunWorkouts(2, 3), PR_10K_RECENT),
      { today: TODAY },
    );
    expect(r.eligible).toBe(false);
    if (!r.eligible) expect(r.reason).toBe("insufficient_history");
  });
});

// ── Successful predictions ───────────────────────────────────────────────────

describe("predictedFinish — eligible predictions", () => {
  it("marathon + 10K PB + ≥8 weeks history → high confidence (AC2)", () => {
    const r = predictedFinish(
      FUTURE_MARATHON_30D,
      slice(makeRunWorkouts(10, 4), PR_10K_RECENT),
      { today: TODAY },
    );
    if (!r.eligible) throw new Error(`expected eligible, got ${r.reason}`);
    expect(r.confidence).toBe("high");
    expect(r.lowSec).toBeGreaterThan(0);
    expect(r.highSec).toBeGreaterThan(r.lowSec);
    expect(r.centerSec).toBeGreaterThanOrEqual(r.lowSec);
    expect(r.centerSec).toBeLessThanOrEqual(r.highSec);
    expect(r.inputs.targetDistance).toBe("marathon");
    expect(r.inputs.weeksOfConsistentTraining).toBeGreaterThanOrEqual(8);
  });

  it("marathon + 10K PB + 4-7 weeks history → moderate confidence", () => {
    const r = predictedFinish(
      FUTURE_MARATHON_30D,
      slice(makeRunWorkouts(6, 3), PR_10K_RECENT),
      { today: TODAY },
    );
    if (!r.eligible) throw new Error(`expected eligible, got ${r.reason}`);
    expect(r.confidence).toBe("moderate");
  });

  it("freezes the prediction within 7 days of race", () => {
    const r = predictedFinish(
      { race_date: "2026-05-22", race_type: "marathon" }, // 5 days out
      slice(makeRunWorkouts(10, 4), PR_10K_RECENT),
      { today: TODAY },
    );
    if (!r.eligible) throw new Error(`expected eligible, got ${r.reason}`);
    expect(r.frozen).toBe(true);
  });

  it("does not freeze the prediction at 14 days out", () => {
    const r = predictedFinish(
      { race_date: "2026-05-31", race_type: "marathon" },
      slice(makeRunWorkouts(10, 4), PR_10K_RECENT),
      { today: TODAY },
    );
    if (!r.eligible) throw new Error(`expected eligible, got ${r.reason}`);
    expect(r.frozen).toBe(false);
  });

  it("computes a sensible marathon time from a 44:01 10K PB (~3h17m via VDOT 46)", () => {
    const r = predictedFinish(
      FUTURE_MARATHON_30D,
      slice(makeRunWorkouts(10, 4), PR_10K_RECENT),
      { today: TODAY },
    );
    if (!r.eligible) throw new Error("expected eligible");
    // Marathon for a 44:01 10K runner sits roughly 3:05 - 3:25 depending on method.
    expect(r.centerSec).toBeGreaterThan(3 * 3600);
    expect(r.centerSec).toBeLessThan(3.5 * 3600);
  });

  it("predicts a half from a 5K PB", () => {
    const fiveKpr: AthleteHistorySlice["recentRacePr"] = {
      distanceKm: 5,
      timeSec: 20 * 60,
      raceDate: "2026-04-15",
    };
    const r = predictedFinish(
      { race_date: "2026-06-16", race_type: "half_marathon" },
      slice(makeRunWorkouts(10, 4), fiveKpr),
      { today: TODAY },
    );
    if (!r.eligible) throw new Error(`expected eligible, got ${r.reason}`);
    expect(r.inputs.targetDistance).toBe("half_marathon");
  });
});

// ── Helpers ──────────────────────────────────────────────────────────────────

describe("formatFinishTime", () => {
  it("formats sub-hour times as M:SS", () => {
    expect(formatFinishTime(5 * 60 + 23)).toBe("5:23");
  });

  it("formats hour+ times as H:MM:SS", () => {
    expect(formatFinishTime(3 * 3600 + 17 * 60 + 5)).toBe("3:17:05");
  });

  it("rounds fractional seconds", () => {
    expect(formatFinishTime(60.7)).toBe("1:01");
  });
});
