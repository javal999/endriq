/**
 * F8 — coach instruction parser.
 *
 * Turns a coach's plain-English-or-Bahasa instruction string into a
 * structured intent that interpretRun (T05) can hand to the athlete as
 * pace / HR / RPE ranges.
 *
 * Pure function. No I/O. Deterministic.
 *
 * Recognises (any combination):
 *   - RPE patterns:           "60% RPE", "RPE 7", "rpe7", "70% rpe"
 *   - HR-zone patterns:       "Z2", "Zone 3", "Z2-3"
 *   - HR bpm patterns:        "150-160 bpm", "@ 160 bpm"
 *   - Pace patterns:          "5:30/km", "4:45 min/km", "5:30 pace"
 *   - Label tokens (EN + ID): "easy", "tempo", "intervals", "santai", ...
 *   - Structured workouts:    "8x800 at 3:30 / 90s", "10x400m @ R / 60s rest"
 *
 * Conflict detection: if the input combines tokens from different intensity
 * bands (e.g. "easy 90% RPE"), the parser keeps the most-specific signal
 * (numeric > label) and surfaces the conflict in `conflicts`.
 *
 * If nothing parseable is found, returns `{ intent: 'unknown', reason }`
 * without throwing.
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.1 F8; PHASE-2.0-BUILD.md T04 step 2.
 */

import {
  LABEL_TOKENS,
  RPE_ZONE_TABLE,
  rowForLabel,
  rowForRpe,
  type CanonicalLabel,
  type IntensityBand,
} from "@/lib/data/rpeZoneTranslation";

export type ParsedIntent =
  | {
      intent: "run";
      /** Canonical label if one was recognised; null when only RPE/HR/pace given. */
      label: CanonicalLabel | null;
      /** RPE on CR10 scale (1-10). May be a single value or a range. */
      rpe?: number | [number, number];
      /** HR target in bpm. */
      hrTarget?: [number, number];
      /** Pace target in seconds per km, [fast, slow]. */
      paceTarget?: [number, number];
      /** Distance in metres if specified ("10km", "8K"). */
      distanceMeters?: number;
      /** Structured workout (intervals, reps). Null for steady runs. */
      structure?: WorkoutBlock | null;
      /** Conflicting tokens surfaced for UI to display alongside the interpretation. */
      conflicts: ReadonlyArray<ConflictNote>;
      /** Echo of the original input — useful for the panel header. */
      raw: string;
    }
  | {
      intent: "unknown";
      reason: string;
      raw: string;
    };

export interface WorkoutBlock {
  /** Repetition count. */
  sets: number;
  /** Distance per rep in metres, OR null if duration-based. */
  distanceMeters: number | null;
  /** Duration per rep in seconds, OR null if distance-based. */
  durationSeconds: number | null;
  /** Optional target pace (seconds per km). */
  targetPaceSecPerKm: [number, number] | null;
  /** Optional target RPE. */
  targetRpe: number | null;
  /** Recovery between reps in seconds (may be jog or rest — we don't disambiguate). */
  recoverySeconds: number | null;
}

export interface ConflictNote {
  kind: "rpe_label_band" | "rpe_pace_band" | "label_pace_band" | "multiple_labels";
  /** Human-readable summary, English only. UI can localise via labelKey. */
  message: string;
}

/** Normalize for token matching: lowercase, collapse whitespace, strip ASCII punct. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[,;.!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Match all labels in the text. Returns canonical names + their textual spans. */
function findLabels(text: string): CanonicalLabel[] {
  const found: CanonicalLabel[] = [];
  // Sort tokens longest-first so "marathon pace" wins over "marathon".
  const sortedTokens = Object.keys(LABEL_TOKENS).sort((a, b) => b.length - a.length);
  let remaining = " " + text + " ";
  for (const tok of sortedTokens) {
    const needle = " " + tok + " ";
    const idx = remaining.indexOf(needle);
    if (idx >= 0) {
      found.push(LABEL_TOKENS[tok]);
      // Replace the matched span with spaces so later passes don't double-match.
      remaining =
        remaining.slice(0, idx) +
        " ".repeat(needle.length) +
        remaining.slice(idx + needle.length);
    }
  }
  return found;
}

/** Recognise RPE patterns. Returns CR10 value 1-10 or a range, or null. */
function findRpe(text: string): number | [number, number] | null {
  // "rpe 6-7" range — must check BEFORE the single-rpe pattern.
  const rpeRange = text.match(/rpe\s*(\d{1,2})\s*[-–]\s*(\d{1,2})/);
  if (rpeRange) {
    const lo = Number(rpeRange[1]);
    const hi = Number(rpeRange[2]);
    if (lo >= 1 && hi <= 10 && lo < hi) return [lo, hi];
  }
  // "70% rpe" or "70%rpe" → CR10 = 7.0
  const pct = text.match(/(\d{1,3})\s*%?\s*rpe/);
  if (pct) {
    const n = Number(pct[1]);
    if (Number.isFinite(n)) {
      if (n >= 1 && n <= 10) return n; // already CR10
      if (n >= 10 && n <= 100) return n / 10; // percent → CR10
    }
  }
  // "rpe 7" or "rpe7"
  const rpeFirst = text.match(/rpe\s*(\d{1,2})/);
  if (rpeFirst) {
    const n = Number(rpeFirst[1]);
    if (n >= 1 && n <= 10) return n;
  }
  return null;
}

/** Recognise HR patterns: "Z2", "Zone 3", "Z2-3", "150-160 bpm", "@ 160 bpm". */
function findHr(text: string, observedMaxHr: number | null): [number, number] | null {
  // Explicit bpm range: "150-160 bpm" or "150 to 160 bpm"
  const bpmRange = text.match(/(\d{2,3})\s*[-–to]+\s*(\d{2,3})\s*bpm/);
  if (bpmRange) {
    const lo = Number(bpmRange[1]);
    const hi = Number(bpmRange[2]);
    if (lo >= 60 && hi <= 230 && lo < hi) return [lo, hi];
  }
  // Single bpm: "@ 160 bpm" → ±5
  const bpmSingle = text.match(/(\d{2,3})\s*bpm/);
  if (bpmSingle) {
    const n = Number(bpmSingle[1]);
    if (n >= 60 && n <= 230) return [n - 5, n + 5];
  }
  // Zone range: "z2-3" or "zone 2-3"
  const zoneRange = text.match(/z(?:one)?\s*(\d)\s*[-–]\s*(\d)/);
  if (zoneRange) {
    const lo = Number(zoneRange[1]);
    const hi = Number(zoneRange[2]);
    if (observedMaxHr && lo >= 1 && hi <= 5 && lo <= hi) {
      return [zoneToHr(lo, "low", observedMaxHr), zoneToHr(hi, "high", observedMaxHr)];
    }
  }
  // Single zone: "z2" or "zone 3"
  const zoneSingle = text.match(/(?:^|\s)z(?:one)?\s*(\d)(?:\s|$)/);
  if (zoneSingle) {
    const z = Number(zoneSingle[1]);
    if (observedMaxHr && z >= 1 && z <= 5) {
      return [zoneToHr(z, "low", observedMaxHr), zoneToHr(z, "high", observedMaxHr)];
    }
  }
  return null;
}

/** Standard 5-zone model bounds, anchored to HRmax. */
function zoneToHr(zone: number, edge: "low" | "high", hrMax: number): number {
  // %HRmax bounds per CLAUDE.md / Phase 1 zone model.
  const bounds: Record<number, [number, number]> = {
    1: [0.5, 0.6],
    2: [0.6, 0.75],
    3: [0.75, 0.85],
    4: [0.85, 0.92],
    5: [0.92, 1.0],
  };
  const [lo, hi] = bounds[zone];
  return Math.round(hrMax * (edge === "low" ? lo : hi));
}

/**
 * Recognise pace patterns:
 *   "5:30/km", "5:30 min/km", "5:30 pace", "5:30-5:45/km"
 *   "5:30 - 5:45 min/km"
 */
function findPace(text: string): [number, number] | null {
  // Range: "5:30-5:45/km"
  const range = text.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})\s*\/?\s*(?:km|min\/km|pace)?/);
  if (range) {
    const lo = Number(range[1]) * 60 + Number(range[2]);
    const hi = Number(range[3]) * 60 + Number(range[4]);
    if (lo >= 150 && hi <= 900 && lo <= hi) return [lo, hi];
  }
  // Single: "5:30/km" → ±10s
  const single = text.match(/(\d{1,2}):(\d{2})\s*\/?\s*(?:km|min\/km|pace)/);
  if (single) {
    const sec = Number(single[1]) * 60 + Number(single[2]);
    if (sec >= 150 && sec <= 900) return [sec - 10, sec + 10];
  }
  return null;
}

/** Recognise total distance: "10km", "10 km", "8K". */
function findDistance(text: string): number | null {
  const m = text.match(/(?<![a-z])(\d{1,3}(?:\.\d)?)\s*(?:km|k)\b/);
  if (m) {
    const km = Number(m[1]);
    if (km > 0 && km < 1000) return Math.round(km * 1000);
  }
  return null;
}

/**
 * Recognise structured intervals:
 *   "8x800", "8 x 800m", "10x400m at 3:30 / 90s"
 *   "5x3min @ tempo / 90s recovery"
 *   "8x800 @ 3:30/km / 90s jog"
 */
function findStructure(text: string): WorkoutBlock | null {
  // sets × distance (m): "8x800" or "8 x 800m"
  const setsDist = text.match(/(\d{1,2})\s*[x×]\s*(\d{2,4})\s*m?\b/);
  // sets × time: "5x3min" or "5 x 3 minutes"
  const setsTime = text.match(/(\d{1,2})\s*[x×]\s*(\d{1,3})\s*(?:min|minutes|mins)\b/);

  if (!setsDist && !setsTime) return null;

  let sets: number;
  let distanceMeters: number | null = null;
  let durationSeconds: number | null = null;
  if (setsDist) {
    sets = Number(setsDist[1]);
    distanceMeters = Number(setsDist[2]);
  } else if (setsTime) {
    sets = Number(setsTime[1]);
    durationSeconds = Number(setsTime[2]) * 60;
  } else {
    return null;
  }

  // Target pace: e.g. "@ 3:30" or "@ 3:30/km"
  let targetPace: [number, number] | null = null;
  const paceTarget = text.match(/(?:at|@)\s*(\d{1,2}):(\d{2})(?:\s*\/\s*km)?/);
  if (paceTarget) {
    const sec = Number(paceTarget[1]) * 60 + Number(paceTarget[2]);
    if (sec >= 120 && sec <= 600) targetPace = [sec - 5, sec + 5];
  }

  // Recovery: "/ 90s", "/ 60s jog", "/ 2min rest", "@ 90s rest", "90s rest"
  // The recovery token is the number+unit nearest to "rest" / "jog" / "recovery"
  // OR following a "/" or "@" separator.
  let recoverySeconds: number | null = null;
  const recSec =
    text.match(/[/@]\s*(\d{1,4})\s*s\b/) ||
    text.match(/(\d{1,4})\s*s\s*(?:rest|jog|recovery|recoveri|pemulihan)/);
  const recMin =
    text.match(/[/@]\s*(\d{1,3})\s*(?:min|mins|minute|minutes)\b/) ||
    text.match(/(\d{1,3})\s*(?:min|mins|minute|minutes)\s*(?:rest|jog|recovery|pemulihan)/);
  if (recSec) recoverySeconds = Number(recSec[1]);
  else if (recMin) recoverySeconds = Number(recMin[1]) * 60;

  // Target RPE on the rep: "@ rpe 8" — captured by findRpe, but we don't
  // need to duplicate here. interpretRun reads the parent ParsedIntent.rpe.

  return {
    sets,
    distanceMeters,
    durationSeconds,
    targetPaceSecPerKm: targetPace,
    targetRpe: null,
    recoverySeconds,
  };
}

/** Most labels imply a single intensity band; use this to detect conflicts. */
function bandForLabel(label: CanonicalLabel): IntensityBand {
  return rowForLabel(label).intensityBand;
}

function bandForRpe(rpe: number | [number, number]): IntensityBand | null {
  const v = Array.isArray(rpe) ? (rpe[0] + rpe[1]) / 2 : rpe;
  return rowForRpe(v)?.intensityBand ?? null;
}

/** Crude pace → band heuristic: faster than 4:00/km is hard; 4-5 tempo; 5-6 moderate; 6+ easy. */
function bandForPace(paceSec: [number, number]): IntensityBand {
  const mid = (paceSec[0] + paceSec[1]) / 2;
  if (mid < 240) return "hard";
  if (mid < 300) return "tempo";
  if (mid < 360) return "moderate";
  if (mid < 420) return "easy";
  return "very_easy";
}

/**
 * Main entry point.
 *
 * `observedMaxHr` is optional but enables Z2 → bpm translation; without it
 * zone tokens stay zone tokens (callers can resolve later).
 */
export function parseCoachInstruction(
  text: string,
  options: { observedMaxHr?: number | null } = {},
): ParsedIntent {
  const raw = text;
  if (typeof text !== "string" || text.trim().length === 0) {
    return { intent: "unknown", reason: "empty input", raw };
  }
  const norm = normalize(text);
  const hrMax = options.observedMaxHr ?? null;

  const labels = findLabels(norm);
  const rpe = findRpe(norm);
  const hr = findHr(norm, hrMax);
  const pace = findPace(norm);
  const distance = findDistance(norm);
  const structure = findStructure(norm);

  if (
    labels.length === 0 &&
    rpe == null &&
    hr == null &&
    pace == null &&
    structure == null
  ) {
    return {
      intent: "unknown",
      reason:
        "Couldn't recognise any pace, HR, RPE, or session label. Try '60% RPE', 'easy', '5:30/km', '8x800 @ 3:30 / 90s', or pick a session type chip.",
      raw,
    };
  }

  // ── Conflict detection ───────────────────────────────────────────────────
  const conflicts: ConflictNote[] = [];

  // Multiple labels with different bands.
  if (labels.length > 1) {
    const bands = new Set(labels.map(bandForLabel));
    if (bands.size > 1) {
      conflicts.push({
        kind: "multiple_labels",
        message: `Multiple session types in input (${labels.join(", ")}) — using the most specific.`,
      });
    }
  }

  // RPE vs label disagreement.
  if (rpe != null && labels.length > 0) {
    const rpeBand = bandForRpe(rpe);
    const labelBand = bandForLabel(labels[0]);
    if (rpeBand && rpeBand !== labelBand) {
      conflicts.push({
        kind: "rpe_label_band",
        message: `RPE (${Array.isArray(rpe) ? rpe.join("-") : rpe}) and label "${labels[0]}" disagree — going with the explicit RPE.`,
      });
    }
  }

  // Pace vs RPE disagreement.
  if (pace != null && rpe != null) {
    const paceBand = bandForPace(pace);
    const rpeBand = bandForRpe(rpe);
    if (rpeBand && rpeBand !== paceBand) {
      conflicts.push({
        kind: "rpe_pace_band",
        message: "Pace and RPE disagree — using explicit pace if executable, else RPE.",
      });
    }
  }

  // PRD §5.1 rule: "defaults to the more specific token (numeric RPE > label)".
  // So we keep all signals in the output and let interpretRun rank them by
  // specificity. Caller branches on `rpe ?? label ?? pace ?? hr`.

  // Pick a canonical label if one exists; prefer the longest match (already
  // ordered by findLabels' longest-first scan).
  const label = labels.length > 0 ? labels[0] : null;

  return {
    intent: "run",
    label,
    rpe: rpe ?? undefined,
    hrTarget: hr ?? undefined,
    paceTarget: pace ?? undefined,
    distanceMeters: distance ?? undefined,
    structure: structure ?? null,
    conflicts,
    raw,
  };
}

/** Re-export RPE_ZONE_TABLE for callers that want the raw table. */
export { RPE_ZONE_TABLE };
