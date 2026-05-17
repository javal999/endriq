import type { SupabaseClient } from "@supabase/supabase-js";
import { isAthleteUuid } from "@/lib/enduranceiq/isAthleteUuid";
import { createAdminClient } from "@/lib/supabase/admin";
import { intensityFromRuns } from "@/lib/analytics/intensityDistribution";
import { computeLoadMetrics } from "@/lib/analytics/trainingLoad";
import {
  distanceLabel,
  hrLabel,
  sessionHrStatus,
  sessionTypeLabel,
} from "@/lib/analytics/sessionDisplay";
import { computeRuleFindings } from "@/lib/analytics/rulesEngine";
import { computeIntensityV2 } from "@/lib/analytics/intensityV2";
import { detectRunningPatterns } from "@/lib/analytics/runningPatterns";
import type { WeeklyReportModel } from "@/lib/report/model";
import {
  addDaysIsoMonday,
  formatDuration,
  formatWeekRangeLabel,
  shortSessionDate,
  weekRangeUTC,
} from "@/lib/report/date";
import {
  shareSnapshotFromModel,
  type ShareCardSnapshot,
} from "@/lib/report/shareCard";
import type { LlmWeeklyBundle } from "@/lib/llm/types";
import {
  buildStrengthRecommendation,
  parseStrengthRecord,
  type StrengthRecommendationRecord,
} from "@/lib/analytics/strength-generator";

export interface WorkoutRow {
  id?: string;
  /** `strava`, `csv_coros`, `csv_garmin`, `manual`, etc. */
  source?: string | null;
  sport_type: string;
  session_label: string | null;
  started_at: string;
  duration_seconds: number;
  distance_meters: number | string | null;
  avg_hr: number | null;
  max_hr: number | null;
  avg_cadence: number | null;
  training_stress: number | string | null;
  /** T10: per-km HR buckets when Strava streams are present. */
  hr_per_km?: {
    km: Array<{
      km_index: number;
      avg_hr: number;
      max_hr: number;
      duration_sec: number;
      pace_sec_per_km: number;
    }>;
  } | null;
}

export interface WeeklyAnalysisUpsert {
  athlete_id: string;
  week_start: string;
  total_distance_meters: number;
  total_duration_seconds: number;
  total_sessions: number;
  running_sessions: number;
  strength_sessions: number;
  pct_zone1_2: number;
  pct_zone3: number;
  pct_zone4_5: number;
  acute_load: number | null;
  chronic_load: number | null;
  load_ratio: number | null;
  findings: WeeklyReportModel["findings"];
  prev_week_distance: number | null;
  prev_week_load: number | null;
  month_avg_distance: number | null;
  month_avg_load: number | null;
  data_sources: string[];
  llm_weekly_analysis?: string | null;
  llm_intensity_explanation?: string | null;
  llm_session_statuses?:
    | Array<{ workout_id: string; explanation: string }>
    | null;
  llm_weekly_from_api?: boolean;
  strength_recommendation?: StrengthRecommendationRecord | null;
  // Intensity v2 shadow columns
  pct_load_z1_2?: number | null;
  pct_load_z3?: number | null;
  pct_load_z4_5?: number | null;
  intensity_v2_meta?: Record<string, unknown> | null;
}

export interface WeeklyReportPayload {
  model: WeeklyReportModel;
  analysisRow: WeeklyAnalysisUpsert;
  shareCard: ShareCardSnapshot;
  llmBundle: LlmWeeklyBundle | null;
}

function inferObservedMaxHr(
  athleteMax: number | null,
  runs: { max_hr: number | null }[],
): number {
  if (athleteMax != null && athleteMax > 0) return athleteMax;
  let m = 0;
  for (const r of runs) {
    if (r.max_hr != null && r.max_hr > m) m = r.max_hr;
  }
  if (m > 0) return m;
  return 185;
}

export function sumDistanceRunBike(ws: WorkoutRow[]): number {
  let s = 0;
  for (const w of ws) {
    if (w.sport_type !== "run" && w.sport_type !== "bike") continue;
    const dm = w.distance_meters;
    if (dm == null) continue;
    const n = typeof dm === "number" ? dm : Number(dm);
    if (Number.isFinite(n)) s += n;
  }
  return s;
}

export function stressSum(ws: WorkoutRow[]): number {
  let s = 0;
  for (const w of ws) {
    const raw = w.training_stress;
    if (raw == null) continue;
    const n = typeof raw === "number" ? raw : Number(raw);
    if (Number.isFinite(n)) s += n;
  }
  return s;
}

export function pctDelta(cur: number, prev: number): string | null {
  if (prev <= 0) return null;
  const p = Math.round(((cur - prev) / prev) * 100);
  const sign = p > 0 ? "+" : "";
  return `${sign}${p}%`;
}

function approxWeeksOfData(all: WorkoutRow[]): number {
  const weekStarts = new Set<string>();
  for (const w of all) {
    const d = new Date(w.started_at);
    const day = d.getUTCDay();
    const diff = (day + 6) % 7;
    const mon = new Date(d);
    mon.setUTCDate(d.getUTCDate() - diff);
    weekStarts.add(mon.toISOString().slice(0, 10));
  }
  return Math.max(1, weekStarts.size);
}

function avgEasyRunHrWeek(weekWorkouts: WorkoutRow[]): number | null {
  const easyRuns = weekWorkouts.filter(
    (w) =>
      w.sport_type === "run" &&
      /easy|recovery|aerobic|zone\s*2|z2/i.test(w.session_label ?? ""),
  );
  const hrs = easyRuns
    .map((w) => w.avg_hr)
    .filter((n): n is number => n != null && n > 0);
  if (!hrs.length) return null;
  return Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length);
}

function interferenceSnippet(findings: WeeklyReportModel["findings"]): {
  detected: boolean;
  snippet: string;
} {
  const hit = findings.find(
    (f) =>
      /strength/i.test(f.title) &&
      /hour|before|after|close|within|acute/i.test(f.body),
  );
  return hit
    ? { detected: true, snippet: `${hit.title}: ${hit.body.slice(0, 260)}` }
    : { detected: false, snippet: "" };
}

function stableWorkoutKey(w: WorkoutRow, athleteId: string): string {
  if (typeof w.id === "string" && w.id.trim()) return w.id.trim();
  return `pending:${athleteId}:${w.started_at}:${w.sport_type}`;
}

/** Distinct workout sources for the ISO week (sorted); defaults to `manual` when unknown. */
export function deriveWeekDataSources(weekWorkouts: WorkoutRow[]): string[] {
  const raw = weekWorkouts.map((w) =>
    typeof w.source === "string" ? w.source.trim() : "",
  );
  const uniq = [...new Set(raw.filter(Boolean))].sort();
  return uniq.length > 0 ? uniq : ["manual"];
}

function workoutsInIsoWeek(
  all: WorkoutRow[],
  isoMonday: string,
): WorkoutRow[] {
  const { startIso, endExclusiveIso } = weekRangeUTC(isoMonday);
  const startMs = Date.parse(startIso);
  const endMs = Date.parse(endExclusiveIso);
  return all.filter((w) => {
    const t = new Date(w.started_at).getTime();
    return t >= startMs && t < endMs;
  });
}

function intensityVerdict(
  i: ReturnType<typeof intensityFromRuns>,
): "good" | "warn" | "bad" {
  if (i.totalRunningSeconds <= 120) return "good";
  if (i.pctEasy < 70) return "bad";
  if (i.pctEasy < 80 || i.pctHard > 20) return "warn";
  return "good";
}

/**
 * Pure aggregation from fetched rows (integration tests + share/admin callers).
 * `lastStrengthSessionId` comes from prior week's stored recommendation or null.
 */
export function assembleWeeklyReportPayload(input: {
  athleteId: string;
  weekStart: string;
  startIso: string;
  endExclusiveIso: string;
  weekStartMs: number;
  weekEndExclusiveMs: number;
  athlete: Record<string, unknown>;
  allWorkouts: WorkoutRow[];
  /** @deprecated v2 uses pattern-driven selection; this param is ignored. */
  lastStrengthSessionId?: "A" | "B" | "C" | null;
}): WeeklyReportPayload {
  const {
    athleteId,
    weekStart,
    startIso,
    endExclusiveIso,
    weekStartMs,
    weekEndExclusiveMs,
    athlete,
    allWorkouts: all,
    lastStrengthSessionId,
  } = input;

  const weekWorkouts = all.filter((w) => {
    const t = new Date(w.started_at).getTime();
    return t >= weekStartMs && t < weekEndExclusiveMs;
  });

  const runsWeek = weekWorkouts.filter((w) => w.sport_type === "run");
  const observedMaxHr = inferObservedMaxHr(
    typeof athlete.observed_max_hr === "number" ? athlete.observed_max_hr : null,
    runsWeek.map((w) => ({ max_hr: w.max_hr })),
  );

  const intensity = intensityFromRuns(
    runsWeek.map((w) => ({
      duration_seconds: w.duration_seconds,
      avg_hr: w.avg_hr,
    })),
    observedMaxHr,
  );

  // Shadow: TRIMP-weighted dual metric (not shown in UI yet — promote in Phase 1.4)
  const ar3 = athlete as { hr_rest?: number | null; sex?: string | null };
  const intensityV2 = computeIntensityV2(
    runsWeek.map((w) => ({
      duration_seconds: w.duration_seconds,
      avg_hr: w.avg_hr,
    })),
    observedMaxHr,
    typeof ar3.hr_rest === "number" ? ar3.hr_rest : null,
    (ar3.sex === "male" || ar3.sex === "female" || ar3.sex === "other")
      ? ar3.sex
      : null,
  );

  const load = computeLoadMetrics(all, weekEndExclusiveMs);

  const prevWeekStart = addDaysIsoMonday(weekStart, -7);
  const prevWeekWorkouts = workoutsInIsoWeek(all, prevWeekStart);

  const goalRaceDate =
    (athlete as { goal_race_date?: string | null }).goal_race_date ?? null;

  const referenceMs = weekEndExclusiveMs - 1;
  const loadWordForStrength =
    load.statusWord === "—" ? "Normal" : load.statusWord;

  // Strength recommendation is built after findings (pattern detection needs them)
  // — initialized below after computeRuleFindings

  const distM = sumDistanceRunBike(weekWorkouts);
  const prevDistM = sumDistanceRunBike(prevWeekWorkouts);
  const distKm = distM / 1000;
  const prevDistKm = prevDistM / 1000;

  let sumWeekDist = 0;
  let sumWeekStress = 0;
  for (let i = 1; i <= 4; i += 1) {
    const mon = addDaysIsoMonday(weekStart, -7 * i);
    const ws = workoutsInIsoWeek(all, mon);
    sumWeekDist += sumDistanceRunBike(ws);
    sumWeekStress += stressSum(ws);
  }
  const monthAvgDistM = sumWeekDist / 4;
  const monthAvgLoadVal = sumWeekStress / 4;
  const monthAvgKm = monthAvgDistM / 1000;

  const distDelta = pctDelta(distKm, prevDistKm);
  const distVsMonth = pctDelta(distKm, monthAvgKm);
  const distanceMetaParts = [
    distDelta != null ? `${distDelta} vs last week` : "First week on record",
    distVsMonth != null ? `${distVsMonth} vs 4-wk avg` : "Need prior weeks for 4-wk avg",
  ];
  const distanceMeta = distanceMetaParts.join(" · ");

  const totalDur = weekWorkouts.reduce((s, w) => s + w.duration_seconds, 0);
  const prevDur = prevWeekWorkouts.reduce((s, w) => s + w.duration_seconds, 0);
  const durDelta = pctDelta(totalDur, prevDur);

  let sumDurPrior = 0;
  for (let i = 1; i <= 4; i += 1) {
    const mon = addDaysIsoMonday(weekStart, -7 * i);
    const ws = workoutsInIsoWeek(all, mon);
    sumDurPrior += ws.reduce((s, w) => s + w.duration_seconds, 0);
  }
  const monthAvgDur = sumDurPrior / 4;
  const durVsMonth = pctDelta(totalDur, monthAvgDur);
  const totalTimeMetaParts = [
    durDelta != null ? `${durDelta} vs last week` : "Baseline establishing",
    durVsMonth != null ? `${durVsMonth} vs 4-wk avg` : null,
  ].filter(Boolean) as string[];
  const totalTimeMeta = totalTimeMetaParts.join(" · ");

  const sessionsDelta =
    weekWorkouts.length !== prevWeekWorkouts.length
      ? `${prevWeekWorkouts.length} sessions last week`
      : "Same count as last week";

  let avgSessionsPrior = 0;
  for (let i = 1; i <= 4; i += 1) {
    avgSessionsPrior += workoutsInIsoWeek(
      all,
      addDaysIsoMonday(weekStart, -7 * i),
    ).length;
  }
  avgSessionsPrior /= 4;
  const sessVsMonth =
    avgSessionsPrior > 0
      ? pctDelta(weekWorkouts.length, avgSessionsPrior)
      : null;
  const sessionsMetaParts = [
    sessionsDelta,
    sessVsMonth != null ? `${sessVsMonth} vs 4-wk avg sessions` : null,
  ].filter(Boolean) as string[];
  const sessionsMeta = sessionsMetaParts.join(" · ");

  let loadMeta = "Need ~4 prior weeks of runs with HR for baseline";
  if (load.chronicLoad != null && load.chronicLoad > 0 && load.loadRatio != null) {
    const rel = Math.round((load.loadRatio - 1) * 100);
    const sign = rel > 0 ? "+" : "";
    const vsMonthLoad =
      monthAvgLoadVal > 0 && load.acuteLoad != null
        ? pctDelta(load.acuteLoad, monthAvgLoadVal)
        : null;
    loadMeta = `${sign}${rel}% vs 4-week baseline`;
    if (vsMonthLoad != null) loadMeta += ` · ${vsMonthLoad} vs 4-wk avg stress`;
  }

  const findings = computeRuleFindings({
    weekWorkouts,
    extendedWorkouts: all,
    observedMaxHr,
    intensity,
    load,
    weekStartIso: startIso,
    weekEndExclusiveIso: endExclusiveIso,
  });

  const interference = interferenceSnippet(findings);

  // Pattern detection + strength recommendation (findings now in scope)
  const patterns = detectRunningPatterns({
    weekWorkouts,
    load,
    intensityV2,
    raceDateIso: goalRaceDate,
    referenceMs,
    findings,
  });

  const strengthRecommendation = buildStrengthRecommendation({
    runsWeek,
    loadRatio: load.loadRatio,
    loadStatusWord: loadWordForStrength,
    raceDateIso: goalRaceDate,
    referenceMs,
    primaryPattern: patterns.primary,
  });

  const ceilingRaw = (athlete as { estimated_zone2_ceiling?: number | null })
    .estimated_zone2_ceiling;
  const z2CeilingHr =
    ceilingRaw != null && Number(ceilingRaw) > 0
      ? Number(ceilingRaw)
      : Math.round(observedMaxHr * 0.75);

  const sortedWeekForLedger = [...weekWorkouts].sort(
    (a, b) =>
      new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
  );

  const sessions = sortedWeekForLedger.map((w) => {
    const st = sessionHrStatus(w, observedMaxHr);
    return {
      workoutId: stableWorkoutKey(w, athleteId),
      dateShort: shortSessionDate(w.started_at),
      startedAtIso: w.started_at,
      typeLabel: sessionTypeLabel(w),
      distanceLabel: distanceLabel(w),
      hrLabel: hrLabel(w.avg_hr),
      statusLabel: st.label,
      tone: st.tone,
    };
  });

  const emptyWeek = weekWorkouts.length === 0;

  const ar2 = athlete as {
    hr_rest?: number | null;
    sex?: string | null;
    goal_race_type?: string | null;
  };
  const hrRestMissing = ar2.hr_rest == null;
  const raceDateMissing = goalRaceDate == null;

  const missingProfileFields: string[] = [];
  if (ar2.hr_rest == null) missingProfileFields.push("hr_rest");
  if (!ar2.sex) missingProfileFields.push("sex");
  if (
    ar2.goal_race_type &&
    ar2.goal_race_type !== "general_fitness" &&
    !goalRaceDate
  ) {
    missingProfileFields.push("goal_race_date");
  }
  if (!(athlete as { goal_weekly_km?: unknown }).goal_weekly_km) {
    missingProfileFields.push("goal_weekly_km");
  }
  if (
    !(athlete as { observed_max_hr?: unknown }).observed_max_hr
  ) {
    missingProfileFields.push("observed_max_hr");
  }

  const model: WeeklyReportModel = {
    weekRangeLabel: formatWeekRangeLabel(weekStart),
    emptyWeek,
    hrRestMissing,
    raceDateMissing,
    missingProfileFields,
    strengthOptIn: Boolean((athlete as { strength_recommendations_optin?: unknown }).strength_recommendations_optin),
    roastEnabled: Boolean((athlete as { roast_enabled?: unknown }).roast_enabled),
    persona: (() => {
      const p = (athlete as { persona?: unknown }).persona;
      return p === "coached" || p === "hybrid" || p === "self_coached"
        ? p
        : "self_coached";
    })(),
    summary: {
      distanceKm: emptyWeek ? "—" : distKm.toFixed(1),
      distanceMeta,
      sessions: weekWorkouts.length,
      sessionsMeta,
      totalTimeLabel: emptyWeek ? "—" : formatDuration(totalDur),
      totalTimeMeta,
      loadWord: load.statusWord,
      loadRatio:
        load.loadRatio != null ? load.loadRatio.toFixed(2) : null,
      loadMeta,
      loadTone: load.tone,
    },
    intensity: {
      pctEasy: intensity.pctEasy,
      pctMod: intensity.pctModerate,
      pctHard: intensity.pctHard,
      verdict: intensityVerdict(intensity),
      observedMaxHr,
      z2CeilingHr,
    },
    sessions,
    findings,
    strength: strengthRecommendation,
  };

  const prevWeekLoad = stressSum(prevWeekWorkouts);

  const analysisRow: WeeklyAnalysisUpsert = {
    athlete_id: athleteId,
    week_start: weekStart,
    total_distance_meters: distM,
    total_duration_seconds: totalDur,
    total_sessions: weekWorkouts.length,
    running_sessions: runsWeek.length,
    strength_sessions: weekWorkouts.filter((w) => w.sport_type === "strength")
      .length,
    pct_zone1_2: intensity.pctEasy / 100,
    pct_zone3: intensity.pctModerate / 100,
    pct_zone4_5: intensity.pctHard / 100,
    acute_load: load.acuteLoad,
    chronic_load: load.chronicLoad,
    load_ratio: load.loadRatio,
    findings,
    prev_week_distance: prevDistM > 0 ? prevDistM : null,
    prev_week_load: prevWeekLoad > 0 ? prevWeekLoad : null,
    month_avg_distance: monthAvgDistM > 0 ? monthAvgDistM : null,
    month_avg_load: monthAvgLoadVal > 0 ? monthAvgLoadVal : null,
    data_sources: deriveWeekDataSources(weekWorkouts),
    strength_recommendation: strengthRecommendation.record,
    // Intensity v2 shadow — stored but not shown in UI until Phase 1.4 promotion
    pct_load_z1_2: intensityV2.pctEasyLoad / 100,
    pct_load_z3: intensityV2.pctModerateLoad / 100,
    pct_load_z4_5: intensityV2.pctHardLoad / 100,
    intensity_v2_meta: {
      model: intensityV2.modelUsed,
      total_trimp: intensityV2.totalTrimp,
      warnings: intensityV2.warnings,
    },
  };

  const ar = athlete as {
    goal_race_type?: string | null;
    goal_race_date?: string | null;
    goal_weekly_km?: number | string | null;
  };
  const rawGoalKm = ar.goal_weekly_km;
  const goalWeeklyKm =
    rawGoalKm != null && Number.isFinite(Number(rawGoalKm))
      ? Number(rawGoalKm)
      : null;

  const findingsText = findings
    .map(
      (f) =>
        `- [${f.severity}] ${f.title}: ${f.body.slice(0, 420)}`,
    )
    .join("\n");

  // Prior sessions (before this week) — for recent_same_type comparison
  const priorWorkouts = all
    .filter((w) => new Date(w.started_at).getTime() < weekStartMs)
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

  const ledgerRows = sortedWeekForLedger.map((w) => {
    const st = sessionHrStatus(w, observedMaxHr);
    const dm = w.distance_meters;
    let distanceKm: number | null = null;
    if (
      dm != null &&
      (w.sport_type === "run" || w.sport_type === "bike")
    ) {
      const n = typeof dm === "number" ? dm : Number(dm);
      if (Number.isFinite(n)) distanceKm = Math.round((n / 1000) * 100) / 100;
    }

    // Attach up to 3 recent same-label sessions for LLM comparison
    const recentSameType = priorWorkouts
      .filter((p) => p.session_label === w.session_label && p.sport_type === w.sport_type)
      .slice(0, 3)
      .map((p) => {
        const pd = p.distance_meters;
        const pdKm =
          pd != null && Number.isFinite(Number(pd))
            ? Math.round((Number(pd) / 1000) * 100) / 100
            : null;
        return {
          started_at: p.started_at,
          distance_km: pdKm,
          avg_hr: p.avg_hr,
        };
      });

    return {
      workout_id: stableWorkoutKey(w, athleteId),
      started_at: w.started_at,
      sport_type: w.sport_type,
      session_label: w.session_label,
      distance_km: distanceKm,
      avg_hr: w.avg_hr,
      status_label: st.label,
      status_tone: st.tone,
      recent_same_type: recentSameType.length > 0 ? recentSameType : undefined,
    };
  });

  const sessionsText = ledgerRows
    .map(
      (r) =>
        `${r.started_at.slice(0, 10)} ${r.sport_type} ${r.distance_km ?? "—"}km avg_hr:${r.avg_hr ?? "—"} ${r.status_label} (${r.status_tone})`,
    )
    .join("\n");

  let llmBundle: LlmWeeklyBundle | null = null;
  if (!emptyWeek && ledgerRows.length > 0) {
    llmBundle = {
      athleteId,
      weekStart,
      goalRaceType: ar.goal_race_type ?? null,
      goalRaceDate: ar.goal_race_date ?? null,
      goalWeeklyKm,
      weeksOfDataApprox: approxWeeksOfData(all),
      totalDistanceKm: distKm,
      prevWeekDistanceKm: prevDistKm,
      monthAvgDistanceKm: monthAvgKm,
      runningSessions: runsWeek.length,
      strengthSessions: weekWorkouts.filter((w) => w.sport_type === "strength")
        .length,
      totalTimeMinutes: Math.max(1, Math.round(totalDur / 60)),
      pctEasy: intensity.pctEasy,
      pctModerate: intensity.pctModerate,
      pctHard: intensity.pctHard,
      loadRatio: load.loadRatio,
      loadStatusWord: load.statusWord,
      maxHr: observedMaxHr,
      z2Ceiling: z2CeilingHr,
      sessionsText,
      findingsText,
      interferenceDetected: interference.detected,
      interferenceSnippet: interference.snippet,
      avgEasyRunHr: avgEasyRunHrWeek(weekWorkouts),
      sessionLedgerJson: JSON.stringify(ledgerRows),
      workoutIds: ledgerRows.map((r) => r.workout_id),
      preferredLocale:
        typeof (athlete as { preferred_locale?: unknown }).preferred_locale === "string"
          ? ((athlete as { preferred_locale: string }).preferred_locale)
          : "en",
      roastEnabled: Boolean((athlete as { roast_enabled?: unknown }).roast_enabled),
    };
  }

  const shareCard = shareSnapshotFromModel(model);

  return { model, analysisRow, shareCard, llmBundle };
}

/**
 * Fetch workouts, compute weekly report model, DB upsert row, and share snapshot.
 * Pass `db` from `@/lib/supabase/server` `createClient()` for user sessions (RLS).
 * Omit `db` (or pass admin client) for webhooks and OG share renders without a session.
 */
export async function computeWeeklyReportPayload(
  athleteId: string,
  weekStart: string,
  db: SupabaseClient = createAdminClient(),
): Promise<WeeklyReportPayload> {
  if (!isAthleteUuid(athleteId)) {
    throw new Error("Invalid athlete id");
  }

  const { startIso, endExclusiveIso } = weekRangeUTC(weekStart);
  const weekStartMs = Date.parse(startIso);
  const weekEndExclusiveMs = Date.parse(endExclusiveIso);
  if (!Number.isFinite(weekStartMs) || !Number.isFinite(weekEndExclusiveMs)) {
    throw new Error("Invalid weekStart");
  }

  const { data: athlete, error: athErr } = await db
    .from("athletes")
    .select(
      "id, observed_max_hr, goal_race_type, goal_race_date, goal_weekly_km, estimated_zone2_ceiling, hr_rest, sex, preferred_locale, strength_recommendations_optin, roast_enabled, persona",
    )
    .eq("id", athleteId)
    .maybeSingle();

  if (athErr) throw athErr;
  if (!athlete) throw new Error("Athlete not found");

  const fetchStartMs = weekEndExclusiveMs - 35 * 86400000;
  const fetchStartIso = new Date(fetchStartMs).toISOString();

  const { data: rows, error: wErr } = await db
    .from("workouts")
    .select(
      "id, source, sport_type, session_label, started_at, duration_seconds, distance_meters, avg_hr, max_hr, avg_cadence, training_stress, hr_per_km",
    )
    .eq("athlete_id", athleteId)
    .gte("started_at", fetchStartIso)
    .lt("started_at", endExclusiveIso)
    .order("started_at", { ascending: true });

  if (wErr) throw wErr;

  const all = (rows ?? []) as WorkoutRow[];

  const prevWeekStart = addDaysIsoMonday(weekStart, -7);

  // Fetch up to 8 weeks of trend data for sparklines
  const { data: trendRows } = await db
    .from("weekly_analyses")
    .select("week_start, total_distance_meters, acute_load, pct_zone1_2")
    .eq("athlete_id", athleteId)
    .lte("week_start", weekStart)
    .order("week_start", { ascending: false })
    .limit(8);

  const payload = await assembleWeeklyReportPayload({
    athleteId,
    weekStart,
    startIso,
    endExclusiveIso,
    weekStartMs,
    weekEndExclusiveMs,
    athlete: athlete as Record<string, unknown>,
    allWorkouts: all,
  });

  // Attach trend data to model when ≥3 weeks available
  if (trendRows && trendRows.length >= 3) {
    const trend = [...trendRows]
      .reverse()
      .map((r) => ({
        weekStart: String(r.week_start),
        distanceKm: typeof r.total_distance_meters === "number"
          ? Math.round(r.total_distance_meters / 100) / 10
          : 0,
        acuteLoad: typeof r.acute_load === "number" ? Math.round(r.acute_load) : 0,
        pctZone1_2: typeof r.pct_zone1_2 === "number" ? Math.round(r.pct_zone1_2 * 100) : 0,
      }));
    payload.model = { ...payload.model, trend };
  }

  return payload;
}
