/**
 * Property-based tests (fast-check) for core analytics pure functions.
 *
 * Written against the spec, not the implementation.
 * Complements the example-based tests in the individual test files.
 * Run as part of: npm test
 *
 * Targets the surviving mutants in:
 *   - intensityV2.ts (62.81% → target 70%)
 *   - rulesEngine.ts (66.13% → target 70%)
 *   - strength-generator.ts (40.63% → target 50%)
 *   - trainingLoad.ts (82.50% → improve boundary coverage)
 */
// @ts-nocheck


import { describe, expect, it } from "vitest";
import * as fc from "fast-check";

import { computeIntensityV2 } from "./intensityV2";
import { buildStrengthMenu } from "./strength-generator";
import { computeLoadMetrics } from "./trainingLoad";
import type { RunningPatternId } from "./runningPatterns";

// ── intensityV2 properties ───────────────────────────────────────────────────

describe("computeIntensityV2 properties", () => {
  const sexArb = fc.constantFrom<"male" | "female" | "other" | null>(
    "male", "female", "other", null,
  );
  const sessionArb = fc.record({
    duration_seconds: fc.integer({ min: 60, max: 7200 }),
    avg_hr: fc.integer({ min: 80, max: 210 }),
  });

  it("time percentages always sum to 100 for any non-empty session list", () => {
    fc.assert(
      fc.property(
        fc.array(sessionArb, { minLength: 1, maxLength: 10 }),
        fc.integer({ min: 150, max: 220 }),
        fc.option(fc.integer({ min: 30, max: 90 }), { nil: null }),
        sexArb,
        (sessions, maxHr, hrRest, sex) => {
          const r = computeIntensityV2(sessions, maxHr, hrRest, sex);
          expect(r.pctEasyTime + r.pctModerateTime + r.pctHardTime).toBe(100);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("load percentages always sum to 100 for any non-empty session list", () => {
    fc.assert(
      fc.property(
        fc.array(sessionArb, { minLength: 1, maxLength: 10 }),
        fc.integer({ min: 150, max: 220 }),
        fc.option(fc.integer({ min: 30, max: 90 }), { nil: null }),
        sexArb,
        (sessions, maxHr, hrRest, sex) => {
          const r = computeIntensityV2(sessions, maxHr, hrRest, sex);
          expect(r.pctEasyLoad + r.pctModerateLoad + r.pctHardLoad).toBe(100);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("all percentages are in [0, 100]", () => {
    fc.assert(
      fc.property(
        fc.array(sessionArb, { minLength: 0, maxLength: 8 }),
        fc.integer({ min: 150, max: 220 }),
        fc.option(fc.integer({ min: 30, max: 90 }), { nil: null }),
        sexArb,
        (sessions, maxHr, hrRest, sex) => {
          const r = computeIntensityV2(sessions, maxHr, hrRest, sex);
          for (const p of [
            r.pctEasyTime, r.pctModerateTime, r.pctHardTime,
            r.pctEasyLoad, r.pctModerateLoad, r.pctHardLoad,
          ]) {
            expect(p).toBeGreaterThanOrEqual(0);
            expect(p).toBeLessThanOrEqual(100);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("totalTrimp is always non-negative", () => {
    fc.assert(
      fc.property(
        fc.array(sessionArb, { minLength: 0, maxLength: 8 }),
        fc.integer({ min: 150, max: 220 }),
        fc.option(fc.integer({ min: 30, max: 90 }), { nil: null }),
        sexArb,
        (sessions, maxHr, hrRest, sex) => {
          const r = computeIntensityV2(sessions, maxHr, hrRest, sex);
          expect(r.totalTrimp).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("karvonen_approx model always used when hrRest is null", () => {
    fc.assert(
      fc.property(
        fc.array(sessionArb, { minLength: 1, maxLength: 5 }),
        fc.integer({ min: 150, max: 220 }),
        sexArb,
        (sessions, maxHr, sex) => {
          const r = computeIntensityV2(sessions, maxHr, null, sex);
          expect(r.modelUsed).toBe("karvonen_approx");
        },
      ),
      { numRuns: 50 },
    );
  });

  it("banister_karvonen model always used when hrRest is provided", () => {
    fc.assert(
      fc.property(
        fc.array(sessionArb, { minLength: 1, maxLength: 5 }),
        fc.integer({ min: 150, max: 220 }),
        fc.integer({ min: 30, max: 90 }),
        sexArb,
        (sessions, maxHr, hrRest, sex) => {
          const r = computeIntensityV2(sessions, maxHr, hrRest, sex);
          expect(r.modelUsed).toBe("banister_karvonen");
        },
      ),
      { numRuns: 50 },
    );
  });

  it("high-HR sessions push harder zone percentages up vs low-HR sessions", () => {
    // Invariant: sessions above the hard threshold must produce more hard-load share
    // than sessions clearly below the easy threshold.
    // Uses r=0.95 for hard (well above 0.84) and r=0.60 for easy (well below 0.74).
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 180, max: 220 }),
        fc.integer({ min: 30, max: 50 }),
        (n, maxHr, hrRest) => {
          // r = (avgHr - hrRest) / (maxHr - hrRest)
          // Hard: r = 0.95 → avgHr = hrRest + 0.95*(maxHr-hrRest)
          // Easy: r = 0.60 → avgHr = hrRest + 0.60*(maxHr-hrRest)
          const reserve = maxHr - hrRest;
          const hardHr = Math.round(hrRest + 0.95 * reserve); // r=0.95 → Zone 4-5
          const easyHr = Math.round(hrRest + 0.60 * reserve); // r=0.60 → Zone 1-2
          const dur = 3600;
          const hardSessions = Array.from({ length: n }, () => ({
            duration_seconds: dur, avg_hr: hardHr,
          }));
          const easySessions = Array.from({ length: n }, () => ({
            duration_seconds: dur, avg_hr: easyHr,
          }));
          const hard = computeIntensityV2(hardSessions, maxHr, hrRest, "male");
          const easy = computeIntensityV2(easySessions, maxHr, hrRest, "male");
          expect(hard.pctHardLoad).toBeGreaterThan(easy.pctHardLoad);
          expect(easy.pctEasyLoad).toBeGreaterThan(hard.pctEasyLoad);
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ── buildStrengthMenu properties ─────────────────────────────────────────────

describe("buildStrengthMenu properties", () => {
  const patternArb = fc.constantFrom<RunningPatternId>(
    "interference_safe",
    "taper_or_high_load",
    "low_cadence_intervals",
    "long_run_drift",
    "low_easy_load_share",
    "default",
  );

  const baseInput = {
    runsWeek: [],
    loadStatusWord: "Normal",
    loadRatio: 1.0,
    raceDateIso: null,
    referenceMs: Date.parse("2026-05-12T23:59:59Z"),
  };

  it("every pattern produces at least 4 exercises per day", () => {
    fc.assert(
      fc.property(patternArb, (pattern) => {
        const menu = buildStrengthMenu({ primaryPattern: pattern, ...baseInput });
        for (const day of menu.days) {
          expect(day.exercises.length).toBeGreaterThanOrEqual(4);
        }
      }),
      { numRuns: 6 },
    );
  });

  it("no day ever exceeds 6 exercises for any pattern", () => {
    fc.assert(
      fc.property(patternArb, (pattern) => {
        const menu = buildStrengthMenu({ primaryPattern: pattern, ...baseInput });
        for (const day of menu.days) {
          expect(day.exercises.length).toBeLessThanOrEqual(6);
        }
      }),
      { numRuns: 6 },
    );
  });

  it("no day ever exceeds 50 min duration for any pattern", () => {
    fc.assert(
      fc.property(patternArb, (pattern) => {
        const menu = buildStrengthMenu({ primaryPattern: pattern, ...baseInput });
        for (const day of menu.days) {
          expect(day.duration_min).toBeLessThanOrEqual(50);
        }
      }),
      { numRuns: 6 },
    );
  });

  it("days count is 1 or 2 for all patterns", () => {
    fc.assert(
      fc.property(patternArb, (pattern) => {
        const menu = buildStrengthMenu({ primaryPattern: pattern, ...baseInput });
        expect(menu.days.length).toBeGreaterThanOrEqual(1);
        expect(menu.days.length).toBeLessThanOrEqual(2);
      }),
      { numRuns: 6 },
    );
  });

  it("rationale is non-empty for any load ratio", () => {
    fc.assert(
      fc.property(
        patternArb,
        fc.option(fc.float({ min: Math.fround(0.3), max: Math.fround(2.5) }), { nil: null }),
        (pattern, loadRatio) => {
          const menu = buildStrengthMenu({
            primaryPattern: pattern,
            ...baseInput,
            loadRatio,
          });
          expect(menu.rationale.length).toBeGreaterThan(20);
        },
      ),
      { numRuns: 30 },
    );
  });

  it("pattern field always matches the requested primary pattern", () => {
    fc.assert(
      fc.property(patternArb, (pattern) => {
        const menu = buildStrengthMenu({ primaryPattern: pattern, ...baseInput });
        expect(menu.pattern).toBe(pattern);
      }),
      { numRuns: 6 },
    );
  });
});

// ── computeLoadMetrics properties ────────────────────────────────────────────

describe("computeLoadMetrics properties", () => {
  const workoutArb = fc.record({
    sport_type: fc.constantFrom("run", "strength", "bike"),
    session_label: fc.constantFrom("easy", "interval", "tempo", "long_run", null),
    started_at: fc.integer({ min: 1735689600000, max: 1767225600000 })
      .map((ms) => new Date(ms).toISOString()),
    duration_seconds: fc.integer({ min: 600, max: 7200 }),
    distance_meters: fc.option(fc.integer({ min: 1000, max: 42000 }), { nil: null }),
    avg_hr: fc.option(fc.integer({ min: 100, max: 200 }), { nil: null }),
    max_hr: fc.option(fc.integer({ min: 150, max: 220 }), { nil: null }),
    avg_cadence: fc.option(fc.integer({ min: 140, max: 200 }), { nil: null }),
    training_stress: fc.option(fc.float({ min: 10, max: 200 }), { nil: null }),
  });

  it("acuteLoad is always non-negative", () => {
    fc.assert(
      fc.property(
        fc.array(workoutArb, { minLength: 0, maxLength: 20 }),
        fc.integer({ min: 1737072000000, max: 1767225600000 }), // Jan 2026 – Dec 2026
        (workouts, refMs) => {
          const result = computeLoadMetrics(workouts, refMs);
          if (result.acuteLoad !== null) {
            expect(result.acuteLoad).toBeGreaterThanOrEqual(0);
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  it("loadRatio is null when chronicLoad is 0 or null", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1748736000000, max: 1751327999000 }), // June 2026
        (refMs) => {
          // Empty workouts → chronic = 0 → loadRatio must be null
          const result = computeLoadMetrics([], refMs);
          expect(result.loadRatio).toBeNull();
        },
      ),
      { numRuns: 20 },
    );
  });

  it("statusWord is one of the four valid values", () => {
    fc.assert(
      fc.property(
        fc.array(workoutArb, { minLength: 0, maxLength: 30 }),
        fc.integer({ min: 1741132800000, max: 1767225600000 }),
        (workouts, refMs) => {
          const result = computeLoadMetrics(workouts, refMs);
          expect(["Normal", "Elevated", "Spike", "Low", "—"]).toContain(result.statusWord);
        },
      ),
      { numRuns: 50 },
    );
  });

  it("tone is one of the three valid BadgeTone values", () => {
    fc.assert(
      fc.property(
        fc.array(workoutArb, { minLength: 0, maxLength: 30 }),
        fc.integer({ min: 1741132800000, max: 1767225600000 }),
        (workouts, refMs) => {
          const result = computeLoadMetrics(workouts, refMs);
          expect(["good", "warn", "bad"]).toContain(result.tone);
        },
      ),
      { numRuns: 50 },
    );
  });
});
