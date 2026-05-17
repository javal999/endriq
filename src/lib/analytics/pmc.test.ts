import { describe, it, expect } from "vitest";
import {
  computePmc,
  densifyDailyLoads,
  tsbZone,
  type PmcDailyLoad,
} from "@/lib/analytics/pmc";

function constantLoadSeries(load: number, days: number): PmcDailyLoad[] {
  const out: PmcDailyLoad[] = [];
  const start = Date.UTC(2026, 0, 1);
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start + i * 86400000);
    out.push({
      date: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`,
      load,
    });
  }
  return out;
}

describe("computePmc", () => {
  it("returns empty array for empty input", () => {
    expect(computePmc([])).toEqual([]);
  });

  it("produces one output per input point (within window)", () => {
    const out = computePmc(constantLoadSeries(100, 10));
    expect(out.length).toBe(10);
  });

  it("CTL and ATL approach the constant after many days (EWA convergence)", () => {
    const out = computePmc(constantLoadSeries(100, 365));
    const last = out[out.length - 1];
    // After 365d at constant 100, both averages should be ~100
    expect(last.ctl).toBeGreaterThan(95);
    expect(last.atl).toBeGreaterThan(99);
  });

  it("ATL responds faster than CTL — TSB drops then recovers across a load spike", () => {
    // 30 days at 50, then 5 days at 200
    const series: PmcDailyLoad[] = [
      ...constantLoadSeries(50, 30),
      ...constantLoadSeries(200, 5).map((p, i) => ({
        ...p,
        date: `2026-01-${31 + i}`,
      })),
    ];
    const out = computePmc(series);
    const before = out[29].tsb;
    const after = out[34].tsb;
    // TSB before the spike is roughly 0 (both ATL and CTL near 50).
    // After 5 days at 200, ATL rises faster than CTL → TSB goes negative.
    expect(after).toBeLessThan(before);
    expect(after).toBeLessThan(0);
  });

  it("TSB = CTL − ATL exactly (within rounding)", () => {
    const out = computePmc(constantLoadSeries(80, 50));
    // Each component is independently rounded to 0.1 so the worst-case
    // accumulated rounding error in TSB ≈ 0.15 (two rounding errors
    // combined).
    for (const p of out) {
      expect(Math.abs(p.tsb - (p.ctl - p.atl))).toBeLessThanOrEqual(0.2);
    }
  });

  it("trims to windowDays when input is longer", () => {
    const out = computePmc(constantLoadSeries(100, 365), { windowDays: 30 });
    expect(out.length).toBe(30);
  });

  it("deterministic — same inputs always produce same outputs", () => {
    const input = constantLoadSeries(100, 100);
    const a = computePmc(input);
    const b = computePmc(input);
    expect(a).toEqual(b);
  });

  it("zero-load days bring ATL down faster than CTL (taper signature)", () => {
    // 60 days at 100, then 7 days off
    const series: PmcDailyLoad[] = [
      ...constantLoadSeries(100, 60),
      ...constantLoadSeries(0, 7).map((p, i) => ({
        ...p,
        date: `2026-03-${1 + i}`,
      })),
    ];
    const out = computePmc(series);
    const beforeTaper = out[59];
    const afterTaper = out[out.length - 1];
    // After a 7-day taper, TSB should rise (less fatigue)
    expect(afterTaper.tsb).toBeGreaterThan(beforeTaper.tsb);
    expect(afterTaper.atl).toBeLessThan(beforeTaper.atl);
  });

  it("respects custom CTL/ATL time constants", () => {
    const out = computePmc(constantLoadSeries(100, 60), { ctlDays: 14, atlDays: 3 });
    const last = out[out.length - 1];
    // Faster CTL convergence with ctlDays=14
    expect(last.ctl).toBeGreaterThan(98);
  });
});

describe("densifyDailyLoads", () => {
  it("fills missing days with zero", () => {
    const out = densifyDailyLoads(
      [
        { started_at: "2026-01-01T10:00:00Z", load: 100 },
        { started_at: "2026-01-03T10:00:00Z", load: 60 },
      ],
      "2026-01-01",
      "2026-01-04",
    );
    expect(out.length).toBe(4);
    expect(out[0]).toEqual({ date: "2026-01-01", load: 100 });
    expect(out[1]).toEqual({ date: "2026-01-02", load: 0 });
    expect(out[2]).toEqual({ date: "2026-01-03", load: 60 });
    expect(out[3]).toEqual({ date: "2026-01-04", load: 0 });
  });

  it("sums multiple workouts on the same day", () => {
    const out = densifyDailyLoads(
      [
        { started_at: "2026-01-01T07:00:00Z", load: 50 },
        { started_at: "2026-01-01T17:00:00Z", load: 30 },
      ],
      "2026-01-01",
      "2026-01-01",
    );
    expect(out).toEqual([{ date: "2026-01-01", load: 80 }]);
  });

  it("returns empty for inverted range", () => {
    expect(
      densifyDailyLoads([], "2026-01-10", "2026-01-01"),
    ).toEqual([]);
  });
});

describe("tsbZone", () => {
  it("classifies the four zones at boundaries", () => {
    expect(tsbZone(26)).toBe("fresh");
    expect(tsbZone(25)).toBe("neutral");
    expect(tsbZone(0)).toBe("neutral");
    expect(tsbZone(-10)).toBe("neutral");
    expect(tsbZone(-11)).toBe("fatigued");
    expect(tsbZone(-30)).toBe("fatigued");
    expect(tsbZone(-31)).toBe("over_reached");
  });
});
