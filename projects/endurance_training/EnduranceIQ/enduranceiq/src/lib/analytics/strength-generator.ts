import {
  getSessionTemplate,
  type SessionTemplate,
} from "@/lib/data/exercise-library";

/** Minimal run shape for scheduling (avoids circular import with computeWeeklyReportPayload). */
export interface RunForStrengthScheduling {
  sport_type: string;
  session_label: string | null;
  started_at: string;
}

/** Monday = 0 … Sunday = 6 (ISO weekday convention used in scheduling). */
export const WEEKDAY_NAMES_MON0 = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export function mondayBasedWeekday(startedAtIso: string): number {
  const d = new Date(startedAtIso);
  const sun0 = d.getUTCDay();
  return (sun0 + 6) % 7;
}

/**
 * Avoid the calendar day *before* each quality or long run (residual fatigue /
 * interference window before hard running — see architecture Part 4).
 */
export function recommendStrengthDays(runsWeek: RunForStrengthScheduling[]): {
  recommendedDays: number[];
  avoidDays: number[];
  reason: string;
} {
  const qualityRunDays: number[] = [];
  const longRunDays: number[] = [];

  for (const s of runsWeek) {
    if (s.sport_type !== "run") continue;
    const wd = mondayBasedWeekday(s.started_at);
    if (s.session_label === "interval" || s.session_label === "tempo") {
      qualityRunDays.push(wd);
    }
    if (s.session_label === "long_run") {
      longRunDays.push(wd);
    }
  }

  const blocked = new Set<number>();
  for (const qd of qualityRunDays) {
    blocked.add((qd + 6) % 7);
  }
  for (const ld of longRunDays) {
    blocked.add((ld + 6) % 7);
  }

  const available: number[] = [];
  for (let d = 0; d < 7; d += 1) {
    if (!blocked.has(d)) available.push(d);
  }

  const recommendedDays = available.slice(0, 2);
  const avoidDays = [...blocked].sort((a, b) => a - b);

  const reason =
    "Placed after quality runs or on easy days. Strength immediately before a hard or long run can blunt running performance for several hours (Fyfe et al., 2014).";

  return { recommendedDays, avoidDays, reason };
}

export function selectSessionTemplate(input: {
  loadRatio: number | null;
  raceDateIso: string | null | undefined;
  /** End of the report week (exclusive boundary minus 1 ms is fine). */
  referenceMs: number;
  lastSessionId: SessionTemplate["id"] | null;
}): SessionTemplate {
  const { loadRatio, raceDateIso, referenceMs, lastSessionId } = input;

  let raceMs: number | null = null;
  if (raceDateIso && /^\d{4}-\d{2}-\d{2}/.test(raceDateIso)) {
    raceMs = Date.parse(raceDateIso.slice(0, 10) + "T23:59:59.999Z");
    if (!Number.isFinite(raceMs)) raceMs = null;
  }

  const weeksToRace =
    raceMs != null
      ? Math.floor((raceMs - referenceMs) / (7 * 86400000))
      : null;

  if (weeksToRace != null && weeksToRace >= 0 && weeksToRace <= 3) {
    return getSessionTemplate("C");
  }

  if (loadRatio != null && loadRatio > 1.3) {
    return getSessionTemplate("C");
  }

  if (loadRatio != null && loadRatio < 0.8) {
    return getSessionTemplate("A");
  }

  if (lastSessionId === "A") return getSessionTemplate("B");
  return getSessionTemplate("A");
}

function formatDayList(days: number[]): string {
  if (days.length === 0) return "";
  const names = days.map((d) => WEEKDAY_NAMES_MON0[d]);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} or ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, or ${names[names.length - 1]}`;
}

function buildWhySessionParagraph(input: {
  template: SessionTemplate;
  loadRatio: number | null;
  loadStatusWord: string;
  weeksToRace: number | null;
  /** Prior week's stored session — drives A/B alternation copy only. */
  priorSessionId: SessionTemplate["id"] | null;
}): string {
  const {
    template,
    loadRatio,
    loadStatusWord,
    weeksToRace,
    priorSessionId,
  } = input;

  if (template.id === "C") {
    if (weeksToRace != null && weeksToRace >= 0 && weeksToRace <= 3) {
      return `Your race is within three weeks, so the plan stays at maintenance: keep neuromuscular habits without adding heavy fatigue before taper.`;
    }
    if (loadRatio != null && loadRatio > 1.3) {
      return `Training load is elevated (ratio ${loadRatio.toFixed(2)}). A shorter maintenance strength block limits stacked stress while you absorb running volume.`;
    }
    return `This week calls for a lighter strength dose to manage total training stress.`;
  }

  const ratioBit =
    loadRatio != null
      ? `Load ratio is ${loadRatio.toFixed(2)} (${loadStatusWord.toLowerCase()}).`
      : `Load baseline is still settling — alternating full sessions is reasonable.`;

  if (template.id === "A") {
    if (loadRatio != null && loadRatio < 0.8) {
      return `${ratioBit} Running volume is relatively low, so a full lower-body block fits well this week.`;
    }
    if (priorSessionId === "B") {
      return `${ratioBit} Alternating from Session B last week — lower-body emphasis this week.`;
    }
    return `${ratioBit} Lower-body strength supports economy and tissue resilience for running.`;
  }

  if (priorSessionId === "A") {
    return `${ratioBit} Alternating from Session A last week — upper-body and core emphasis this week.`;
  }
  return `${ratioBit} Upper-body and core work supports posture and stiffness management without loading legs heavily every week.`;
}

/** Persisted JSON shape for `weekly_analyses.strength_recommendation`. */
export interface StrengthRecommendationRecord {
  session_id: SessionTemplate["id"];
  recommended_days: number[];
  avoid_days: number[];
  scheduling_reason: string;
  scheduling_summary: string;
  why_session: string;
  load_condition: "taper" | "high_load" | "low_load" | "normal";
}

export interface StrengthRecommendationModel {
  template: SessionTemplate;
  recommendedDays: number[];
  avoidDays: number[];
  schedulingReason: string;
  /** Single readable line for the card, e.g. "Tuesday or Thursday — after quality runs, not before." */
  schedulingSummary: string;
  whySession: string;
  record: StrengthRecommendationRecord;
}

export function buildStrengthRecommendation(input: {
  runsWeek: RunForStrengthScheduling[];
  loadRatio: number | null;
  loadStatusWord: string;
  raceDateIso: string | null | undefined;
  referenceMs: number;
  lastSessionId: SessionTemplate["id"] | null;
}): StrengthRecommendationModel {
  const {
    runsWeek,
    loadRatio,
    loadStatusWord,
    raceDateIso,
    referenceMs,
    lastSessionId,
  } = input;

  const sched = recommendStrengthDays(runsWeek);

  let raceMs: number | null = null;
  if (raceDateIso && /^\d{4}-\d{2}-\d{2}/.test(raceDateIso)) {
    raceMs = Date.parse(raceDateIso.slice(0, 10) + "T23:59:59.999Z");
    if (!Number.isFinite(raceMs)) raceMs = null;
  }
  const weeksToRace =
    raceMs != null
      ? Math.floor((raceMs - referenceMs) / (7 * 86400000))
      : null;

  const template = selectSessionTemplate({
    loadRatio,
    raceDateIso,
    referenceMs,
    lastSessionId,
  });

  const taper = weeksToRace != null && weeksToRace >= 0 && weeksToRace <= 3;
  const highLoad = loadRatio != null && loadRatio > 1.3;
  const priorForCopy =
    taper || highLoad ? null : lastSessionId;

  const schedulingSummaryParts: string[] = [];
  if (sched.recommendedDays.length > 0) {
    schedulingSummaryParts.push(
      `Recommended on ${formatDayList(sched.recommendedDays)} — after quality runs where possible, not the day before hard or long runs.`,
    );
  } else {
    schedulingSummaryParts.push(
      "No ideal gap surfaced from this week's run labels — default to easy or rest days away from your next quality session.",
    );
  }
  if (sched.avoidDays.length > 0) {
    schedulingSummaryParts.push(
      `Avoid ${formatDayList(sched.avoidDays)} for heavy lifting — day before key running stimuli.`,
    );
  }

  const schedulingSummary = schedulingSummaryParts.join(" ");

  let load_condition: StrengthRecommendationRecord["load_condition"] =
    "normal";
  if (taper) load_condition = "taper";
  else if (highLoad) load_condition = "high_load";
  else if (loadRatio != null && loadRatio < 0.8) load_condition = "low_load";

  const whySession = buildWhySessionParagraph({
    template,
    loadRatio,
    loadStatusWord,
    weeksToRace,
    priorSessionId: priorForCopy,
  });

  const record: StrengthRecommendationRecord = {
    session_id: template.id,
    recommended_days: sched.recommendedDays,
    avoid_days: sched.avoidDays,
    scheduling_reason: sched.reason,
    scheduling_summary: schedulingSummary,
    why_session: whySession,
    load_condition,
  };

  return {
    template,
    recommendedDays: sched.recommendedDays,
    avoidDays: sched.avoidDays,
    schedulingReason: sched.reason,
    schedulingSummary,
    whySession,
    record,
  };
}

export function parseStrengthRecord(
  raw: unknown,
): StrengthRecommendationRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const sid = o.session_id;
  if (sid !== "A" && sid !== "B" && sid !== "C") return null;
  const rd = o.recommended_days;
  const ad = o.avoid_days;
  if (!Array.isArray(rd) || !Array.isArray(ad)) return null;
  const scheduling_reason =
    typeof o.scheduling_reason === "string" ? o.scheduling_reason : "";
  const scheduling_summary =
    typeof o.scheduling_summary === "string" ? o.scheduling_summary : "";
  const why_session =
    typeof o.why_session === "string" ? o.why_session : "";
  const lc = o.load_condition;
  const load_condition =
    lc === "taper" ||
    lc === "high_load" ||
    lc === "low_load" ||
    lc === "normal"
      ? lc
      : "normal";
  return {
    session_id: sid,
    recommended_days: rd.filter((n): n is number => typeof n === "number"),
    avoid_days: ad.filter((n): n is number => typeof n === "number"),
    scheduling_reason,
    scheduling_summary,
    why_session,
    load_condition,
  };
}

/** Rehydrate UI model from stored JSON + exercise library. */
export function modelFromStrengthRecord(
  rec: StrengthRecommendationRecord,
): StrengthRecommendationModel {
  const template = getSessionTemplate(rec.session_id);
  return {
    template,
    recommendedDays: rec.recommended_days,
    avoidDays: rec.avoid_days,
    schedulingReason: rec.scheduling_reason,
    schedulingSummary: rec.scheduling_summary,
    whySession: rec.why_session,
    record: rec,
  };
}
