/**
 * F8 — run interpretation engine.
 *
 * Pure function. Given a parsed coach instruction + the athlete's history
 * slice, produces concrete pace / HR / RPE / cue / confidence outputs.
 *
 * Inputs:
 *   - ParsedIntent from parseCoachInstruction (T04)
 *   - AthleteHistorySlice from analytics/types (T01)
 *   - Options: feature flag toggles (T01)
 *
 * Outputs are deliberately ranges, not point estimates — the PRD §5.1 tone
 * rule is "never declarative."
 *
 * The function is pure-compute (no I/O, no Date.now leakage); p95 latency
 * should sit well under 50ms (PRD AC7: <300ms input-blur-to-render including
 * the parser and React render).
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.1; PHASE-2.0-BUILD.md T05.
 */

import type {
  ConflictNote,
  ParsedIntent,
  WorkoutBlock,
} from "./parseCoachInstruction";
import type { AthleteHistorySlice } from "./types";
import {
  RPE_ZONE_TABLE,
  rowForLabel,
  rowForRpe,
  type CanonicalLabel,
  type IntensityBand,
  type RpeZoneRow,
} from "@/lib/data/rpeZoneTranslation";
import {
  inferVdotFromRace,
  paceRangeForVdot,
  type DanielsPaceZone,
} from "@/lib/data/danielsVdot";
import type { CitationId } from "@/lib/data/citations";

export type InterpretConfidence = "high" | "moderate" | "low" | "calibrating";

export interface InterpretedRun {
  /** Pace range in seconds per km, [fast, slow]. Null when no pace can be inferred. */
  paceRange: [number, number] | null;
  /** HR range in bpm, [low, high]. Null when HRmax is missing/invalid. */
  hrRange: [number, number] | null;
  /** Canonical CR10 RPE anchor (single value, not a range, for display). */
  rpeAnchor: number;
  /** Localisation-ready cue key from RPE_ZONE_TABLE; resolved by the caller. */
  conversationalCue: string;
  /** Confidence pill state per PRD §5.1. */
  confidence: InterpretConfidence;
  /** Citation IDs supporting this interpretation. Resolved by EvidenceCitation. */
  methodologyCitationIds: CitationId[];
  /** Daniels zone derived from the intent. UI may colour-band by this. */
  danielsZone: RpeZoneRow["danielsZone"];
  /** Intensity band — useful for icon/colour selection. */
  intensityBand: IntensityBand;
  /** Echo of any conflicts surfaced by the parser. */
  conflicts: ReadonlyArray<ConflictNote>;
  /** Structured workout block for interval-style sessions. */
  structure: WorkoutBlock | null;
  /** Why a given confidence was chosen — useful for UI explainers / tests. */
  confidenceReasons: string[];
}

export interface InterpretRunOptions {
  /** F8.4 personal-calibration feature flag. */
  personalCalibrationEnabled?: boolean;
}

const SECONDS_IN_WEEK = 7 * 24 * 60 * 60;

/**
 * Pick the row in the RPE/zone table that best fits the parsed intent.
 *
 * Priority (PRD §5.1 "numeric > label"):
 *   1. Explicit RPE (single value or range)
 *   2. Canonical label from the parser
 *   3. Pace (mapped via crude band heuristic)
 *   4. HR (mapped via Z-zone heuristic — covered if hrTarget is the only signal)
 *
 * Returns null only when no signal is present (parsedIntent.intent ===
 * "unknown" never reaches here).
 */
function pickIntentRow(
  intent: Extract<ParsedIntent, { intent: "run" }>,
): RpeZoneRow | null {
  if (intent.rpe != null) {
    const v = Array.isArray(intent.rpe) ? (intent.rpe[0] + intent.rpe[1]) / 2 : intent.rpe;
    const r = rowForRpe(v);
    if (r) return r;
  }
  if (intent.label) {
    return rowForLabel(intent.label as CanonicalLabel);
  }
  if (intent.paceTarget) {
    const mid = (intent.paceTarget[0] + intent.paceTarget[1]) / 2;
    // Mirror the heuristic in parseCoachInstruction.bandForPace, but return the row.
    if (mid < 240) return RPE_ZONE_TABLE[4]; // hard / interval
    if (mid < 300) return RPE_ZONE_TABLE[3]; // tempo
    if (mid < 360) return RPE_ZONE_TABLE[2]; // moderate
    if (mid < 420) return RPE_ZONE_TABLE[1]; // easy
    return RPE_ZONE_TABLE[0]; // very_easy
  }
  if (intent.hrTarget) {
    // Without a HRmax, we can't band an absolute bpm. Default to moderate row.
    return RPE_ZONE_TABLE[2];
  }
  return null;
}

/**
 * HR range from row + athlete physiology.
 *   - Karvonen reserve: hr = hrRest + pct × (hrMax - hrRest)
 *   - %HRmax fallback:  hr = pct × hrMax
 */
function hrRangeFromRow(
  row: RpeZoneRow,
  hrMax: number,
  hrRest: number | null,
): [number, number] {
  if (hrRest != null) {
    const [lo, hi] = row.hrPctHrrRange;
    return [
      Math.round(hrRest + lo * (hrMax - hrRest)),
      Math.round(hrRest + hi * (hrMax - hrRest)),
    ];
  }
  const [lo, hi] = row.hrPctMaxRange;
  return [Math.round(lo * hrMax), Math.round(hi * hrMax)];
}

/** Map intensity band → Daniels pace zone for VDOT lookups. */
function danielsPaceZoneForBand(band: IntensityBand): DanielsPaceZone {
  switch (band) {
    case "very_easy":
    case "easy":
      return "E";
    case "moderate":
      return "M";
    case "tempo":
      return "T";
    case "hard":
    case "max":
      return "I";
  }
}

/**
 * Pace range from a recent race PR via Daniels VDOT.
 * Returns null when the PR is missing/invalid.
 */
function paceRangeFromVdot(
  pr: AthleteHistorySlice["recentRacePr"],
  band: IntensityBand,
): [number, number] | null {
  if (!pr) return null;
  const vdot = inferVdotFromRace(pr.distanceKm, pr.timeSec);
  if (vdot == null) return null;
  return paceRangeForVdot(vdot, danielsPaceZoneForBand(band));
}

/**
 * Apply personal calibration: when ≥4 weeks of completed workouts share the
 * same canonical label, narrow the HR range toward the athlete's observed
 * mean ± 1 SD.
 *
 * Returns the narrowed range when applicable, else the original.
 */
function applyPersonalCalibration(
  hrRange: [number, number],
  label: CanonicalLabel | null,
  slice: AthleteHistorySlice,
  enabled: boolean,
): { range: [number, number]; narrowed: boolean } {
  if (!enabled || !label) return { range: hrRange, narrowed: false };

  // Map canonical label to the workout session_label tag used in our schema.
  const labelTokensInData = labelToSessionLabelTokens(label);

  const sessionsWithHr = slice.recentWorkouts.filter(
    (w) =>
      w.avg_hr != null &&
      w.session_label != null &&
      labelTokensInData.has(w.session_label),
  );

  if (sessionsWithHr.length < 4) return { range: hrRange, narrowed: false };

  // ≥4 weeks of presence — check the date span of these sessions covers ≥4 weeks.
  const sorted = [...sessionsWithHr].sort(
    (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
  );
  const spanSec =
    (new Date(sorted[sorted.length - 1].started_at).getTime() -
      new Date(sorted[0].started_at).getTime()) /
    1000;
  if (spanSec < 4 * SECONDS_IN_WEEK) return { range: hrRange, narrowed: false };

  // Mean ± SD of avg_hr.
  const hrs = sortedHrs(sessionsWithHr);
  const mean = hrs.reduce((s, h) => s + h, 0) / hrs.length;
  const variance = hrs.reduce((s, h) => s + (h - mean) ** 2, 0) / hrs.length;
  const sd = Math.sqrt(variance);

  const narrowedLow = Math.round(Math.max(hrRange[0], mean - sd));
  const narrowedHigh = Math.round(Math.min(hrRange[1], mean + sd));

  // Guard: refuse to narrow into an inverted/empty range.
  if (narrowedHigh - narrowedLow < 5) return { range: hrRange, narrowed: false };

  return { range: [narrowedLow, narrowedHigh], narrowed: true };
}

function sortedHrs(sessions: AthleteHistorySlice["recentWorkouts"]): number[] {
  const hrs: number[] = [];
  for (const s of sessions) {
    if (s.avg_hr != null) hrs.push(s.avg_hr);
  }
  return hrs;
}

/** Map canonical parser label → session_label tokens used on workouts. */
function labelToSessionLabelTokens(label: CanonicalLabel): Set<string> {
  switch (label) {
    case "easy":
      return new Set(["easy_run", "easy", "z2_run"]);
    case "long":
      return new Set(["long_run", "long"]);
    case "tempo":
      return new Set(["tempo", "threshold"]);
    case "interval":
      return new Set(["interval", "intervals", "vo2"]);
    case "moderate":
      return new Set(["marathon_pace", "steady"]);
    case "recovery":
      return new Set(["recovery", "shakeout"]);
    case "drill":
      return new Set(["drill", "drills"]);
    case "strides":
      return new Set(["strides"]);
  }
}

function pickConfidence(
  slice: AthleteHistorySlice,
  hrMax: number | null,
  hrRest: number | null,
  pr: AthleteHistorySlice["recentRacePr"] | undefined,
  narrowedByCalibration: boolean,
): { confidence: InterpretConfidence; reasons: string[] } {
  const reasons: string[] = [];
  if (hrMax == null) {
    reasons.push("HRmax missing — falling back to label/RPE descriptors only");
    return { confidence: "low", reasons };
  }
  const hasHrRest = hrRest != null;
  const hasPr = !!pr;
  const fourWeeksOfHistory = slice.recentWorkouts.length >= 12; // ≥3 sessions/wk × 4 weeks

  if (slice.recentWorkouts.length === 0) {
    reasons.push("no completed sessions yet — calibrating personal baseline");
    return { confidence: "calibrating", reasons };
  }

  if (hasHrRest && hasPr && fourWeeksOfHistory) {
    if (narrowedByCalibration) reasons.push("narrowed by ≥4 weeks of matching-label history");
    else reasons.push("HRmax, HRrest, recent PR and ≥4 weeks of history all present");
    return { confidence: "high", reasons };
  }

  if (hasHrRest || hasPr) {
    if (!hasHrRest) reasons.push("HRrest missing — using %HRmax instead of Karvonen");
    if (!hasPr) reasons.push("no recent race PR — pace ranges widen");
    if (!fourWeeksOfHistory) reasons.push("less than 4 weeks of history");
    return { confidence: "moderate", reasons };
  }

  reasons.push("only HRmax present — wide ranges; consider adding HRrest + a race time");
  return { confidence: "low", reasons };
}

export function interpretRun(
  parsedIntent: ParsedIntent,
  slice: AthleteHistorySlice,
  options: InterpretRunOptions = {},
): InterpretedRun | { error: string; raw: string } {
  if (parsedIntent.intent === "unknown") {
    return { error: parsedIntent.reason, raw: parsedIntent.raw };
  }

  const row = pickIntentRow(parsedIntent);
  if (!row) {
    return { error: "no signal in parsed intent", raw: parsedIntent.raw };
  }

  const hrMax = slice.observedMaxHr;
  const hrRest = slice.hrRest;

  // PRD §5.1 error matrix: HRmax outside 120-220 → no interpretation rendered.
  if (hrMax != null && (hrMax < 120 || hrMax > 220)) {
    return {
      error: `max HR ${hrMax} is outside the normal range (120-220). Re-measure or update in Settings.`,
      raw: parsedIntent.raw,
    };
  }

  // HR range — null only when HRmax is missing entirely.
  const rawHr = hrMax != null ? hrRangeFromRow(row, hrMax, hrRest) : null;

  const calibrationOutcome = rawHr
    ? applyPersonalCalibration(
        rawHr,
        parsedIntent.label as CanonicalLabel | null,
        slice,
        options.personalCalibrationEnabled === true,
      )
    : { range: null, narrowed: false };

  const hrRange = calibrationOutcome.range;

  // Pace range — VDOT preferred; else heuristic widening based on the band.
  const vdotPace = paceRangeFromVdot(slice.recentRacePr, row.intensityBand);
  let paceRange: [number, number] | null = vdotPace;
  if (!paceRange && parsedIntent.paceTarget) {
    // Echo the explicit pace from the input.
    paceRange = parsedIntent.paceTarget;
  }

  // RPE anchor: midpoint of the row's RPE range, biased toward the explicit
  // parser value if any.
  const rpeAnchor =
    parsedIntent.rpe != null
      ? Array.isArray(parsedIntent.rpe)
        ? (parsedIntent.rpe[0] + parsedIntent.rpe[1]) / 2
        : parsedIntent.rpe
      : (row.rpeMin + row.rpeMax) / 2;

  const { confidence, reasons } = pickConfidence(
    slice,
    hrMax,
    hrRest,
    slice.recentRacePr,
    calibrationOutcome.narrowed,
  );

  return {
    paceRange,
    hrRange,
    rpeAnchor,
    conversationalCue: row.conversationalCue,
    confidence,
    methodologyCitationIds: [...row.citationIds],
    danielsZone: row.danielsZone,
    intensityBand: row.intensityBand,
    conflicts: parsedIntent.conflicts,
    structure: parsedIntent.structure ?? null,
    confidenceReasons: reasons,
  };
}
