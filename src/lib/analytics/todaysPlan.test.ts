/**
 * computeTodaysPlan tests — covers all four recommendation branches per
 * Phase 2.1 §T02 AC1.
 */

import { describe, expect, it } from "vitest";
import { computeTodaysPlan } from "./todaysPlan";
import type { PlannedSessionEntry } from "@/lib/plan/types";

function planned(...types: PlannedSessionEntry["type"][]) {
  return { sessions: types.map((type) => ({ type })) };
}

describe("computeTodaysPlan — recommendation paths", () => {
  it("no_session when sessions empty AND no pattern", () => {
    const r = computeTodaysPlan({
      latestRecoveryCheckIn: null,
      loadRatio: 1.0,
      plannedSession: null,
      phase: "general_prep",
      hasTypicalWeekPattern: false,
    });
    expect(r.recommendation).toBe("no_session");
    expect(r.isOverride).toBe(false);
  });

  it("no_session (rest day) when sessions=[rest] but pattern exists", () => {
    const r = computeTodaysPlan({
      latestRecoveryCheckIn: "sharp",
      loadRatio: 1.0,
      plannedSession: planned("rest"),
      phase: "general_prep",
      hasTypicalWeekPattern: true,
    });
    expect(r.recommendation).toBe("no_session");
    expect(r.summarySentence).toMatch(/rest/i);
  });

  it("consider_rest when tired + heavy + load > 1.3", () => {
    const r = computeTodaysPlan({
      latestRecoveryCheckIn: "tired",
      loadRatio: 1.45,
      plannedSession: planned("interval"),
      phase: "specific_prep",
      hasTypicalWeekPattern: true,
    });
    expect(r.recommendation).toBe("consider_rest");
    expect(r.isOverride).toBe(true);
  });

  it("ease_back when tired + heavy + load normal", () => {
    const r = computeTodaysPlan({
      latestRecoveryCheckIn: "tired",
      loadRatio: 1.1,
      plannedSession: planned("tempo"),
      phase: "specific_prep",
      hasTypicalWeekPattern: true,
    });
    expect(r.recommendation).toBe("ease_back");
    expect(r.isOverride).toBe(true);
  });

  it("ease_back when last two same-type sessions felt harder than expected", () => {
    const r = computeTodaysPlan({
      latestRecoveryCheckIn: "okay",
      loadRatio: 1.0,
      plannedSession: planned("interval"),
      phase: "specific_prep",
      hasTypicalWeekPattern: true,
      recentSurveyFeels: ["harder_than_expected", "harder_than_expected", "right"],
    });
    expect(r.recommendation).toBe("ease_back");
  });

  it("train_as_planned when sharp + heavy + load normal", () => {
    const r = computeTodaysPlan({
      latestRecoveryCheckIn: "sharp",
      loadRatio: 1.05,
      plannedSession: planned("interval"),
      phase: "specific_prep",
      hasTypicalWeekPattern: true,
    });
    expect(r.recommendation).toBe("train_as_planned");
    expect(r.isOverride).toBe(false);
  });

  it("train_as_planned on an easy day regardless of recovery", () => {
    const r = computeTodaysPlan({
      latestRecoveryCheckIn: "okay",
      loadRatio: 0.95,
      plannedSession: planned("easy_run"),
      phase: "general_prep",
      hasTypicalWeekPattern: true,
    });
    expect(r.recommendation).toBe("train_as_planned");
  });

  it("contributors always surface 3 rows in order: recovery, load, planned", () => {
    const r = computeTodaysPlan({
      latestRecoveryCheckIn: "sharp",
      loadRatio: 1.0,
      plannedSession: planned("easy_run"),
      phase: "general_prep",
      hasTypicalWeekPattern: true,
    });
    expect(r.contributors.map((c) => c.label)).toEqual(["Recovery", "Load ratio", "Planned"]);
  });
});
