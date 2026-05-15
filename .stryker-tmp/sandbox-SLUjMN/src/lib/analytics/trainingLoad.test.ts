// @ts-nocheck
import { describe, expect, it } from "vitest";
import { computeLoadMetrics } from "@/lib/analytics/trainingLoad";

/** ISO timestamps; stress summed inside each window by computeLoadMetrics. */
function wo(
  started_at: string,
  stress: number | string | null,
): { started_at: string; training_stress: unknown } {
  return { started_at, training_stress: stress };
}

describe("computeLoadMetrics", () => {
  const weekEndExclusiveMs = Date.parse("2025-04-14T00:00:00.000Z");

  it("acuteLoad sums training_stress in trailing 7 days before week boundary", () => {
    const workouts = [
      wo("2025-04-13T12:00:00.000Z", 40),
      wo("2025-04-13T18:00:00.000Z", 60),
      wo("2025-04-06T12:00:00.000Z", 999),
    ];
    const m = computeLoadMetrics(workouts, weekEndExclusiveMs);
    expect(m.acuteLoad).toBe(100);
  });

  it("chronicLoad is mean of 4 prior non-overlapping 7-day buckets", () => {
    const workouts = [
      wo("2025-04-13T12:00:00.000Z", 100),
      wo("2025-04-10T12:00:00.000Z", 50),
      wo("2025-04-06T12:00:00.000Z", 40),
      wo("2025-03-30T12:00:00.000Z", 80),
      wo("2025-03-23T12:00:00.000Z", 120),
      wo("2025-03-16T12:00:00.000Z", 60),
      wo("2025-03-09T12:00:00.000Z", 40),
    ];
    const m = computeLoadMetrics(workouts, weekEndExclusiveMs);
    expect(m.acuteLoad).toBe(150);
    expect(m.chronicLoad).toBeCloseTo((40 + 80 + 120 + 60) / 4, 5);
    expect(m.loadRatio).toBeCloseTo(150 / m.chronicLoad!, 5);
  });

  it("loadRatio is null when chronicLoad is 0", () => {
    const workouts = [wo("2025-04-13T12:00:00.000Z", 50)];
    const m = computeLoadMetrics(workouts, weekEndExclusiveMs);
    expect(m.chronicLoad).toBeNull();
    expect(m.loadRatio).toBeNull();
  });

  it('statusWord Spike when loadRatio > 1.5', () => {
    const workouts = [
      wo("2025-04-13T12:00:00.000Z", 300),
      wo("2025-04-06T12:00:00.000Z", 50),
      wo("2025-03-30T12:00:00.000Z", 50),
      wo("2025-03-23T12:00:00.000Z", 50),
      wo("2025-03-16T12:00:00.000Z", 50),
    ];
    const m = computeLoadMetrics(workouts, weekEndExclusiveMs);
    expect(m.loadRatio).not.toBeNull();
    expect(m.loadRatio! > 1.5).toBe(true);
    expect(m.statusWord).toBe("Spike");
    expect(m.tone).toBe("bad");
  });

  it('statusWord Elevated when 1.3 < loadRatio ≤ 1.5', () => {
    const chronicEach = 100;
    const workouts = [
      wo("2025-04-13T12:00:00.000Z", 140),
      wo("2025-04-06T12:00:00.000Z", chronicEach),
      wo("2025-03-30T12:00:00.000Z", chronicEach),
      wo("2025-03-23T12:00:00.000Z", chronicEach),
      wo("2025-03-16T12:00:00.000Z", chronicEach),
    ];
    const m = computeLoadMetrics(workouts, weekEndExclusiveMs);
    expect(m.loadRatio).toBeCloseTo(1.4, 5);
    expect(m.statusWord).toBe("Elevated");
    expect(m.tone).toBe("warn");
  });

  it('statusWord Normal when 0.8 ≤ loadRatio ≤ 1.3', () => {
    const chronicEach = 100;
    const workouts = [
      wo("2025-04-13T12:00:00.000Z", 110),
      wo("2025-04-06T12:00:00.000Z", chronicEach),
      wo("2025-03-30T12:00:00.000Z", chronicEach),
      wo("2025-03-23T12:00:00.000Z", chronicEach),
      wo("2025-03-16T12:00:00.000Z", chronicEach),
    ];
    const m = computeLoadMetrics(workouts, weekEndExclusiveMs);
    expect(m.loadRatio).toBeCloseTo(1.1, 5);
    expect(m.statusWord).toBe("Normal");
    expect(m.tone).toBe("good");
  });

  it('statusWord Low when loadRatio < 0.8', () => {
    const chronicEach = 100;
    const workouts = [
      wo("2025-04-13T12:00:00.000Z", 60),
      wo("2025-04-06T12:00:00.000Z", chronicEach),
      wo("2025-03-30T12:00:00.000Z", chronicEach),
      wo("2025-03-23T12:00:00.000Z", chronicEach),
      wo("2025-03-16T12:00:00.000Z", chronicEach),
    ];
    const m = computeLoadMetrics(workouts, weekEndExclusiveMs);
    expect(m.loadRatio).toBeCloseTo(0.6, 5);
    expect(m.statusWord).toBe("Low");
  });

  it('statusWord "—" when loadRatio is null', () => {
    const m = computeLoadMetrics([], weekEndExclusiveMs);
    expect(m.loadRatio).toBeNull();
    expect(m.statusWord).toBe("—");
  });

  it("ignores workouts outside chronic buckets for null chronic", () => {
    const workouts = [wo("2024-01-01T12:00:00.000Z", 500)];
    const m = computeLoadMetrics(workouts, weekEndExclusiveMs);
    expect(m.acuteLoad).toBe(0);
    expect(m.chronicLoad).toBeNull();
  });

  it("coerces string training_stress", () => {
    const workouts = [
      wo("2025-04-13T12:00:00.000Z", "42.5"),
      wo("2025-04-06T12:00:00.000Z", 10),
      wo("2025-03-30T12:00:00.000Z", 10),
      wo("2025-03-23T12:00:00.000Z", 10),
      wo("2025-03-16T12:00:00.000Z", 10),
    ];
    const m = computeLoadMetrics(workouts, weekEndExclusiveMs);
    expect(m.acuteLoad).toBe(42.5);
  });

  it("treats null training_stress as 0", () => {
    const workouts = [
      wo("2025-04-13T12:00:00.000Z", null),
      wo("2025-04-06T12:00:00.000Z", 50),
      wo("2025-03-30T12:00:00.000Z", 50),
      wo("2025-03-23T12:00:00.000Z", 50),
      wo("2025-03-16T12:00:00.000Z", 50),
    ];
    const m = computeLoadMetrics(workouts, weekEndExclusiveMs);
    expect(m.acuteLoad).toBe(0);
  });

  it("empty workouts → acuteLoad 0, chronic null", () => {
    const m = computeLoadMetrics([], weekEndExclusiveMs);
    expect(m.acuteLoad).toBe(0);
    expect(m.chronicLoad).toBeNull();
    expect(m.loadRatio).toBeNull();
  });
});
