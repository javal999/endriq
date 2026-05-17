/**
 * Daniels VDOT lookup tables.
 *
 * VDOT (Jack Daniels, *Daniels' Running Formula*, 3rd ed.) is a single number
 * that compactly encodes an athlete's current aerobic fitness. It can be:
 *   - inferred from any recent race time (5K / 10K / half / marathon)
 *   - mapped back to training paces (Easy, Marathon, Threshold, Interval)
 *
 * Tables in this file are sparse-by-design (5-VDOT step) with linear
 * interpolation in the lookups. Tighter precision isn't useful — the
 * pace ranges we surface to athletes are deliberately ±10s wide.
 *
 * Pulled into Phase 2.0 in T05 because interpretRun (F8) needs pace
 * lookups before T11 (predictedFinish) ships. T11 will extend with
 * race-equivalency entries (5K↔10K↔half↔marathon time mapping).
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.1 + §5.7 F14.B; citations.ts entry
 *       daniels_2014_vdot.
 */

/** Sparse VDOT → training-pace table. Paces are seconds per km. */
interface VdotPaceRow {
  vdot: number;
  /** Easy / aerobic-base pace centre. ±15s in interpretRun outputs. */
  easySecPerKm: number;
  /** Marathon-pace centre. ±10s. */
  marathonSecPerKm: number;
  /** Threshold / tempo centre. ±5s. */
  thresholdSecPerKm: number;
  /** Interval (5K-pace equivalent) centre. ±5s. */
  intervalSecPerKm: number;
}

// Anchored to Daniels' published table; values are rounded to integer seconds
// per km. Coverage: VDOT 30 (jogger) → 85 (elite). Coarse but adequate for the
// range our typical user falls into.
const VDOT_PACE_TABLE: ReadonlyArray<VdotPaceRow> = [
  { vdot: 30, easySecPerKm: 480, marathonSecPerKm: 408, thresholdSecPerKm: 390, intervalSecPerKm: 355 },
  { vdot: 35, easySecPerKm: 432, marathonSecPerKm: 360, thresholdSecPerKm: 342, intervalSecPerKm: 315 },
  { vdot: 40, easySecPerKm: 390, marathonSecPerKm: 324, thresholdSecPerKm: 306, intervalSecPerKm: 282 },
  { vdot: 45, easySecPerKm: 360, marathonSecPerKm: 294, thresholdSecPerKm: 282, intervalSecPerKm: 258 },
  { vdot: 50, easySecPerKm: 336, marathonSecPerKm: 270, thresholdSecPerKm: 258, intervalSecPerKm: 234 },
  { vdot: 55, easySecPerKm: 312, marathonSecPerKm: 252, thresholdSecPerKm: 240, intervalSecPerKm: 216 },
  { vdot: 60, easySecPerKm: 294, marathonSecPerKm: 234, thresholdSecPerKm: 222, intervalSecPerKm: 198 },
  { vdot: 65, easySecPerKm: 276, marathonSecPerKm: 222, thresholdSecPerKm: 210, intervalSecPerKm: 186 },
  { vdot: 70, easySecPerKm: 264, marathonSecPerKm: 210, thresholdSecPerKm: 198, intervalSecPerKm: 174 },
  { vdot: 75, easySecPerKm: 252, marathonSecPerKm: 198, thresholdSecPerKm: 186, intervalSecPerKm: 162 },
  { vdot: 80, easySecPerKm: 240, marathonSecPerKm: 186, thresholdSecPerKm: 174, intervalSecPerKm: 150 },
  { vdot: 85, easySecPerKm: 228, marathonSecPerKm: 174, thresholdSecPerKm: 162, intervalSecPerKm: 138 },
];

/** Bracket lookup: returns the row at-or-below `vdot` and at-or-above. */
function bracket(vdot: number): [VdotPaceRow, VdotPaceRow] {
  const clamped = Math.max(30, Math.min(85, vdot));
  for (let i = 0; i < VDOT_PACE_TABLE.length - 1; i++) {
    if (clamped >= VDOT_PACE_TABLE[i].vdot && clamped <= VDOT_PACE_TABLE[i + 1].vdot) {
      return [VDOT_PACE_TABLE[i], VDOT_PACE_TABLE[i + 1]];
    }
  }
  return [VDOT_PACE_TABLE[VDOT_PACE_TABLE.length - 2], VDOT_PACE_TABLE[VDOT_PACE_TABLE.length - 1]];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export type DanielsPaceZone = "E" | "M" | "T" | "I";

/**
 * Returns the pace (sec/km) for the given VDOT and Daniels zone.
 * Linear interpolation between bracketing table rows.
 */
export function paceForVdot(vdot: number, zone: DanielsPaceZone): number {
  const [lo, hi] = bracket(vdot);
  const t = hi.vdot === lo.vdot ? 0 : (vdot - lo.vdot) / (hi.vdot - lo.vdot);
  const key = (
    zone === "E"
      ? "easySecPerKm"
      : zone === "M"
      ? "marathonSecPerKm"
      : zone === "T"
      ? "thresholdSecPerKm"
      : "intervalSecPerKm"
  ) as keyof Omit<VdotPaceRow, "vdot">;
  return Math.round(lerp(lo[key], hi[key], t));
}

/**
 * Returns a pace range [low, high] in sec/km around the centre for a given
 * VDOT + zone. Widths match the comments on VdotPaceRow.
 */
export function paceRangeForVdot(
  vdot: number,
  zone: DanielsPaceZone,
): [number, number] {
  const c = paceForVdot(vdot, zone);
  const widthBySide: Record<DanielsPaceZone, number> = {
    E: 15,
    M: 10,
    T: 5,
    I: 5,
  };
  const w = widthBySide[zone];
  return [c - w, c + w];
}

/**
 * Daniels race-equivalency table — given a VDOT, the equivalent race time
 * (in seconds) for the four standard distances. Used by predictedFinish
 * (T11) to translate a known race time into a target-race prediction.
 *
 * Values match Daniels' published equivalency tables, rounded to integer
 * seconds at the same 5-VDOT step as VDOT_PACE_TABLE.
 */
interface VdotRaceRow {
  vdot: number;
  /** Race time in seconds for each standard distance. */
  fiveKm: number;
  tenKm: number;
  halfMarathon: number;
  marathon: number;
}

const VDOT_RACE_TABLE: ReadonlyArray<VdotRaceRow> = [
  { vdot: 30, fiveKm: 1840, tenKm: 3826, halfMarathon: 8464, marathon: 17357 },
  { vdot: 35, fiveKm: 1623, tenKm: 3367, halfMarathon: 7430, marathon: 15234 },
  { vdot: 40, fiveKm: 1450, tenKm: 2996, halfMarathon: 6593, marathon: 13513 },
  { vdot: 45, fiveKm: 1311, tenKm: 2700, halfMarathon: 5921, marathon: 12121 },
  { vdot: 50, fiveKm: 1197, tenKm: 2461, halfMarathon: 5368, marathon: 10980 },
  { vdot: 55, fiveKm: 1103, tenKm: 2263, halfMarathon: 4914, marathon: 10039 },
  { vdot: 60, fiveKm: 1024, tenKm: 2098, halfMarathon: 4533, marathon: 9252 },
  { vdot: 65, fiveKm: 957, tenKm: 1958, halfMarathon: 4214, marathon: 8589 },
  { vdot: 70, fiveKm: 899, tenKm: 1838, halfMarathon: 3940, marathon: 8020 },
  { vdot: 75, fiveKm: 849, tenKm: 1734, halfMarathon: 3705, marathon: 7532 },
  { vdot: 80, fiveKm: 806, tenKm: 1644, halfMarathon: 3499, marathon: 7106 },
  { vdot: 85, fiveKm: 768, tenKm: 1565, halfMarathon: 3318, marathon: 6730 },
];

export type StandardRaceDistance = "5k" | "10k" | "half_marathon" | "marathon";

const RACE_KEY_BY_DISTANCE: Record<StandardRaceDistance, keyof Omit<VdotRaceRow, "vdot">> = {
  "5k": "fiveKm",
  "10k": "tenKm",
  half_marathon: "halfMarathon",
  marathon: "marathon",
};

function raceBracket(vdot: number): [VdotRaceRow, VdotRaceRow] {
  const clamped = Math.max(30, Math.min(85, vdot));
  for (let i = 0; i < VDOT_RACE_TABLE.length - 1; i++) {
    if (clamped >= VDOT_RACE_TABLE[i].vdot && clamped <= VDOT_RACE_TABLE[i + 1].vdot) {
      return [VDOT_RACE_TABLE[i], VDOT_RACE_TABLE[i + 1]];
    }
  }
  return [VDOT_RACE_TABLE[VDOT_RACE_TABLE.length - 2], VDOT_RACE_TABLE[VDOT_RACE_TABLE.length - 1]];
}

/**
 * Returns the predicted race time (seconds) for a given VDOT + distance.
 * Linear interpolation across bracketing rows.
 */
export function raceTimeForVdot(vdot: number, distance: StandardRaceDistance): number {
  const [lo, hi] = raceBracket(vdot);
  const t = hi.vdot === lo.vdot ? 0 : (vdot - lo.vdot) / (hi.vdot - lo.vdot);
  const key = RACE_KEY_BY_DISTANCE[distance];
  return Math.round(lerp(lo[key], hi[key], t));
}

/**
 * Riegel race-time prediction (1981): T2 = T1 × (D2 / D1)^1.06.
 * Returns seconds. Exponent 1.06 matches modern recreational-runner data
 * (Vickers & Vertosick 2016 confirmed this remains a good baseline).
 */
export function riegelPredict(
  fromDistanceKm: number,
  fromTimeSec: number,
  toDistanceKm: number,
  exponent = 1.06,
): number {
  if (fromDistanceKm <= 0 || toDistanceKm <= 0 || fromTimeSec <= 0) return 0;
  const ratio = toDistanceKm / fromDistanceKm;
  return Math.round(fromTimeSec * Math.pow(ratio, exponent));
}

/**
 * Distance in km for our standard race types. Used by the prediction layer
 * to convert race_type → km input for Riegel/VDOT.
 */
export const STANDARD_RACE_KM: Record<StandardRaceDistance, number> = {
  "5k": 5,
  "10k": 10,
  half_marathon: 21.0975,
  marathon: 42.195,
};

/**
 * Infer VDOT from a recent race performance.
 *
 * Uses Daniels' velocity-VO2 relationship simplified to a closed form. Good
 * enough for our resolution (the table is in 5-VDOT steps and the consumer
 * widens the resulting pace by ±10s anyway).
 *
 * Reference: Daniels 2014 ch. 3 — VDOT inference from a race.
 *   v (m/min) = 1000 × distance_km / (time_sec / 60)
 *   %VO2max  = 0.8 + 0.1894393·exp(-0.012778·t) + 0.2989558·exp(-0.1932605·t)
 *   VO2(v)   = -4.6 + 0.182258·v + 0.000104·v²
 *   VDOT     = VO2(v) / %VO2max
 *
 * Returns null when distance/time are out of sensible bounds.
 */
export function inferVdotFromRace(distanceKm: number, timeSec: number): number | null {
  if (
    !Number.isFinite(distanceKm) ||
    !Number.isFinite(timeSec) ||
    distanceKm < 1 ||
    distanceKm > 100 ||
    timeSec < 60 ||
    timeSec > 24 * 60 * 60
  ) {
    return null;
  }
  const timeMin = timeSec / 60;
  const v = (1000 * distanceKm) / timeMin; // metres per minute
  const pctVo2max =
    0.8 +
    0.1894393 * Math.exp(-0.012778 * timeMin) +
    0.2989558 * Math.exp(-0.1932605 * timeMin);
  const vo2 = -4.6 + 0.182258 * v + 0.000104 * v * v;
  const vdot = vo2 / pctVo2max;
  return Math.round(Math.max(20, Math.min(90, vdot)));
}
