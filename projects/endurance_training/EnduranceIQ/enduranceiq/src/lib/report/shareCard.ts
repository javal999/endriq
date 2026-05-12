import type { WeeklyReportModel } from "@/lib/report/model";
import { formatDuration, formatWeekRangeLabel } from "@/lib/report/date";

/** Aggregate-only snapshot for OG share cards (no raw HR). */
export interface ShareCardSnapshot {
  weekRangeLabel: string;
  distanceKmLabel: string;
  sessions: number;
  totalTimeLabel: string;
  pctEasy: number;
  pctMod: number;
  pctHard: number;
  loadWord: string;
  headline: string;
}

/** Persisted `weekly_analyses` row subset for share PNG. */
export interface WeeklyAnalysisShareDbRow {
  week_start: string;
  total_distance_meters: number | string | null;
  total_duration_seconds: number | string | null;
  total_sessions: number | string | null;
  pct_zone1_2: number | string | null;
  pct_zone3: number | string | null;
  pct_zone4_5: number | string | null;
  load_ratio: number | string | null;
  findings: unknown;
}

export function headlineFromFindings(findings: { title: string }[]): string {
  const h = findings[0]?.title?.trim();
  if (h) return clampHeadline(h);
  return "Weekly training summary — intensity and load at a glance.";
}

function clampHeadline(s: string, max = 96): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

export function loadWordFromRatio(loadRatio: number | null): string {
  if (loadRatio == null || !Number.isFinite(loadRatio)) return "—";
  if (loadRatio > 1.5) return "Spike";
  if (loadRatio > 1.3) return "Elevated";
  if (loadRatio < 0.8) return "Low";
  return "Normal";
}

function pctFromFraction(v: number | string | null): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/** Share card fields derived from a saved weekly analysis row. */
export function shareSnapshotFromAnalysisRow(
  row: WeeklyAnalysisShareDbRow,
): ShareCardSnapshot {
  const findings = Array.isArray(row.findings)
    ? (row.findings as { title: string }[])
    : [];
  const meters =
    row.total_distance_meters != null ? Number(row.total_distance_meters) : 0;
  const km = meters / 1000;
  const distanceKmLabel =
    meters <= 0 ? "—" : `${km >= 10 ? km.toFixed(0) : km.toFixed(1)} km`;

  const dur =
    row.total_duration_seconds != null ? Number(row.total_duration_seconds) : 0;
  const totalTimeLabel =
    dur > 0 ? formatDuration(Math.round(dur)) : "—";

  const lrRaw = row.load_ratio != null ? Number(row.load_ratio) : null;
  const lr =
    lrRaw != null && Number.isFinite(lrRaw) ? lrRaw : null;

  return {
    weekRangeLabel: formatWeekRangeLabel(row.week_start),
    distanceKmLabel,
    sessions:
      row.total_sessions != null ? Number(row.total_sessions) : 0,
    totalTimeLabel,
    pctEasy: pctFromFraction(row.pct_zone1_2),
    pctMod: pctFromFraction(row.pct_zone3),
    pctHard: pctFromFraction(row.pct_zone4_5),
    loadWord: meters <= 0 && dur <= 0 ? "—" : loadWordFromRatio(lr),
    headline: headlineFromFindings(findings),
  };
}

/** Share card fields from the weekly HTML report model. */
export function shareSnapshotFromModel(model: WeeklyReportModel): ShareCardSnapshot {
  const lrParsed =
    model.summary.loadRatio != null && model.summary.loadRatio !== ""
      ? Number.parseFloat(model.summary.loadRatio)
      : null;
  const lr =
    lrParsed != null && Number.isFinite(lrParsed) ? lrParsed : null;

  const distKm =
    model.summary.distanceKm === "—"
      ? NaN
      : Number.parseFloat(model.summary.distanceKm);
  const distanceKmLabel =
    model.emptyWeek || !Number.isFinite(distKm)
      ? "—"
      : `${distKm >= 10 ? distKm.toFixed(0) : distKm.toFixed(1)} km`;

  return {
    weekRangeLabel: model.weekRangeLabel,
    distanceKmLabel,
    sessions: model.summary.sessions,
    totalTimeLabel: model.summary.totalTimeLabel,
    pctEasy: model.intensity.pctEasy,
    pctMod: model.intensity.pctMod,
    pctHard: model.intensity.pctHard,
    loadWord: model.emptyWeek ? "—" : loadWordFromRatio(lr),
    headline: headlineFromFindings(model.findings),
  };
}
