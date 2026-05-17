/**
 * recoveryOverride tests — swap rules + consecutive-tired detection.
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.5 F12.
 */

import { describe, expect, it } from "vitest";
import {
  isHeavyDay,
  planSwap,
  shouldRecommendRestDay,
} from "./recoveryOverride";
import type { PlannedSessionEntry, SessionType } from "@/lib/plan/types";

function s(...types: SessionType[]): PlannedSessionEntry[] {
  return types.map((type) => ({ type }));
}

describe("isHeavyDay", () => {
  it.each([
    ["tempo", true],
    ["interval", true],
    ["long_run", true],
    ["strength", true],
    ["easy_run", false],
    ["recovery", false],
    ["rest", false],
    ["drill", false],
  ] as const)("%s → %s", (type, expected) => {
    expect(isHeavyDay(s(type))).toBe(expected);
  });

  it("any heavy type in a multi-session day flags heavy", () => {
    expect(isHeavyDay(s("easy_run", "strength"))).toBe(true);
  });
});

describe("planSwap — sharp/okay paths", () => {
  it("sharp + heavy → no swaps, keep-the-plan summary", () => {
    const r = planSwap("sharp", s("tempo"));
    expect(r.swaps).toEqual([]);
    expect(r.summary).toMatch(/keep/i);
  });

  it("okay + heavy → no swaps", () => {
    const r = planSwap("okay", s("interval"));
    expect(r.swaps).toEqual([]);
  });

  it("tired + light day → no swaps, light-day summary", () => {
    const r = planSwap("tired", s("easy_run", "rest"));
    expect(r.isHeavyDay).toBe(false);
    expect(r.swaps).toEqual([]);
    expect(r.summary).toMatch(/light/i);
  });
});

describe("planSwap — tired + heavy paths", () => {
  it("tired + tempo → tempo swapped to easy_run", () => {
    const r = planSwap("tired", s("tempo"));
    expect(r.swaps).toEqual([
      { fromType: "tempo", toType: "easy_run", reason: "tempo → easy run." },
    ]);
    expect(r.swappedSessions[0].type).toBe("easy_run");
  });

  it("tired + interval → interval swapped to easy_run", () => {
    const r = planSwap("tired", s("interval"));
    expect(r.swappedSessions[0].type).toBe("easy_run");
  });

  it("tired + long_run → easy_run with 'shortened' reason", () => {
    const r = planSwap("tired", s("long_run"));
    expect(r.swappedSessions[0].type).toBe("easy_run");
    expect(r.swaps[0].reason).toMatch(/shortened/i);
  });

  it("tired + strides alone → no swap (strides aren't a heavy-day trigger)", () => {
    const r = planSwap("tired", s("strides"));
    expect(r.isHeavyDay).toBe(false);
    expect(r.swaps).toEqual([]);
  });

  it("tired + (tempo + strides) → both runs swap to easy", () => {
    const r = planSwap("tired", s("tempo", "strides"));
    expect(r.swappedSessions.map((x) => x.type)).toEqual(["easy_run", "easy_run"]);
  });

  it("tired + strength stays as strength (UI flips lower→upper at render)", () => {
    const r = planSwap("tired", s("strength"));
    expect(r.swappedSessions[0].type).toBe("strength");
    expect(r.swaps).toEqual([]);
  });

  it("multi-session: interval + strength → swap interval, keep strength", () => {
    const r = planSwap("tired", s("interval", "strength"));
    expect(r.swappedSessions.map((x) => x.type)).toEqual(["easy_run", "strength"]);
    expect(r.swaps).toHaveLength(1);
  });
});

describe("shouldRecommendRestDay", () => {
  it("returns false for fewer than 3 check-ins", () => {
    expect(
      shouldRecommendRestDay([
        { check_in_date: "2026-05-15", feeling: "tired" },
        { check_in_date: "2026-05-16", feeling: "tired" },
      ]),
    ).toBe(false);
  });

  it("returns true for 3 consecutive 'tired'", () => {
    expect(
      shouldRecommendRestDay([
        { check_in_date: "2026-05-14", feeling: "tired" },
        { check_in_date: "2026-05-15", feeling: "tired" },
        { check_in_date: "2026-05-16", feeling: "tired" },
      ]),
    ).toBe(true);
  });

  it("returns false when the trailing 3 aren't all tired", () => {
    expect(
      shouldRecommendRestDay([
        { check_in_date: "2026-05-14", feeling: "tired" },
        { check_in_date: "2026-05-15", feeling: "okay" },
        { check_in_date: "2026-05-16", feeling: "tired" },
      ]),
    ).toBe(false);
  });

  it("considers only the trailing 3 — earlier okay days don't reset the count", () => {
    expect(
      shouldRecommendRestDay([
        { check_in_date: "2026-05-12", feeling: "sharp" },
        { check_in_date: "2026-05-13", feeling: "okay" },
        { check_in_date: "2026-05-14", feeling: "tired" },
        { check_in_date: "2026-05-15", feeling: "tired" },
        { check_in_date: "2026-05-16", feeling: "tired" },
      ]),
    ).toBe(true);
  });
});
