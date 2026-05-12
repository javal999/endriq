import { describe, expect, it } from "vitest";
import { intensityFromRuns } from "./intensityDistribution";

describe("intensityFromRuns", () => {
  const max = 200;

  it("allocates duration by avg/max HR buckets", () => {
    const runs = [
      { duration_seconds: 3600, avg_hr: 130 }, // ~0.65 → easy
      { duration_seconds: 1800, avg_hr: 170 }, // ~0.85 → hard boundary
    ];
    const out = intensityFromRuns(runs, 194);
    expect(out.totalRunningSeconds).toBe(5400);
    expect(out.pctEasy + out.pctModerate + out.pctHard).toBe(100);
    expect(out.pctEasy).toBeGreaterThan(out.pctModerate);
  });

  it("correctly buckets avg_hr/maxHr < 0.75 as easy", () => {
    const out = intensityFromRuns([{ duration_seconds: 1000, avg_hr: 149 }], max);
    expect(out.pctEasy).toBe(100);
    expect(out.pctModerate).toBe(0);
    expect(out.pctHard).toBe(0);
  });

  it("correctly buckets 0.75 ≤ avg_hr/maxHr < 0.85 as moderate", () => {
    const out = intensityFromRuns([{ duration_seconds: 1000, avg_hr: 160 }], max);
    expect(out.pctModerate).toBe(100);
    expect(out.pctEasy).toBe(0);
    expect(out.pctHard).toBe(0);
  });

  it("correctly buckets avg_hr/maxHr ≥ 0.85 as hard", () => {
    const out = intensityFromRuns([{ duration_seconds: 1000, avg_hr: 180 }], max);
    expect(out.pctHard).toBe(100);
    expect(out.pctEasy).toBe(0);
    expect(out.pctModerate).toBe(0);
  });

  it("boundary avg_hr/maxHr = 0.75 → moderate (not easy)", () => {
    const out = intensityFromRuns([{ duration_seconds: 1000, avg_hr: 150 }], max);
    expect(out.pctModerate).toBe(100);
    expect(out.pctEasy).toBe(0);
  });

  it("boundary avg_hr/maxHr = 0.85 → hard (not moderate)", () => {
    const out = intensityFromRuns([{ duration_seconds: 1000, avg_hr: 170 }], max);
    expect(out.pctHard).toBe(100);
    expect(out.pctModerate).toBe(0);
  });

  it("pctEasy + pctModerate + pctHard equals 100 after rounding correction", () => {
    const runs = [
      { duration_seconds: 3333, avg_hr: 152 },
      { duration_seconds: 3333, avg_hr: 164 },
      { duration_seconds: 3334, avg_hr: 172 },
    ];
    const out = intensityFromRuns(runs, max);
    expect(out.pctEasy + out.pctModerate + out.pctHard).toBe(100);
  });

  it("skips runs where avg_hr is null", () => {
    const out = intensityFromRuns(
      [
        { duration_seconds: 600, avg_hr: null },
        { duration_seconds: 600, avg_hr: 140 },
      ],
      max,
    );
    expect(out.totalRunningSeconds).toBe(600);
    expect(out.pctEasy).toBe(100);
  });

  it("returns all zeros when observedMaxHr is 0", () => {
    const out = intensityFromRuns([{ duration_seconds: 600, avg_hr: 140 }], 0);
    expect(out.totalRunningSeconds).toBe(0);
    expect(out.pctEasy).toBe(0);
    expect(out.pctModerate).toBe(0);
    expect(out.pctHard).toBe(0);
  });

  it("returns all zeros when runs array is empty", () => {
    const out = intensityFromRuns([], max);
    expect(out.totalRunningSeconds).toBe(0);
    expect(out.pctEasy + out.pctModerate + out.pctHard).toBe(0);
  });

  it("weights buckets by duration_seconds (longer runs count more)", () => {
    const out = intensityFromRuns(
      [
        { duration_seconds: 100, avg_hr: 140 }, // easy
        { duration_seconds: 900, avg_hr: 180 }, // hard
      ],
      max,
    );
    expect(out.pctHard).toBeGreaterThan(out.pctEasy);
    expect(out.totalRunningSeconds).toBe(1000);
  });
});
