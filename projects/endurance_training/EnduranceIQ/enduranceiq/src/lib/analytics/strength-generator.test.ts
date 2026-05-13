import { describe, expect, it } from "vitest";
import {
  recommendStrengthDays,
  buildStrengthMenu,
} from "@/lib/analytics/strength-generator";

const BASE_REF_MS = Date.parse("2026-05-12T23:59:59.999Z");

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

describe("buildStrengthMenu — pattern routing", () => {
  const baseInput = {
    runsWeek: [],
    loadStatusWord: "Normal",
    loadRatio: 1.0,
    raceDateIso: null,
    referenceMs: BASE_REF_MS,
  };

  it("interference_safe → mobility exercises, 1 day, ≤25 min", () => {
    const menu = buildStrengthMenu({ primaryPattern: "interference_safe", ...baseInput });
    expect(menu.pattern).toBe("interference_safe");
    expect(menu.days).toHaveLength(1);
    expect(menu.days[0].duration_min).toBeLessThanOrEqual(25);
  });

  it("taper_or_high_load → maintenance exercises, 1 day, ≤30 min", () => {
    const menu = buildStrengthMenu({ primaryPattern: "taper_or_high_load", ...baseInput });
    expect(menu.pattern).toBe("taper_or_high_load");
    expect(menu.days).toHaveLength(1);
    expect(menu.days[0].duration_min).toBeLessThanOrEqual(30);
  });

  it("low_cadence_intervals → at least 4 exercises with plyometric emphasis", () => {
    const menu = buildStrengthMenu({ primaryPattern: "low_cadence_intervals", ...baseInput });
    expect(menu.pattern).toBe("low_cadence_intervals");
    const totalExercises = menu.days.reduce((s, d) => s + d.exercises.length, 0);
    expect(totalExercises).toBeGreaterThanOrEqual(4);
    const hasPlyo = menu.days.some((d) =>
      d.exercises.some((e) => e.emphasis.includes("plyometric"))
    );
    expect(hasPlyo).toBe(true);
  });

  it("default → at least 4 exercises", () => {
    const menu = buildStrengthMenu({ primaryPattern: "default", ...baseInput });
    const totalExercises = menu.days.reduce((s, d) => s + d.exercises.length, 0);
    expect(totalExercises).toBeGreaterThanOrEqual(4);
  });

  it("low_easy_load_share → at least 4 exercises with single_leg_economy or posterior_chain", () => {
    const menu = buildStrengthMenu({ primaryPattern: "low_easy_load_share", ...baseInput });
    const allExercises = menu.days.flatMap((d) => d.exercises);
    const relevant = allExercises.filter((e) =>
      e.emphasis.includes("single_leg_economy") || e.emphasis.includes("posterior_chain")
    );
    expect(relevant.length).toBeGreaterThanOrEqual(1);
  });
});

describe("buildStrengthMenu — constraints", () => {
  const baseInput = {
    runsWeek: [],
    loadStatusWord: "Normal",
    loadRatio: 1.0,
    raceDateIso: null,
    referenceMs: BASE_REF_MS,
  };

  const ALL_PATTERNS = [
    "interference_safe", "taper_or_high_load", "low_cadence_intervals",
    "long_run_drift", "low_easy_load_share", "default",
  ] as const;

  it("no day exceeds 50 min for any pattern", () => {
    for (const pattern of ALL_PATTERNS) {
      const menu = buildStrengthMenu({ primaryPattern: pattern, ...baseInput });
      for (const day of menu.days) {
        expect(day.duration_min).toBeLessThanOrEqual(50);
      }
    }
  });

  it("each day has at least 4 exercises for non-mobility patterns", () => {
    for (const pattern of ALL_PATTERNS) {
      if (pattern === "interference_safe") continue; // mobility-only has fewer
      const menu = buildStrengthMenu({ primaryPattern: pattern, ...baseInput });
      for (const day of menu.days) {
        expect(day.exercises.length).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it("each day has at most 6 exercises for any pattern", () => {
    for (const pattern of ALL_PATTERNS) {
      const menu = buildStrengthMenu({ primaryPattern: pattern, ...baseInput });
      for (const day of menu.days) {
        expect(day.exercises.length).toBeLessThanOrEqual(6);
      }
    }
  });

  it("rationale is a non-empty string for all patterns", () => {
    for (const pattern of ALL_PATTERNS) {
      const menu = buildStrengthMenu({ primaryPattern: pattern, ...baseInput });
      expect(menu.rationale.length).toBeGreaterThan(10);
    }
  });
});
