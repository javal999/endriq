/**
 * F8 — CR10 RPE ↔ %HRmax / %HRR / Daniels zone translation table.
 *
 * Single source of truth for the mapping that powers interpretRun (T05).
 * Derived from triangulating Foster 2001 (session-RPE), Eston 2012, Daniels
 * 2014, and Karvonen reserve (Karvonen et al. 1957).
 *
 * Boundaries are intentionally fuzzy — every entry exposes a RANGE for both
 * %HRmax and %HRR, and a list of common coach labels that map to the same
 * intensity band. interpretRun consumes the ranges; the parser consumes
 * `coachLabelAliases` for token recognition.
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.1 + research §1.2; PHASE-2.0-BUILD.md T04.
 */

import type { CitationId } from "@/lib/data/citations";

export type DanielsZone =
  | "recovery"
  | "easy"
  | "steady_marathon"
  | "threshold"
  | "interval"
  | "repetition";

/** Coarse intensity bucket — what every label in this row "feels like". */
export type IntensityBand = "very_easy" | "easy" | "moderate" | "tempo" | "hard" | "max";

export interface RpeZoneRow {
  /** CR10 RPE values this row covers (inclusive at both ends). */
  rpeMin: number;
  rpeMax: number;
  /** %HRmax range as fractions 0-1. */
  hrPctMaxRange: [number, number];
  /** %HRR (Karvonen reserve) as fractions 0-1. */
  hrPctHrrRange: [number, number];
  danielsZone: DanielsZone;
  intensityBand: IntensityBand;
  /**
   * Coach label aliases (lowercased, stripped of punctuation). Both English
   * and Bahasa Indonesia. The parser matches against these tokens.
   */
  coachLabelAliases: ReadonlyArray<string>;
  /** Conversational cue presented to the athlete on the run interpretation panel. */
  conversationalCue: string;
  /** Citations resolvable via lib/data/citations.ts. */
  citationIds: ReadonlyArray<CitationId>;
}

/**
 * Canonical labels exposed by the parser. Both EN and ID tokens reduce to
 * one of these. interpretRun branches on this discriminator.
 */
export type CanonicalLabel =
  | "recovery"
  | "easy"
  | "long"
  | "moderate"
  | "tempo"
  | "interval"
  | "drill"
  | "strides";

/**
 * Token → canonical label dictionary. Lowercased; punctuation-stripped.
 * Bahasa entries are flagged with a // ID comment for grep-ability.
 */
export const LABEL_TOKENS: Readonly<Record<string, CanonicalLabel>> = {
  // recovery
  "recovery": "recovery",
  "shakeout": "recovery",
  "very easy": "recovery",
  "pemulihan": "recovery", // ID
  "santai sekali": "recovery", // ID
  // easy
  "easy": "easy",
  "aerobic": "easy",
  "aerobic base": "easy",
  "base": "easy",
  "z2": "easy",
  "zone 2": "easy",
  "santai": "easy", // ID
  "ringan": "easy", // ID
  // long
  "long": "long",
  "long run": "long",
  "lr": "long",
  // moderate (steady / marathon-pace)
  "moderate": "moderate",
  "steady": "moderate",
  "marathon": "moderate",
  "marathon pace": "moderate",
  "mp": "moderate",
  "sedang": "moderate", // ID
  // tempo / threshold
  "tempo": "tempo",
  "threshold": "tempo",
  "lt": "tempo",
  "lactate threshold": "tempo",
  "intensif": "tempo", // ID — generic "intense" maps closest to tempo
  // interval / VO2max
  "interval": "interval",
  "intervals": "interval",
  "vo2": "interval",
  "vo2max": "interval",
  "kencang": "interval", // ID — "fast/hard"
  // drill
  "drill": "drill",
  "drills": "drill",
  "form": "drill",
  // strides
  "strides": "strides",
  "stride": "strides",
};

/**
 * Canonical label → RPE row mapping. Used by interpretRun to look up the
 * implied RPE/HR/zone when the coach only said "easy".
 */
export const LABEL_TO_RPE_ROW: Readonly<Record<CanonicalLabel, number>> = {
  recovery: 1, // row 0
  easy: 0,
  long: 0,
  moderate: 1,
  tempo: 2,
  interval: 3,
  drill: 0,
  strides: 3,
};

export const RPE_ZONE_TABLE: ReadonlyArray<RpeZoneRow> = [
  {
    rpeMin: 1,
    rpeMax: 2,
    hrPctMaxRange: [0.0, 0.6],
    hrPctHrrRange: [0.0, 0.5],
    danielsZone: "recovery",
    intensityBand: "very_easy",
    coachLabelAliases: ["very easy", "shakeout", "recovery", "pemulihan"],
    conversationalCue: "Full conversation; nasal breathing.",
    citationIds: ["foster_2001", "karvonen_1957"],
  },
  {
    rpeMin: 3,
    rpeMax: 4,
    hrPctMaxRange: [0.6, 0.72],
    hrPctHrrRange: [0.5, 0.65],
    danielsZone: "easy",
    intensityBand: "easy",
    coachLabelAliases: ["easy", "z2", "zone 2", "aerobic base", "santai", "ringan"],
    conversationalCue: "Full conversation possible.",
    citationIds: ["foster_2001", "karvonen_1957", "seiler_2010"],
  },
  {
    rpeMin: 5,
    rpeMax: 6,
    hrPctMaxRange: [0.72, 0.82],
    hrPctHrrRange: [0.65, 0.75],
    danielsZone: "steady_marathon",
    intensityBand: "moderate",
    coachLabelAliases: ["steady", "moderate", "marathon", "marathon pace", "mp", "sedang"],
    conversationalCue: "Conversational becoming difficult.",
    citationIds: ["foster_2001", "karvonen_1957"],
  },
  {
    rpeMin: 7,
    rpeMax: 7,
    hrPctMaxRange: [0.82, 0.87],
    hrPctHrrRange: [0.75, 0.83],
    danielsZone: "threshold",
    intensityBand: "tempo",
    coachLabelAliases: ["tempo", "threshold", "lt", "lactate threshold", "intensif"],
    conversationalCue: "3-word sentences only.",
    citationIds: ["foster_2001", "karvonen_1957"],
  },
  {
    rpeMin: 8,
    rpeMax: 8,
    hrPctMaxRange: [0.87, 0.92],
    hrPctHrrRange: [0.83, 0.9],
    danielsZone: "interval",
    intensityBand: "hard",
    coachLabelAliases: ["interval", "intervals", "vo2max", "vo2", "kencang"],
    conversationalCue: "One word at a time.",
    citationIds: ["foster_2001", "karvonen_1957"],
  },
  {
    rpeMin: 9,
    rpeMax: 10,
    hrPctMaxRange: [0.92, 1.0],
    hrPctHrrRange: [0.9, 1.0],
    danielsZone: "repetition",
    intensityBand: "max",
    coachLabelAliases: ["max", "all-out", "all out", "sprint"],
    conversationalCue: "No speech possible.",
    citationIds: ["foster_2001", "karvonen_1957"],
  },
];

/** Look up the row whose RPE range contains the given CR10 value. */
export function rowForRpe(rpe: number): RpeZoneRow | null {
  if (!Number.isFinite(rpe)) return null;
  const clamped = Math.max(0.5, Math.min(10.5, rpe));
  return (
    RPE_ZONE_TABLE.find((r) => clamped >= r.rpeMin - 0.5 && clamped <= r.rpeMax + 0.5) ?? null
  );
}

/** Look up the row corresponding to a canonical label. */
export function rowForLabel(label: CanonicalLabel): RpeZoneRow {
  return RPE_ZONE_TABLE[LABEL_TO_RPE_ROW[label]];
}
