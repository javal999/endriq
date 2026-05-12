import { describe, expect, it } from "vitest";
import { computeLoadMetrics } from "@/lib/analytics/trainingLoad";
import {
  assembleWeeklyReportPayload,
  deriveWeekDataSources,
  type WorkoutRow,
} from "@/lib/report/computeWeeklyReportPayload";
import { weekRangeUTC } from "@/lib/report/date";

const athleteBase = {
  observed_max_hr: 194,
  goal_race_type: "marathon",
  goal_race_date: "2026-09-01",
  goal_weekly_km: 45,
  estimated_zone2_ceiling: 155,
};

function mkRun(
  overrides: Partial<WorkoutRow> & Pick<WorkoutRow, "started_at">,
): WorkoutRow {
  return {
    sport_type: "run",
    session_label: "easy",
    duration_seconds: 3600,
    distance_meters: 10000,
    avg_hr: 140,
    max_hr: 155,
    avg_cadence: 170,
    training_stress: 40,
    source: "strava",
    ...overrides,
  };
}

describe("deriveWeekDataSources", () => {
  it("sorts unique sources", () => {
    expect(
      deriveWeekDataSources([
        mkRun({
          started_at: "2026-05-06T10:00:00Z",
          source: "strava",
        }),
        mkRun({
          started_at: "2026-05-06T12:00:00Z",
          source: "csv_garmin",
        }),
        mkRun({
          started_at: "2026-05-07T12:00:00Z",
          source: "strava",
        }),
      ]),
    ).toEqual(["csv_garmin", "strava"]);
  });

  it("falls back to manual when week has no sources", () => {
    expect(deriveWeekDataSources([])).toEqual(["manual"]);
  });
});

describe("assembleWeeklyReportPayload", () => {
  const weekStart = "2026-05-04";
  const { startIso, endExclusiveIso } = weekRangeUTC(weekStart);
  const weekStartMs = Date.parse(startIso);
  const weekEndExclusiveMs = Date.parse(endExclusiveIso);

  it("produces intensity percentages that sum to 100", () => {
    const all: WorkoutRow[] = [
      mkRun({
        started_at: "2026-05-06T10:00:00Z",
        avg_hr: 130,
        duration_seconds: 3600,
      }),
      mkRun({
        started_at: "2026-05-06T18:00:00Z",
        avg_hr: 170,
        duration_seconds: 1800,
      }),
    ];
    const { model } = assembleWeeklyReportPayload({
      athleteId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      weekStart,
      startIso,
      endExclusiveIso,
      weekStartMs,
      weekEndExclusiveMs,
      athlete: athleteBase,
      allWorkouts: all,
      lastStrengthSessionId: null,
    });
    const sum =
      model.intensity.pctEasy + model.intensity.pctMod + model.intensity.pctHard;
    expect(sum).toBe(100);
  });

  it("matches load ratio from computeLoadMetrics at week end", () => {
    const anchor = weekEndExclusiveMs - 1;
    const all: WorkoutRow[] = [];
    for (let i = 0; i < 40; i++) {
      const t = new Date(anchor - i * 86400000).toISOString();
      all.push(
        mkRun({
          started_at: t,
          training_stress: 50,
          duration_seconds: 3600,
          avg_hr: 140,
        }),
      );
    }
    const { analysisRow } = assembleWeeklyReportPayload({
      athleteId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      weekStart,
      startIso,
      endExclusiveIso,
      weekStartMs,
      weekEndExclusiveMs,
      athlete: athleteBase,
      allWorkouts: all,
      lastStrengthSessionId: null,
    });
    const load = computeLoadMetrics(all, weekEndExclusiveMs);
    expect(analysisRow.acute_load).toBe(load.acuteLoad);
    expect(analysisRow.chronic_load).toBe(load.chronicLoad);
    expect(analysisRow.load_ratio).toBe(load.loadRatio);
  });

  it("includes strength recommendation with session_id A, B, or C", () => {
    const all: WorkoutRow[] = [
      mkRun({
        started_at: "2026-05-06T10:00:00Z",
        duration_seconds: 3600,
        avg_hr: 140,
      }),
    ];
    const { model } = assembleWeeklyReportPayload({
      athleteId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      weekStart,
      startIso,
      endExclusiveIso,
      weekStartMs,
      weekEndExclusiveMs,
      athlete: athleteBase,
      allWorkouts: all,
      lastStrengthSessionId: null,
    });
    expect(model.strength?.record.session_id).toMatch(/^[ABC]$/);
  });

  it("sets emptyWeek when there are no workouts in range", () => {
    const all: WorkoutRow[] = [
      mkRun({
        started_at: "2026-04-01T10:00:00Z",
        source: "strava",
      }),
    ];
    const { model, analysisRow } = assembleWeeklyReportPayload({
      athleteId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      weekStart,
      startIso,
      endExclusiveIso,
      weekStartMs,
      weekEndExclusiveMs,
      athlete: athleteBase,
      allWorkouts: all,
      lastStrengthSessionId: null,
    });
    expect(model.emptyWeek).toBe(true);
    expect(analysisRow.data_sources).toEqual(["manual"]);
  });

  it("data_sources reflects workout sources in-week", () => {
    const all: WorkoutRow[] = [
      mkRun({
        started_at: "2026-05-05T10:00:00Z",
        source: "csv_coros",
      }),
      mkRun({
        started_at: "2026-05-06T10:00:00Z",
        source: "strava",
      }),
    ];
    const { analysisRow } = assembleWeeklyReportPayload({
      athleteId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      weekStart,
      startIso,
      endExclusiveIso,
      weekStartMs,
      weekEndExclusiveMs,
      athlete: athleteBase,
      allWorkouts: all,
      lastStrengthSessionId: null,
    });
    expect(analysisRow.data_sources).toEqual(["csv_coros", "strava"]);
  });

  it("includes findings only when rule conditions are met (easy volume rule)", () => {
    const all: WorkoutRow[] = [
      mkRun({
        started_at: "2026-05-06T10:00:00Z",
        avg_hr: 188,
        duration_seconds: 3600,
      }),
    ];
    const { model } = assembleWeeklyReportPayload({
      athleteId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      weekStart,
      startIso,
      endExclusiveIso,
      weekStartMs,
      weekEndExclusiveMs,
      athlete: athleteBase,
      allWorkouts: all,
      lastStrengthSessionId: null,
    });
    expect(
      model.findings.some((f) => f.title === "Easy volume below research target"),
    ).toBe(true);
  });

  it("computes week-over-week summary deltas when prior week exists", () => {
    const all: WorkoutRow[] = [
      mkRun({
        started_at: "2026-04-28T10:00:00Z",
        distance_meters: 10000,
        duration_seconds: 3600,
      }),
      mkRun({
        started_at: "2026-05-06T10:00:00Z",
        distance_meters: 20000,
        duration_seconds: 7200,
      }),
    ];
    const { model } = assembleWeeklyReportPayload({
      athleteId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      weekStart,
      startIso,
      endExclusiveIso,
      weekStartMs,
      weekEndExclusiveMs,
      athlete: athleteBase,
      allWorkouts: all,
      lastStrengthSessionId: null,
    });
    expect(model.summary.distanceMeta).toMatch(/vs last week/);
  });
});
