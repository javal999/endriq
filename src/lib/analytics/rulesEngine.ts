import type { WeeklyReportModel } from "@/lib/report/model";
import type { LoadMetrics } from "@/lib/analytics/trainingLoad";
import type { IntensityBreakdown } from "@/lib/analytics/intensityDistribution";
import { citationToLink } from "@/lib/data/citations";

export interface WorkoutForRules {
  sport_type: string;
  session_label: string | null;
  started_at: string;
  duration_seconds: number;
  avg_hr: number | null;
  avg_cadence: number | null;
}

function utcDayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Days with at least one workout that is not a pure recovery run day (exclude days where only recovery runs). */
function trainingDayKeys(workouts: WorkoutForRules[]): Set<string> {
  const byDay = new Map<string, WorkoutForRules[]>();
  for (const w of workouts) {
    const k = utcDayKey(w.started_at);
    const arr = byDay.get(k) ?? [];
    arr.push(w);
    byDay.set(k, arr);
  }
  const keys = new Set<string>();
  for (const [day, list] of byDay) {
    const onlyRecoveryRun =
      list.length > 0 &&
      list.every(
        (x) =>
          x.sport_type === "run" && x.session_label === "recovery",
      );
    if (!onlyRecoveryRun) keys.add(day);
  }
  return keys;
}

function maxConsecutiveDayStreak(dayKeys: Set<string>): number {
  if (dayKeys.size === 0) return 0;
  const sorted = [...dayKeys].sort();
  let best = 1;
  let cur = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const curDay = sorted[i];
    const prevMs = Date.parse(`${prev}T12:00:00Z`);
    const curMs = Date.parse(`${curDay}T12:00:00Z`);
    const delta = (curMs - prevMs) / 86400000;
    if (delta === 1) {
      cur += 1;
      best = Math.max(best, cur);
    } else {
      cur = 1;
    }
  }
  return best;
}

export function computeRuleFindings(options: {
  weekWorkouts: WorkoutForRules[];
  extendedWorkouts: WorkoutForRules[];
  observedMaxHr: number;
  intensity: IntensityBreakdown;
  load: LoadMetrics;
  weekStartIso: string;
  weekEndExclusiveIso: string;
}): WeeklyReportModel["findings"] {
  const out: WeeklyReportModel["findings"] = [];

  const weekStartMs = Date.parse(options.weekStartIso);
  const weekEndMs = Date.parse(options.weekEndExclusiveIso);

  // Rule 1 — PHASE-0-BUILD: under 70% easy → high (summary-session HR approximation)
  if (
    options.intensity.totalRunningSeconds > 120 &&
    options.intensity.pctEasy < 70
  ) {
    out.push({
      severity: "High",
      tone: "bad",
      title: "Easy volume below research target",
      body: `${options.intensity.pctEasy}% of running time in Zone 1–2 this week. Polarized training targets roughly 80% easy / 10% moderate / 10% hard.`,
      citations: [
        citationToLink("seiler_2010"),
        citationToLink("stoggl_sperlich_2014"),
      ],
      confidence: "Confidence: High — pattern visible across the week",
      evidenceStrength: "Strong",
    });
  }

  // Rule 2 — load spike
  if (options.load.loadRatio != null && options.load.loadRatio > 1.5) {
    out.push({
      severity: "High",
      tone: "bad",
      title: "Training load spike",
      body: `Load ratio ${options.load.loadRatio.toFixed(2)} (acute vs chronic). Sharp jumps raise injury risk until chronic catches up.`,
      citations: [
        citationToLink("gabbett_2016"),
        citationToLink("hulin_2016"),
      ],
      confidence: "Confidence: High — ratio exceeds consensus spike band",
      evidenceStrength: "Strong",
    });
  } else if (
    options.load.loadRatio != null &&
    options.load.loadRatio > 1.3
  ) {
    out.push({
      severity: "Medium",
      tone: "warn",
      title: "Elevated training load",
      body: `Load ratio ${options.load.loadRatio.toFixed(2)}. Monitor recovery and avoid stacking hard sessions.`,
      citations: [
        citationToLink("windt_2017"),
      ],
      confidence: "Confidence: Moderate",
      evidenceStrength: "Moderate",
    });
  }

  // Rule 3 — consecutive training days
  const inWeek = options.weekWorkouts.filter((w) => {
    const t = new Date(w.started_at).getTime();
    return t >= weekStartMs && t < weekEndMs;
  });
  const streak = maxConsecutiveDayStreak(trainingDayKeys(inWeek));
  // PHASE-0-BUILD: 7+ consecutive days → medium
  if (streak >= 7) {
    out.push({
      severity: "Medium",
      tone: "warn",
      title: "Week without a full rest day",
      body: `${streak} consecutive training days with structured work. Planning easy or rest days supports adaptation.`,
      citations: [
        citationToLink("budgett_1998"),
      ],
      confidence: "Confidence: Moderate — calendar inference only",
      evidenceStrength: "Moderate",
    });
  }

  // Rule 4 — long run HR drift
  const longRuns = inWeek.filter(
    (w) =>
      w.sport_type === "run" &&
      w.session_label === "long_run" &&
      w.avg_hr != null &&
      options.observedMaxHr > 0,
  );
  for (const w of longRuns) {
    const frac = (w.avg_hr as number) / options.observedMaxHr;
    if (frac > 0.8) {
      out.push({
        severity: "Medium",
        tone: "warn",
        title: "Long run pace ties easy runs",
        body:
          "Average HR on the long run sits close to general aerobic efforts. Consider slowing early miles so the last third stays controlled.",
        citations: [
          citationToLink("laursen_2010"),
          // T05-2.1: Lambert (2002) 6% drift threshold. T10 will replace
          // the session-average heuristic above with true per-km drift from
          // Strava streams; until then both sources are cited.
          citationToLink("lambert_2002"),
        ],
        confidence: "Confidence: Moderate — single-session avg HR",
        evidenceStrength: "Moderate",
      });
      break;
    }
  }

  // Rule 5 — turnover on quality (when cadence exists)
  const intervals = inWeek.filter(
    (w) =>
      w.sport_type === "run" &&
      w.session_label === "interval" &&
      w.avg_cadence != null &&
      w.avg_cadence < 160,
  );
  if (intervals.length > 0) {
    out.push({
      severity: "Low",
      tone: "low",
      title: "Low cadence on intervals",
      body:
        "Stride turnover looks low on at least one interval session. Light strides or slight inclines can cue quicker turnover without forcing pace.",
      citations: [
        citationToLink("heiderscheit_2011"),
      ],
      confidence: "Confidence: Low — cadence from vendor summary only",
      evidenceStrength: "Limited",
    });
  }

  // Rule 6 — interference window after lifting
  const sorted = [...options.extendedWorkouts].sort(
    (a, b) =>
      new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
  );
  outer: for (let i = 0; i < sorted.length; i += 1) {
    const s = sorted[i];
    if (s.sport_type !== "strength") continue;
    const strengthEnd =
      new Date(s.started_at).getTime() + s.duration_seconds * 1000;
    for (let j = i + 1; j < sorted.length; j += 1) {
      const q = sorted[j];
      if (q.sport_type !== "run") continue;
      if (q.session_label !== "interval" && q.session_label !== "tempo")
        continue;
      const qs = new Date(q.started_at).getTime();
      const hoursAfter = (qs - strengthEnd) / 3600000;
      if (hoursAfter >= 0 && hoursAfter <= 6) {
        const sev = hoursAfter <= 2 ? "High" : "Medium";
        const tone = hoursAfter <= 2 ? "bad" : "warn";
        out.push({
          severity: sev,
          tone,
          title: "Strength close to a quality run",
          body: `Strength ended ~${hoursAfter.toFixed(1)} hours before a ${q.session_label === "interval" ? "interval" : "tempo"} session. Same-day lifting plus quality running can blunt neuromuscular quality.`,
          citations: [
            citationToLink("fyfe_2014"),
            citationToLink("wilson_2012"),
          ],
          confidence:
            hoursAfter <= 2
              ? "Confidence: High — within acute interference window"
              : "Confidence: Moderate — borderline timing",
          evidenceStrength: hoursAfter <= 2 ? "Strong" : "Moderate",
        });
        break outer;
      }
      if (qs > strengthEnd + 10 * 3600000) break;
    }
  }

  const rank = (s: string) =>
    s === "High" ? 0 : s === "Medium" ? 1 : 2;
  out.sort((a, b) => rank(a.severity) - rank(b.severity));

  return out;
}
