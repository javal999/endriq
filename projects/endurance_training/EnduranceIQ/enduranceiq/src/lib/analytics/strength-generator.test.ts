import { describe, expect, it } from "vitest";
import {
  recommendStrengthDays,
  selectSessionTemplate,
} from "@/lib/analytics/strength-generator";

describe("recommendStrengthDays", () => {
  it("blocks the day before interval and tempo", () => {
    const runs = [
      {
        sport_type: "run",
        session_label: "interval",
        started_at: "2025-04-09T12:00:00.000Z",
      },
    ];
    const { avoidDays, recommendedDays } = recommendStrengthDays(runs);
    expect(avoidDays).toContain(1);
    expect(recommendedDays.length).toBeLessThanOrEqual(2);
  });

  it("blocks the day before long_run", () => {
    const runs = [
      {
        sport_type: "run",
        session_label: "long_run",
        started_at: "2025-04-11T12:00:00.000Z",
      },
    ];
    const { avoidDays } = recommendStrengthDays(runs);
    expect(avoidDays.length).toBeGreaterThan(0);
  });

  it("returns up to 2 recommended days when space remains", () => {
    const runs = [
      {
        sport_type: "run",
        session_label: "easy",
        started_at: "2025-04-08T12:00:00.000Z",
      },
    ];
    const { recommendedDays } = recommendStrengthDays(runs);
    expect(recommendedDays.length).toBeGreaterThan(0);
    expect(recommendedDays.length).toBeLessThanOrEqual(2);
  });

  it("returns empty recommendedDays when every weekday is blocked", () => {
    const days = [7, 8, 9, 10, 11, 12, 13];
    const runs = days.map((d) => ({
      sport_type: "run",
      session_label: "interval" as const,
      started_at: `2025-04-${String(d).padStart(2, "0")}T12:00:00.000Z`,
    }));
    const { recommendedDays } = recommendStrengthDays(runs);
    expect(recommendedDays).toEqual([]);
  });

  it("no quality runs → avoidDays empty", () => {
    const runs = [
      {
        sport_type: "run",
        session_label: "easy",
        started_at: "2025-04-08T12:00:00.000Z",
      },
    ];
    const { avoidDays } = recommendStrengthDays(runs);
    expect(avoidDays).toEqual([]);
  });
});

describe("selectSessionTemplate", () => {
  const ref = Date.parse("2025-05-10T23:59:59.999Z");

  it("returns C when race within 3 weeks", () => {
    const t = selectSessionTemplate({
      loadRatio: 1.0,
      raceDateIso: "2025-05-24",
      referenceMs: ref,
      lastSessionId: "A",
    });
    expect(t.id).toBe("C");
  });

  it("returns C when loadRatio > 1.3", () => {
    const t = selectSessionTemplate({
      loadRatio: 1.31,
      raceDateIso: null,
      referenceMs: ref,
      lastSessionId: "A",
    });
    expect(t.id).toBe("C");
  });

  it("returns A when loadRatio < 0.8", () => {
    const t = selectSessionTemplate({
      loadRatio: 0.79,
      raceDateIso: null,
      referenceMs: ref,
      lastSessionId: "B",
    });
    expect(t.id).toBe("A");
  });

  it("returns B when lastSessionId is A", () => {
    const t = selectSessionTemplate({
      loadRatio: 1.0,
      raceDateIso: null,
      referenceMs: ref,
      lastSessionId: "A",
    });
    expect(t.id).toBe("B");
  });

  it("returns A when lastSessionId is B", () => {
    const t = selectSessionTemplate({
      loadRatio: 1.0,
      raceDateIso: null,
      referenceMs: ref,
      lastSessionId: "B",
    });
    expect(t.id).toBe("A");
  });

  it("returns A when lastSessionId is null", () => {
    const t = selectSessionTemplate({
      loadRatio: 1.0,
      raceDateIso: null,
      referenceMs: ref,
      lastSessionId: null,
    });
    expect(t.id).toBe("A");
  });
});
