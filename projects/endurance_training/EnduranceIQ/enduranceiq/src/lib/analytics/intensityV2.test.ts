import { describe, expect, it } from "vitest";
import { computeIntensityV2 } from "./intensityV2";

const MAX_HR = 190;
const HR_REST = 50;

// Helper: build a single session with given avg_hr and duration
function sess(avg_hr: number, duration_seconds = 3600) {
  return { avg_hr, duration_seconds };
}

describe("computeIntensityV2 — empty / no data", () => {
  it("returns all-zero for empty sessions", () => {
    const r = computeIntensityV2([], MAX_HR, HR_REST, "male");
    expect(r.pctEasyTime).toBe(0);
    expect(r.pctEasyLoad).toBe(0);
    expect(r.totalTrimp).toBe(0);
  });

  it("returns all-zero for sessions with null avg_hr", () => {
    const r = computeIntensityV2([{ avg_hr: null, duration_seconds: 3600 }], MAX_HR, HR_REST, "male");
    expect(r.totalRunningSeconds).toBe(0);
  });
});

describe("computeIntensityV2 — zone boundary at r = 0.74", () => {
  // With Karvonen: r = (avg_hr - hr_rest) / (max_hr - hr_rest)
  // r = 0.74 → avg_hr = hr_rest + 0.74 * (max_hr - hr_rest) = 50 + 0.74 * 140 = 153.6
  const boundaryHr = Math.round(50 + 0.74 * (MAX_HR - HR_REST)); // 154

  it("session just below r=0.74 boundary is classified easy", () => {
    const r = computeIntensityV2([sess(153)], MAX_HR, HR_REST, "male");
    expect(r.pctEasyTime).toBe(100);
    expect(r.pctEasyLoad).toBe(100);
  });

  it("session at r=0.74 threshold crosses into moderate", () => {
    const r = computeIntensityV2([sess(boundaryHr)], MAX_HR, HR_REST, "male");
    expect(r.pctModerateTime).toBe(100);
    expect(r.pctModerateLoad).toBe(100);
  });
});

describe("computeIntensityV2 — zone boundary at r = 0.84", () => {
  // r = 0.84 → avg_hr = 50 + 0.84 * 140 = 167.6
  const boundaryHr = Math.round(50 + 0.84 * (MAX_HR - HR_REST)); // 168

  it("session just below r=0.84 boundary is classified moderate", () => {
    const r = computeIntensityV2([sess(167)], MAX_HR, HR_REST, "male");
    expect(r.pctModerateTime).toBe(100);
  });

  it("session at r=0.84 crosses into hard", () => {
    const r = computeIntensityV2([sess(boundaryHr)], MAX_HR, HR_REST, "male");
    expect(r.pctHardTime).toBe(100);
    expect(r.pctHardLoad).toBe(100);
  });
});

describe("computeIntensityV2 — sex weighting", () => {
  const easyHr = 130; // well below 0.74 threshold with Karvonen
  const hardHr = 180; // above 0.84 threshold

  it("female weighting produces different TRIMP than male for same effort", () => {
    const female = computeIntensityV2([sess(hardHr)], MAX_HR, HR_REST, "female");
    const male = computeIntensityV2([sess(hardHr)], MAX_HR, HR_REST, "male");
    // Banister multipliers differ (0.86/1.67 vs 0.64/1.92); total TRIMP will differ
    expect(female.totalTrimp).not.toBeCloseTo(male.totalTrimp, 0);
  });

  it("other sex uses male formula", () => {
    const other = computeIntensityV2([sess(hardHr)], MAX_HR, HR_REST, "other");
    const male = computeIntensityV2([sess(hardHr)], MAX_HR, HR_REST, "male");
    expect(other.totalTrimp).toBeCloseTo(male.totalTrimp, 5);
  });

  it("null sex uses male formula", () => {
    const nullSex = computeIntensityV2([sess(hardHr)], MAX_HR, HR_REST, null);
    const male = computeIntensityV2([sess(hardHr)], MAX_HR, HR_REST, "male");
    expect(nullSex.totalTrimp).toBeCloseTo(male.totalTrimp, 5);
  });
});

describe("computeIntensityV2 — hr_rest present vs missing", () => {
  it("warns when hr_rest is null", () => {
    const r = computeIntensityV2([sess(150)], MAX_HR, null, "male");
    expect(r.modelUsed).toBe("karvonen_approx");
    expect(r.warnings).toContain("hr_rest missing — TRIMP using HR-max-only approximation");
  });

  it("uses banister_karvonen model when hr_rest is provided", () => {
    const r = computeIntensityV2([sess(150)], MAX_HR, HR_REST, "male");
    expect(r.modelUsed).toBe("banister_karvonen");
    expect(r.warnings).toHaveLength(0);
  });

  it("karvonen_approx classifies sessions differently from banister_karvonen", () => {
    // At avg_hr = 150, with approx: r = 150/190 ≈ 0.789 (moderate)
    // With Karvonen: r = (150-50)/(190-50) = 100/140 ≈ 0.714 (easy)
    const approx = computeIntensityV2([sess(150)], MAX_HR, null, "male");
    const karvonen = computeIntensityV2([sess(150)], MAX_HR, HR_REST, "male");
    // approx puts this in moderate; karvonen puts it in easy
    expect(approx.pctModerateTime).toBe(100);
    expect(karvonen.pctEasyTime).toBe(100);
  });
});

describe("computeIntensityV2 — percentages sum to 100", () => {
  it("time percentages sum to 100 with single session", () => {
    const r = computeIntensityV2([sess(160)], MAX_HR, HR_REST, "male");
    expect(r.pctEasyTime + r.pctModerateTime + r.pctHardTime).toBe(100);
  });

  it("load percentages sum to 100 with single session", () => {
    const r = computeIntensityV2([sess(160)], MAX_HR, HR_REST, "male");
    expect(r.pctEasyLoad + r.pctModerateLoad + r.pctHardLoad).toBe(100);
  });

  it("percentages sum to 100 with multiple sessions of varying duration", () => {
    const sessions = [
      sess(130, 1800),   // easy
      sess(160, 2700),   // moderate
      sess(175, 1200),   // hard
    ];
    const r = computeIntensityV2(sessions, MAX_HR, HR_REST, "female");
    expect(r.pctEasyTime + r.pctModerateTime + r.pctHardTime).toBe(100);
    expect(r.pctEasyLoad + r.pctModerateLoad + r.pctHardLoad).toBe(100);
  });
});

describe("computeIntensityV2 — load share diverges from time share", () => {
  it("hard sessions carry disproportionately more TRIMP than time share", () => {
    // Equal time in easy vs hard — load should skew heavily toward hard
    const sessions = [
      sess(130, 3600),   // easy — 1h
      sess(180, 3600),   // hard — 1h
    ];
    const r = computeIntensityV2(sessions, MAX_HR, HR_REST, "male");
    expect(r.pctEasyTime).toBe(50);
    expect(r.pctHardLoad).toBeGreaterThan(r.pctHardTime);
    expect(r.pctEasyLoad).toBeLessThan(r.pctEasyTime);
  });
});
