import { describe, expect, it } from "vitest";
import { detectRunningPatterns } from "./runningPatterns";
import type { WorkoutForPatterns } from "./runningPatterns";

const BASE_REF_MS = new Date("2026-05-12T00:00:00Z").getTime(); // arbitrary Monday

const EMPTY_LOAD = { loadRatio: null };
const NORMAL_LOAD = { loadRatio: 1.1 };
const HIGH_LOAD = { loadRatio: 1.4 };
const NO_FINDINGS: [] = [];

function makeIntervalWithCadence(cadence: number): WorkoutForPatterns {
  return {
    sport_type: "run",
    session_label: "interval",
    started_at: "2026-05-10T08:00:00Z",
    avg_cadence: cadence,
    avg_hr: 170,
  };
}

function makeEasyRun(): WorkoutForPatterns {
  return {
    sport_type: "run",
    session_label: "easy",
    started_at: "2026-05-09T07:00:00Z",
    avg_cadence: 172,
    avg_hr: 140,
  };
}

const HIGH_INTERFERENCE_FINDING = {
  severity: "High" as const,
  tone: "bad" as const,
  title: "Strength close to a quality run",
  body: "Strength ended ~1.5 hours before an interval session.",
  citations: [],
  confidence: "Confidence: High",
  evidenceStrength: "Strong",
};

describe("detectRunningPatterns — priority ordering", () => {
  it("interference_safe takes priority over everything else", () => {
    const result = detectRunningPatterns({
      weekWorkouts: [makeIntervalWithCadence(160)], // also low cadence
      load: HIGH_LOAD,                               // also high load
      intensityV2: { pctEasyLoad: 50, pctModerateLoad: 30, pctHardLoad: 20,
        pctEasyTime: 55, pctModerateTime: 30, pctHardTime: 15,
        totalRunningSeconds: 10000, totalTrimp: 200,
        modelUsed: "banister_karvonen", warnings: [] },
      raceDateIso: null,
      referenceMs: BASE_REF_MS,
      findings: [HIGH_INTERFERENCE_FINDING],
    });
    expect(result.primary).toBe("interference_safe");
    expect(result.all).toContain("taper_or_high_load");
    expect(result.all).toContain("low_cadence_intervals");
    expect(result.all).toContain("low_easy_load_share");
  });

  it("taper_or_high_load takes second priority when no interference", () => {
    const result = detectRunningPatterns({
      weekWorkouts: [makeIntervalWithCadence(160)],
      load: HIGH_LOAD,
      intensityV2: null,
      raceDateIso: null,
      referenceMs: BASE_REF_MS,
      findings: NO_FINDINGS,
    });
    expect(result.primary).toBe("taper_or_high_load");
  });

  it("always includes default as last item", () => {
    const result = detectRunningPatterns({
      weekWorkouts: [makeEasyRun()],
      load: NORMAL_LOAD,
      intensityV2: null,
      raceDateIso: null,
      referenceMs: BASE_REF_MS,
      findings: NO_FINDINGS,
    });
    expect(result.all[result.all.length - 1]).toBe("default");
    expect(result.primary).toBe("default");
  });
});

describe("detectRunningPatterns — interference_safe", () => {
  it("fires when High-severity interference finding exists", () => {
    const result = detectRunningPatterns({
      weekWorkouts: [],
      load: NORMAL_LOAD,
      intensityV2: null,
      raceDateIso: null,
      referenceMs: BASE_REF_MS,
      findings: [HIGH_INTERFERENCE_FINDING],
    });
    expect(result.all).toContain("interference_safe");
  });

  it("does not fire for Medium-severity interference", () => {
    const result = detectRunningPatterns({
      weekWorkouts: [],
      load: NORMAL_LOAD,
      intensityV2: null,
      raceDateIso: null,
      referenceMs: BASE_REF_MS,
      findings: [{
        ...HIGH_INTERFERENCE_FINDING,
        severity: "Medium",
        tone: "warn",
      }],
    });
    expect(result.all).not.toContain("interference_safe");
  });
});

describe("detectRunningPatterns — taper_or_high_load", () => {
  it("fires when load ratio exceeds 1.3", () => {
    const result = detectRunningPatterns({
      weekWorkouts: [makeEasyRun()],
      load: HIGH_LOAD,
      intensityV2: null,
      raceDateIso: null,
      referenceMs: BASE_REF_MS,
      findings: NO_FINDINGS,
    });
    expect(result.all).toContain("taper_or_high_load");
  });

  it("fires when race is within 3 weeks", () => {
    const nearRace = new Date(BASE_REF_MS + 14 * 86400000).toISOString().slice(0, 10);
    const result = detectRunningPatterns({
      weekWorkouts: [makeEasyRun()],
      load: NORMAL_LOAD,
      intensityV2: null,
      raceDateIso: nearRace,
      referenceMs: BASE_REF_MS,
      findings: NO_FINDINGS,
    });
    expect(result.all).toContain("taper_or_high_load");
  });

  it("does not fire when race is more than 3 weeks away", () => {
    const farRace = new Date(BASE_REF_MS + 60 * 86400000).toISOString().slice(0, 10);
    const result = detectRunningPatterns({
      weekWorkouts: [makeEasyRun()],
      load: NORMAL_LOAD,
      intensityV2: null,
      raceDateIso: farRace,
      referenceMs: BASE_REF_MS,
      findings: NO_FINDINGS,
    });
    expect(result.all).not.toContain("taper_or_high_load");
  });
});

describe("detectRunningPatterns — low_cadence_intervals", () => {
  it("fires when interval session has cadence < 168", () => {
    const result = detectRunningPatterns({
      weekWorkouts: [makeIntervalWithCadence(160)],
      load: NORMAL_LOAD,
      intensityV2: null,
      raceDateIso: null,
      referenceMs: BASE_REF_MS,
      findings: NO_FINDINGS,
    });
    expect(result.all).toContain("low_cadence_intervals");
  });

  it("does not fire when cadence is at boundary (168)", () => {
    const result = detectRunningPatterns({
      weekWorkouts: [makeIntervalWithCadence(168)],
      load: NORMAL_LOAD,
      intensityV2: null,
      raceDateIso: null,
      referenceMs: BASE_REF_MS,
      findings: NO_FINDINGS,
    });
    expect(result.all).not.toContain("low_cadence_intervals");
  });

  it("does not fire for easy runs with low cadence", () => {
    const result = detectRunningPatterns({
      weekWorkouts: [{ ...makeEasyRun(), avg_cadence: 155 }],
      load: NORMAL_LOAD,
      intensityV2: null,
      raceDateIso: null,
      referenceMs: BASE_REF_MS,
      findings: NO_FINDINGS,
    });
    expect(result.all).not.toContain("low_cadence_intervals");
  });
});

describe("detectRunningPatterns — low_easy_load_share", () => {
  it("fires when pctEasyLoad < 60", () => {
    const result = detectRunningPatterns({
      weekWorkouts: [makeEasyRun()],
      load: NORMAL_LOAD,
      intensityV2: {
        pctEasyLoad: 55, pctModerateLoad: 25, pctHardLoad: 20,
        pctEasyTime: 70, pctModerateTime: 20, pctHardTime: 10,
        totalRunningSeconds: 18000, totalTrimp: 250,
        modelUsed: "banister_karvonen", warnings: [],
      },
      raceDateIso: null,
      referenceMs: BASE_REF_MS,
      findings: NO_FINDINGS,
    });
    expect(result.all).toContain("low_easy_load_share");
  });

  it("does not fire when pctEasyLoad >= 60", () => {
    const result = detectRunningPatterns({
      weekWorkouts: [makeEasyRun()],
      load: NORMAL_LOAD,
      intensityV2: {
        pctEasyLoad: 65, pctModerateLoad: 20, pctHardLoad: 15,
        pctEasyTime: 75, pctModerateTime: 15, pctHardTime: 10,
        totalRunningSeconds: 18000, totalTrimp: 200,
        modelUsed: "banister_karvonen", warnings: [],
      },
      raceDateIso: null,
      referenceMs: BASE_REF_MS,
      findings: NO_FINDINGS,
    });
    expect(result.all).not.toContain("low_easy_load_share");
  });

  it("does not fire when intensityV2 is null", () => {
    const result = detectRunningPatterns({
      weekWorkouts: [makeEasyRun()],
      load: NORMAL_LOAD,
      intensityV2: null,
      raceDateIso: null,
      referenceMs: BASE_REF_MS,
      findings: NO_FINDINGS,
    });
    expect(result.all).not.toContain("low_easy_load_share");
  });
});
