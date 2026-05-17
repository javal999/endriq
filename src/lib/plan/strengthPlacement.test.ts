/**
 * strengthPlacement tests — covers the 48h buffer, volume cap, and
 * all-rest detection rules.
 */

import { describe, expect, it } from "vitest";
import { checkStrengthPlacement } from "./strengthPlacement";
import type { TypicalWeekPattern, WeekdayIndex, PlannedSessionEntry, SessionType } from "./types";

function day(
  weekday: WeekdayIndex,
  ...types: SessionType[]
): { weekday: WeekdayIndex; sessions: PlannedSessionEntry[] } {
  return { weekday, sessions: types.map((type) => ({ type })) };
}

describe("checkStrengthPlacement — 48h buffer", () => {
  it("warns when strength on Wed precedes tempo on Thu", () => {
    const pattern: TypicalWeekPattern = [
      day(2, "easy_run", "strength"),
      day(3, "tempo"),
    ];
    const r = checkStrengthPlacement(pattern);
    const a = r.advisories.find((x) => x.kind === "strength_48h_buffer");
    expect(a).toBeDefined();
    expect(a?.weekday).toBe(2);
  });

  it("suggests moving strength to the prior day when it's light", () => {
    const pattern: TypicalWeekPattern = [
      day(1, "easy_run"),
      day(2, "strength"),
      day(3, "tempo"),
    ];
    const r = checkStrengthPlacement(pattern);
    const a = r.advisories.find((x) => x.kind === "strength_48h_buffer");
    expect(a?.suggestedMove).toEqual({ from: 2, to: 1 });
  });

  it("does not warn when strength is followed by easy/rest", () => {
    const pattern: TypicalWeekPattern = [
      day(2, "strength"),
      day(3, "easy_run"),
    ];
    const r = checkStrengthPlacement(pattern);
    expect(r.advisories.find((x) => x.kind === "strength_48h_buffer")).toBeUndefined();
  });
});

describe("checkStrengthPlacement — volume cap", () => {
  it("warns when 3 strength sessions are scheduled (default cap = 2)", () => {
    const pattern: TypicalWeekPattern = [
      day(0, "strength"),
      day(2, "strength"),
      day(4, "strength"),
    ];
    const r = checkStrengthPlacement(pattern);
    expect(r.strengthDayCount).toBe(3);
    expect(r.advisories.find((x) => x.kind === "strength_volume_cap")).toBeDefined();
  });

  it("respects custom maxStrengthPerWeek", () => {
    const pattern: TypicalWeekPattern = [
      day(0, "strength"),
      day(2, "strength"),
    ];
    const r = checkStrengthPlacement(pattern, { maxStrengthPerWeek: 1 });
    expect(r.advisories.find((x) => x.kind === "strength_volume_cap")).toBeDefined();
  });

  it("does not warn at exactly the cap", () => {
    const pattern: TypicalWeekPattern = [
      day(0, "strength"),
      day(3, "strength"),
    ];
    const r = checkStrengthPlacement(pattern);
    expect(r.advisories.find((x) => x.kind === "strength_volume_cap")).toBeUndefined();
  });
});

describe("checkStrengthPlacement — all-rest detection", () => {
  it("surfaces all_rest_week for empty pattern", () => {
    const r = checkStrengthPlacement([]);
    expect(r.advisories.find((x) => x.kind === "all_rest_week")).toBeDefined();
  });

  it("surfaces all_rest_week when every day is rest", () => {
    const pattern: TypicalWeekPattern = Array.from({ length: 7 }, (_, w) =>
      day(w as WeekdayIndex, "rest"),
    );
    const r = checkStrengthPlacement(pattern);
    expect(r.advisories.find((x) => x.kind === "all_rest_week")).toBeDefined();
    expect(r.trainingDayCount).toBe(0);
  });

  it("does not fire when at least one training day exists", () => {
    const pattern: TypicalWeekPattern = [day(0, "easy_run")];
    const r = checkStrengthPlacement(pattern);
    expect(r.advisories.find((x) => x.kind === "all_rest_week")).toBeUndefined();
  });
});

describe("checkStrengthPlacement — counters", () => {
  it("counts training and strength days correctly", () => {
    const pattern: TypicalWeekPattern = [
      day(0, "easy_run"),
      day(1, "strength"),
      day(2, "tempo"),
      day(3, "rest"),
      day(4, "easy_run", "strength"),
      day(5, "long_run"),
      day(6, "rest"),
    ];
    const r = checkStrengthPlacement(pattern);
    expect(r.strengthDayCount).toBe(2);
    expect(r.trainingDayCount).toBe(5);
  });
});
