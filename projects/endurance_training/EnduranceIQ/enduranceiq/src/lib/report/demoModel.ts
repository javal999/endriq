import type { WeeklyReportModel } from "@/lib/report/model";
import { formatWeekRangeLabel, weekRangeUTC, addDaysIsoMonday } from "@/lib/report/date";
import { buildStrengthRecommendation } from "@/lib/analytics/strength-generator";

/** Static weekly report matching home / prototype sample numbers. */
export function buildDemoWeeklyReport(weekStart: string): WeeklyReportModel {
  const { endExclusiveIso } = weekRangeUTC(weekStart);
  const referenceMs = Date.parse(endExclusiveIso) - 1;
  const demoRuns = [
    {
      sport_type: "run",
      session_label: "easy",
      started_at: `${addDaysIsoMonday(weekStart, 0)}T12:00:00.000Z`,
    },
    {
      sport_type: "run",
      session_label: "interval",
      started_at: `${addDaysIsoMonday(weekStart, 2)}T12:00:00.000Z`,
    },
    {
      sport_type: "run",
      session_label: "easy",
      started_at: `${addDaysIsoMonday(weekStart, 4)}T12:00:00.000Z`,
    },
    {
      sport_type: "run",
      session_label: "long_run",
      started_at: `${addDaysIsoMonday(weekStart, 5)}T12:00:00.000Z`,
    },
  ];
  const strength = buildStrengthRecommendation({
    runsWeek: demoRuns,
    loadRatio: 1.03,
    loadStatusWord: "Normal",
    raceDateIso: null,
    referenceMs,
    lastSessionId: null,
  });

  const intensityExplanation =
    "Hard sessions dominate HR drift this sample week: easy-labelled runs average above typical aerobic ceilings versus observed max HR. Expect findings below to echo polarisation imbalance rather than session-by-session coaching directives.";

  const sessionExplanations: Record<string, string> = {
    "demo-w-0":
      "Labelled easy but cardiac averages sit high versus your ceiling band—treat pace as negotiable until drift settles.",
    "demo-w-1":
      "Strength stimulus logged without conflicting HR targets for endurance lanes this window.",
    "demo-w-2":
      "Intervals sit intentionally hard; verify spacing versus adjacent strength before judging interference.",
    "demo-w-3": "Second strength touchpoint—check sequencing versus tomorrow's intention if legs feel flat.",
    "demo-w-4":
      "Repeated easy-run drift upward suggests systemic pacing bias rather than a single bad day.",
    "demo-w-5":
      "Long effort edges moderate-hard—review cumulative fatigue when paired with inverted easy percentage.",
  };

  return {
    weekRangeLabel: formatWeekRangeLabel(weekStart),
    summary: {
      distanceKm: "41.3",
      distanceMeta: "+4% vs last week · −2% vs month avg",
      sessions: 6,
      sessionsMeta: "Same as last week",
      totalTimeLabel: "4h 52m",
      totalTimeMeta: "+12 min vs last week",
      loadWord: "Normal",
      loadRatio: "1.03",
      loadMeta: "+3% vs 4-week avg",
      loadTone: "good",
    },
    intensity: {
      pctEasy: 0,
      pctMod: 45,
      pctHard: 55,
      verdict: "bad",
      observedMaxHr: 194,
      z2CeilingHr: 145,
    },
    sessions: [
      {
        workoutId: "demo-w-0",
        dateShort: "Mon 5",
        typeLabel: "Easy run",
        distanceLabel: "8.2 km",
        hrLabel: "157 bpm",
        statusLabel: "Too hard",
        tone: "bad",
      },
      {
        workoutId: "demo-w-1",
        dateShort: "Tue 6",
        typeLabel: "Strength",
        distanceLabel: "—",
        hrLabel: "—",
        statusLabel: "Good",
        tone: "good",
      },
      {
        workoutId: "demo-w-2",
        dateShort: "Wed 7",
        typeLabel: "Intervals",
        distanceLabel: "6.5 km",
        hrLabel: "174 bpm",
        statusLabel: "Good",
        tone: "good",
      },
      {
        workoutId: "demo-w-3",
        dateShort: "Thu 8",
        typeLabel: "Strength",
        distanceLabel: "—",
        hrLabel: "—",
        statusLabel: "Good",
        tone: "good",
      },
      {
        workoutId: "demo-w-4",
        dateShort: "Fri 9",
        typeLabel: "Easy run",
        distanceLabel: "10.1 km",
        hrLabel: "162 bpm",
        statusLabel: "Too hard",
        tone: "bad",
      },
      {
        workoutId: "demo-w-5",
        dateShort: "Sat 10",
        typeLabel: "Long run",
        distanceLabel: "16.5 km",
        hrLabel: "167 bpm",
        statusLabel: "Watch",
        tone: "warn",
      },
    ],
    findings: [
      {
        severity: "High",
        tone: "bad",
        title: "Intensity distribution inverted",
        body: "0% of running time in Zone 1–2 this week. Target distribution is 80% easy / 10% moderate / 10% hard.",
        citations: [
          {
            label: "Seiler (2010)",
            href: "https://doi.org/10.2165/11530080-000000000-00000",
          },
          {
            label: "Stöggl & Sperlich (2014)",
            href: "https://doi.org/10.3389/fphys.2014.00033",
          },
        ],
        confidence: "Confidence: High — consistent pattern across recent weeks",
        evidenceStrength: "Strong",
      },
      {
        severity: "Medium",
        tone: "warn",
        title: "Strength before quality run",
        body: "Tuesday strength was 18 hours before Wednesday intervals. Outside the 6-hour acute window; consider separating further when possible.",
        citations: [
          {
            label: "Fyfe et al. (2014)",
            href: "https://doi.org/10.1007/s40279-013-0131-5",
          },
          {
            label: "Wilson et al. (2012)",
            href: "https://doi.org/10.1519/JSC.0b013e3182429f27",
          },
        ],
        confidence: "Confidence: Moderate — borderline timing",
        evidenceStrength: "Moderate",
      },
    ],
    llm: {
      weeklyNarrativeFromApi: true,
      weeklySections: {
        wentWell:
          "Training volume stayed consistent with six logged touches including two strength slots—good adherence.",
        needsWork:
          "Polarisation is inverted: HR drift shows almost no time in the easy bucket despite easy-labelled runs. Strength precedes intervals within a day—watch cumulative fatigue.",
        nextWeek:
          "Bias genuinely easy aerobic volume, separate lifting from key runs where logistics allow, and re-check drift after one recovery-forward microcycle.",
      },
      intensityExplanation,
      sessionExplanations,
    },
    strength,
  };
}
