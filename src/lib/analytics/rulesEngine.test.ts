import { describe, expect, it } from "vitest";
import { computeRuleFindings } from "@/lib/analytics/rulesEngine";
import type { IntensityBreakdown } from "@/lib/analytics/intensityDistribution";
import type { LoadMetrics } from "@/lib/analytics/trainingLoad";
import type { WorkoutForRules } from "@/lib/analytics/rulesEngine";

const WEEK_START = "2025-04-07T00:00:00.000Z";
const WEEK_END_EX = "2025-04-14T00:00:00.000Z";

function makeIntensity(overrides: Partial<IntensityBreakdown>): IntensityBreakdown {
  return {
    pctEasy: 80,
    pctModerate: 10,
    pctHard: 10,
    totalRunningSeconds: 3600,
    ...overrides,
  };
}

function makeLoad(overrides: Partial<LoadMetrics>): LoadMetrics {
  return {
    acuteLoad: 100,
    chronicLoad: 100,
    loadRatio: 1,
    statusWord: "Normal",
    tone: "good",
    ...overrides,
  };
}

function makeWorkout(overrides: Partial<WorkoutForRules>): WorkoutForRules {
  return {
    sport_type: "run",
    session_label: "easy",
    started_at: "2025-04-08T12:00:00.000Z",
    duration_seconds: 3600,
    avg_hr: 140,
    avg_cadence: 170,
    ...overrides,
  };
}

function runFindings(
  weekWorkouts: WorkoutForRules[],
  extendedWorkouts: WorkoutForRules[],
  opts?: {
    intensity?: IntensityBreakdown;
    load?: LoadMetrics;
    observedMaxHr?: number;
  },
) {
  return computeRuleFindings({
    weekWorkouts,
    extendedWorkouts,
    observedMaxHr: opts?.observedMaxHr ?? 200,
    intensity: opts?.intensity ?? makeIntensity({}),
    load: opts?.load ?? makeLoad({ loadRatio: null }),
    weekStartIso: WEEK_START,
    weekEndExclusiveIso: WEEK_END_EX,
  });
}

describe("Rule 1: Easy volume below research target", () => {
  it("fires High when pctEasy = 60 and enough running time", () => {
    const f = runFindings([makeWorkout({})], [], {
      intensity: makeIntensity({ pctEasy: 60, totalRunningSeconds: 3600 }),
    });
    expect(f.some((x) => x.title === "Easy volume below research target")).toBe(
      true,
    );
    expect(f.find((x) => x.title === "Easy volume below research target")?.severity).toBe(
      "High",
    );
  });

  it("fires High when pctEasy = 0", () => {
    const f = runFindings([makeWorkout({})], [], {
      intensity: makeIntensity({ pctEasy: 0, totalRunningSeconds: 3600 }),
    });
    expect(f.some((x) => x.title === "Easy volume below research target")).toBe(true);
  });

  it("fires High when pctEasy = 69 and totalRunningSeconds = 121", () => {
    const f = runFindings([makeWorkout({})], [], {
      intensity: makeIntensity({ pctEasy: 69, totalRunningSeconds: 121 }),
    });
    expect(f.some((x) => x.title === "Easy volume below research target")).toBe(true);
  });

  it("does NOT fire when pctEasy = 70", () => {
    const f = runFindings([makeWorkout({})], [], {
      intensity: makeIntensity({ pctEasy: 70, totalRunningSeconds: 3600 }),
    });
    expect(f.some((x) => x.title === "Easy volume below research target")).toBe(false);
  });

  it("does NOT fire when pctEasy = 80", () => {
    const f = runFindings([makeWorkout({})], [], {
      intensity: makeIntensity({ pctEasy: 80, totalRunningSeconds: 3600 }),
    });
    expect(f.some((x) => x.title === "Easy volume below research target")).toBe(false);
  });

  it("does NOT fire when pctEasy = 50 but totalRunningSeconds = 120", () => {
    const f = runFindings([makeWorkout({})], [], {
      intensity: makeIntensity({ pctEasy: 50, totalRunningSeconds: 120 }),
    });
    expect(f.some((x) => x.title === "Easy volume below research target")).toBe(false);
  });

  it("does NOT fire when totalRunningSeconds = 0", () => {
    const f = runFindings([], [], {
      intensity: makeIntensity({ pctEasy: 50, totalRunningSeconds: 0 }),
    });
    expect(f.some((x) => x.title === "Easy volume below research target")).toBe(false);
  });
});

describe("Rule 2: Training load spike / elevated", () => {
  const neutralIntensity = makeIntensity({ pctEasy: 80, totalRunningSeconds: 3600 });

  it("fires High when loadRatio = 1.51", () => {
    const f = runFindings([makeWorkout({})], [], {
      intensity: neutralIntensity,
      load: makeLoad({ loadRatio: 1.51 }),
    });
    const hit = f.find((x) => x.title === "Training load spike");
    expect(hit?.severity).toBe("High");
  });

  it("fires High when loadRatio = 2.5", () => {
    const f = runFindings([makeWorkout({})], [], {
      intensity: neutralIntensity,
      load: makeLoad({ loadRatio: 2.5 }),
    });
    expect(f.some((x) => x.title === "Training load spike")).toBe(true);
  });

  it("fires Medium when loadRatio = 1.31", () => {
    const f = runFindings([makeWorkout({})], [], {
      intensity: neutralIntensity,
      load: makeLoad({ loadRatio: 1.31 }),
    });
    const hit = f.find((x) => x.title === "Elevated training load");
    expect(hit?.severity).toBe("Medium");
  });

  it("fires Medium when loadRatio = 1.5 (boundary)", () => {
    const f = runFindings([makeWorkout({})], [], {
      intensity: neutralIntensity,
      load: makeLoad({ loadRatio: 1.5 }),
    });
    expect(f.some((x) => x.title === "Training load spike")).toBe(false);
    const hit = f.find((x) => x.title === "Elevated training load");
    expect(hit?.severity).toBe("Medium");
  });

  it("does NOT fire when loadRatio = 1.3", () => {
    const f = runFindings([makeWorkout({})], [], {
      intensity: neutralIntensity,
      load: makeLoad({ loadRatio: 1.3 }),
    });
    expect(f.some((x) => x.title.includes("load"))).toBe(false);
  });

  it("does NOT fire when loadRatio = 1.0", () => {
    const f = runFindings([makeWorkout({})], [], {
      intensity: neutralIntensity,
      load: makeLoad({ loadRatio: 1.0 }),
    });
    expect(f.some((x) => x.title.includes("Training load"))).toBe(false);
  });

  it("does NOT fire when loadRatio is null", () => {
    const f = runFindings([makeWorkout({})], [], {
      intensity: neutralIntensity,
      load: makeLoad({ loadRatio: null }),
    });
    expect(f.some((x) => x.title.includes("Training load"))).toBe(false);
  });
});

describe("Rule 3: Week without a full rest day", () => {
  /** Apr 7–13 2025 UTC — seven consecutive calendar days inside [Apr 7, Apr 14). */
  function sevenDayStreak(): WorkoutForRules[] {
    const days = [7, 8, 9, 10, 11, 12, 13];
    return days.map((d) =>
      makeWorkout({
        started_at: `2025-04-${String(d).padStart(2, "0")}T12:00:00.000Z`,
        session_label: "easy",
      }),
    );
  }

  it("fires Medium with 7 consecutive training days", () => {
    const f = runFindings(sevenDayStreak(), sevenDayStreak(), {});
    expect(f.some((x) => x.title === "Week without a full rest day")).toBe(true);
    expect(f.find((x) => x.title === "Week without a full rest day")?.severity).toBe(
      "Medium",
    );
  });

  it("fires with 8 consecutive training days (spans week boundary counting)", () => {
    const w = [
      ...sevenDayStreak(),
      makeWorkout({
        started_at: "2025-04-14T12:00:00.000Z",
        session_label: "easy",
      }),
    ];
    const inWeek = sevenDayStreak();
    const f = runFindings(inWeek, w, {});
    expect(f.some((x) => x.title === "Week without a full rest day")).toBe(true);
  });

  it("does NOT fire with 6 consecutive training days", () => {
    const six = sevenDayStreak().slice(0, 6);
    const f = runFindings(six, six, {});
    expect(f.some((x) => x.title === "Week without a full rest day")).toBe(false);
  });

  it("does NOT fire with 7 days where a gap breaks the streak", () => {
    const gap = sevenDayStreak().filter((_, i) => i !== 3);
    const f = runFindings(gap, gap, {});
    expect(f.some((x) => x.title === "Week without a full rest day")).toBe(false);
  });

  it("does NOT fire when a day has only recovery runs", () => {
    const days = sevenDayStreak().map((w, i) =>
      i === 3
        ? { ...w, session_label: "recovery" as const }
        : w,
    );
    const f = runFindings(days, days, {});
    expect(f.some((x) => x.title === "Week without a full rest day")).toBe(false);
  });

  it("does NOT fire with 0 workouts", () => {
    const f = runFindings([], [], {});
    expect(f.some((x) => x.title === "Week without a full rest day")).toBe(false);
  });
});

describe("Rule 4: Long run pace ties easy runs", () => {
  it("fires Medium when long run HR fraction > 0.8", () => {
    const w = makeWorkout({
      session_label: "long_run",
      avg_hr: 162,
      started_at: "2025-04-10T12:00:00.000Z",
    });
    const f = runFindings([w], [w], { observedMaxHr: 200 });
    expect(f.some((x) => x.title === "Long run pace ties easy runs")).toBe(true);
  });

  it("fires when avg_hr = 161 vs max 200", () => {
    const w = makeWorkout({
      session_label: "long_run",
      avg_hr: 161,
      started_at: "2025-04-10T12:00:00.000Z",
    });
    const f = runFindings([w], [w], { observedMaxHr: 200 });
    expect(f.some((x) => x.title === "Long run pace ties easy runs")).toBe(true);
  });

  it("does NOT fire when exactly 0.80", () => {
    const w = makeWorkout({
      session_label: "long_run",
      avg_hr: 160,
      started_at: "2025-04-10T12:00:00.000Z",
    });
    const f = runFindings([w], [w], { observedMaxHr: 200 });
    expect(f.some((x) => x.title === "Long run pace ties easy runs")).toBe(false);
  });

  it("does NOT fire when long run HR lower", () => {
    const w = makeWorkout({
      session_label: "long_run",
      avg_hr: 140,
      started_at: "2025-04-10T12:00:00.000Z",
    });
    const f = runFindings([w], [w], { observedMaxHr: 200 });
    expect(f.some((x) => x.title === "Long run pace ties easy runs")).toBe(false);
  });

  it("does NOT fire for non-long-run with high HR", () => {
    const w = makeWorkout({
      session_label: "tempo",
      avg_hr: 170,
      started_at: "2025-04-10T12:00:00.000Z",
    });
    const f = runFindings([w], [w], { observedMaxHr: 200 });
    expect(f.some((x) => x.title === "Long run pace ties easy runs")).toBe(false);
  });

  it("does NOT fire when avg_hr is null", () => {
    const w = makeWorkout({
      session_label: "long_run",
      avg_hr: null,
      started_at: "2025-04-10T12:00:00.000Z",
    });
    const f = runFindings([w], [w], { observedMaxHr: 200 });
    expect(f.some((x) => x.title === "Long run pace ties easy runs")).toBe(false);
  });

  it("does NOT fire when observedMaxHr is 0", () => {
    const w = makeWorkout({
      session_label: "long_run",
      avg_hr: 170,
      started_at: "2025-04-10T12:00:00.000Z",
    });
    const f = runFindings([w], [w], { observedMaxHr: 0 });
    expect(f.some((x) => x.title === "Long run pace ties easy runs")).toBe(false);
  });
});

describe("Rule 5: Low cadence on intervals", () => {
  it("fires Low when avg_cadence = 155", () => {
    const w = makeWorkout({
      session_label: "interval",
      avg_cadence: 155,
      started_at: "2025-04-10T12:00:00.000Z",
    });
    const f = runFindings([w], [w], {});
    expect(f.some((x) => x.title === "Low cadence on intervals")).toBe(true);
    expect(f.find((x) => x.title === "Low cadence on intervals")?.severity).toBe(
      "Low",
    );
  });

  it("fires when avg_cadence = 159", () => {
    const w = makeWorkout({
      session_label: "interval",
      avg_cadence: 159,
      started_at: "2025-04-10T12:00:00.000Z",
    });
    const f = runFindings([w], [w], {});
    expect(f.some((x) => x.title === "Low cadence on intervals")).toBe(true);
  });

  it("does NOT fire when avg_cadence = 160", () => {
    const w = makeWorkout({
      session_label: "interval",
      avg_cadence: 160,
      started_at: "2025-04-10T12:00:00.000Z",
    });
    const f = runFindings([w], [w], {});
    expect(f.some((x) => x.title === "Low cadence on intervals")).toBe(false);
  });

  it("does NOT fire when avg_cadence = 180", () => {
    const w = makeWorkout({
      session_label: "interval",
      avg_cadence: 180,
      started_at: "2025-04-10T12:00:00.000Z",
    });
    const f = runFindings([w], [w], {});
    expect(f.some((x) => x.title === "Low cadence on intervals")).toBe(false);
  });

  it("does NOT fire when avg_cadence is null", () => {
    const w = makeWorkout({
      session_label: "interval",
      avg_cadence: null,
      started_at: "2025-04-10T12:00:00.000Z",
    });
    const f = runFindings([w], [w], {});
    expect(f.some((x) => x.title === "Low cadence on intervals")).toBe(false);
  });

  it("does NOT fire for easy run with low cadence", () => {
    const w = makeWorkout({
      session_label: "easy",
      avg_cadence: 150,
      started_at: "2025-04-10T12:00:00.000Z",
    });
    const f = runFindings([w], [w], {});
    expect(f.some((x) => x.title === "Low cadence on intervals")).toBe(false);
  });
});

describe("Rule 6: Strength close to a quality run", () => {
  const neutralIntensity = makeIntensity({ pctEasy: 80, totalRunningSeconds: 3600 });

  function interferenceFindings(
    strengthStart: string,
    strengthDurSec: number,
    qualityStart: string,
    qualityLabel: "interval" | "tempo" = "interval",
  ) {
    const strength: WorkoutForRules = {
      sport_type: "strength",
      session_label: "strength",
      started_at: strengthStart,
      duration_seconds: strengthDurSec,
      avg_hr: null,
      avg_cadence: null,
    };
    const quality: WorkoutForRules = {
      sport_type: "run",
      session_label: qualityLabel,
      started_at: qualityStart,
      duration_seconds: 3600,
      avg_hr: 170,
      avg_cadence: 170,
    };
    const extended = [strength, quality];
    return runFindings([], extended, {
      intensity: neutralIntensity,
      load: makeLoad({ loadRatio: 1 }),
    });
  }

  it("fires High ~1h before interval", () => {
    const f = interferenceFindings(
      "2025-04-10T10:00:00.000Z",
      3600,
      "2025-04-10T12:00:00.000Z",
    );
    const hit = f.find((x) => x.title === "Strength close to a quality run");
    expect(hit?.severity).toBe("High");
  });

  it("fires High ~2h before tempo", () => {
    const f = interferenceFindings(
      "2025-04-10T09:00:00.000Z",
      3600,
      "2025-04-10T12:00:00.000Z",
      "tempo",
    );
    const hit = f.find((x) => x.title === "Strength close to a quality run");
    expect(hit?.severity).toBe("High");
  });

  it("fires Medium ~4h before interval", () => {
    const f = interferenceFindings(
      "2025-04-10T08:00:00.000Z",
      3600,
      "2025-04-10T13:00:00.000Z",
    );
    const hit = f.find((x) => x.title === "Strength close to a quality run");
    expect(hit?.severity).toBe("Medium");
  });

  it("fires Medium ~5.9h before tempo", () => {
    const f = interferenceFindings(
      "2025-04-10T06:00:00.000Z",
      3600,
      "2025-04-10T12:54:00.000Z",
      "tempo",
    );
    const hit = f.find((x) => x.title === "Strength close to a quality run");
    expect(hit?.severity).toBe("Medium");
  });

  it("does NOT fire ~6.1h before interval", () => {
    const f = interferenceFindings(
      "2025-04-10T06:00:00.000Z",
      3600,
      "2025-04-10T13:06:00.000Z",
    );
    expect(f.some((x) => x.title === "Strength close to a quality run")).toBe(false);
  });

  it("does NOT fire ~7h before interval", () => {
    const f = interferenceFindings(
      "2025-04-10T06:00:00.000Z",
      3600,
      "2025-04-10T14:00:00.000Z",
    );
    expect(f.some((x) => x.title === "Strength close to a quality run")).toBe(false);
  });

  it("does NOT fire when quality run is before strength ends", () => {
    const strength: WorkoutForRules = {
      sport_type: "strength",
      session_label: "strength",
      started_at: "2025-04-10T12:00:00.000Z",
      duration_seconds: 3600,
      avg_hr: null,
      avg_cadence: null,
    };
    const quality: WorkoutForRules = {
      sport_type: "run",
      session_label: "interval",
      started_at: "2025-04-10T10:00:00.000Z",
      duration_seconds: 3600,
      avg_hr: 170,
      avg_cadence: 170,
    };
    const f = runFindings([], [quality, strength], {
      intensity: neutralIntensity,
      load: makeLoad({ loadRatio: 1 }),
    });
    expect(f.some((x) => x.title === "Strength close to a quality run")).toBe(false);
  });

  it("does NOT fire when following run is easy", () => {
    const withInterval = interferenceFindings(
      "2025-04-10T10:00:00.000Z",
      3600,
      "2025-04-10T12:00:00.000Z",
    );
    const neutralIntensity = makeIntensity({ pctEasy: 80, totalRunningSeconds: 3600 });
    const easyInstead = runFindings(
      [],
      [
        {
          sport_type: "strength",
          session_label: "strength",
          started_at: "2025-04-10T10:00:00.000Z",
          duration_seconds: 3600,
          avg_hr: null,
          avg_cadence: null,
        },
        makeWorkout({
          session_label: "easy",
          started_at: "2025-04-10T12:00:00.000Z",
        }),
      ],
      { intensity: neutralIntensity, load: makeLoad({ loadRatio: 1 }) },
    );
    expect(
      withInterval.some((x) => x.title === "Strength close to a quality run"),
    ).toBe(true);
    expect(
      easyInstead.some((x) => x.title === "Strength close to a quality run"),
    ).toBe(false);
  });
});

describe("Cross-cutting", () => {
  it("sorts findings High → Medium → Low", () => {
    const w = sevenDayStreakWorkouts();
    const f = computeRuleFindings({
      weekWorkouts: w,
      extendedWorkouts: w,
      observedMaxHr: 200,
      intensity: makeIntensity({ pctEasy: 60, totalRunningSeconds: 7200 }),
      load: makeLoad({ loadRatio: 2 }),
      weekStartIso: WEEK_START,
      weekEndExclusiveIso: WEEK_END_EX,
    });
    const order = f.map((x) => x.severity);
    const ranks = order.map((s) =>
      s === "High" ? 0 : s === "Medium" ? 1 : 2,
    );
    const sorted = [...ranks].sort((a, b) => a - b);
    expect(ranks).toEqual(sorted);
  });

  it("empty workouts returns empty findings", () => {
    const f = runFindings([], [], {
      intensity: makeIntensity({ totalRunningSeconds: 0, pctEasy: 0 }),
      load: makeLoad({ loadRatio: null }),
    });
    expect(f).toEqual([]);
  });

  it("multiple rules can fire together", () => {
    const w = [makeWorkout({ started_at: "2025-04-08T12:00:00.000Z" })];
    const f = runFindings(w, w, {
      intensity: makeIntensity({ pctEasy: 60, totalRunningSeconds: 3600 }),
      load: makeLoad({ loadRatio: 1.6 }),
    });
    expect(f.length).toBeGreaterThanOrEqual(2);
    expect(f.some((x) => x.title === "Easy volume below research target")).toBe(true);
    expect(f.some((x) => x.title === "Training load spike")).toBe(true);
  });
});

function sevenDayStreakWorkouts(): WorkoutForRules[] {
  const days = [7, 8, 9, 10, 11, 12, 13];
  return days.map((d) =>
    makeWorkout({
      started_at: `2025-04-${String(d).padStart(2, "0")}T12:00:00.000Z`,
      session_label: "easy",
    }),
  );
}

describe("T03: findings expose contributors", () => {
  it("Rule 1 (easy %) emits Easy/Moderate/Hard contributors", () => {
    const f = runFindings([makeWorkout({})], [], {
      intensity: makeIntensity({
        pctEasy: 55,
        pctModerate: 25,
        pctHard: 20,
        totalRunningSeconds: 3600,
      }),
    });
    const r1 = f.find((x) => x.title === "Easy volume below research target");
    expect(r1).toBeDefined();
    expect(r1!.contributors?.map((c) => c.label)).toEqual([
      "Easy %",
      "Moderate %",
      "Hard %",
    ]);
  });

  it("Rule 2 (load spike) emits load-ratio contributor with bad tone", () => {
    const f = runFindings([makeWorkout({})], [], {
      load: makeLoad({ loadRatio: 1.7, acuteLoad: 200, chronicLoad: 117 }),
    });
    const r2 = f.find((x) => x.title === "Training load spike");
    expect(r2).toBeDefined();
    const ratio = r2!.contributors?.find((c) => c.label === "Load ratio");
    expect(ratio?.tone).toBe("bad");
  });

  it("Rule 3 (consecutive days) emits streak contributor", () => {
    const ws = sevenDayStreakWorkouts();
    const f = runFindings(ws, ws);
    const r3 = f.find((x) => x.title === "Week without a full rest day");
    expect(r3).toBeDefined();
    expect(r3!.contributors?.[0]?.label).toBe("Consecutive training days");
    expect(r3!.contributors?.[0]?.value).toBe("7");
  });

  it("Rule 6 (interference window) emits strength + quality + gap contributors", () => {
    const strength = makeWorkout({
      sport_type: "strength",
      session_label: null,
      started_at: "2025-04-08T08:00:00.000Z",
      duration_seconds: 3000,
      avg_hr: null,
      avg_cadence: null,
    });
    const interval = makeWorkout({
      sport_type: "run",
      session_label: "interval",
      started_at: "2025-04-08T10:00:00.000Z",
      duration_seconds: 2400,
    });
    const f = runFindings([interval], [strength, interval]);
    const r6 = f.find((x) => x.title === "Strength close to a quality run");
    expect(r6).toBeDefined();
    const labels = r6!.contributors?.map((c) => c.label) ?? [];
    expect(labels).toContain("Strength session");
    expect(labels).toContain("Interval run");
    expect(labels).toContain("Gap (hours)");
  });
});
