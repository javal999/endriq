/**
 * Intensity distribution v2 — TRIMP-weighted dual metric.
 *
 * Computes both time-based and training-load-based zone percentages.
 * The load percentages use Banister (1991) TRIMP with optional Karvonen
 * heart-rate reserve for resting-HR users, or HR-max-only approximation
 * when resting HR is unavailable.
 *
 * Citations (see src/lib/data/citations.ts for verified DOIs):
 *   banister_1991       — original TRIMP formulation
 *   seiler_kjerland_2006 — distribution patterns in elite endurance athletes
 *   treff_2019          — session-goal vs time-in-zone classification bias
 *   stoggl_sperlich_2014 — polarized vs threshold vs pyramidal
 *   casado_2022         — pyramidal vs polarized in sub-elite marathoners
 */

export interface SessionMetrics {
  duration_seconds: number;
  avg_hr: number | null;
}

export interface IntensityV2Breakdown {
  // Time-based (matches current v1 shape)
  pctEasyTime: number;
  pctModerateTime: number;
  pctHardTime: number;

  // Load-based (NEW — shadow mode)
  pctEasyLoad: number;
  pctModerateLoad: number;
  pctHardLoad: number;

  totalRunningSeconds: number;
  totalTrimp: number;
  modelUsed: "banister_karvonen" | "karvonen_approx";
  warnings: string[];
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Round to integer; correct the largest bucket so all three sum to 100. */
function roundToHundred(a: number, b: number, c: number): [number, number, number] {
  const ra = Math.round(a);
  const rb = Math.round(b);
  const rc = Math.round(c);
  const diff = 100 - (ra + rb + rc);
  // Add the rounding error to the largest bucket
  if (diff !== 0) {
    if (ra >= rb && ra >= rc) return [ra + diff, rb, rc];
    if (rb >= ra && rb >= rc) return [ra, rb + diff, rc];
    return [ra, rb, rc + diff];
  }
  return [ra, rb, rc];
}

/**
 * Compute TRIMP-weighted intensity breakdown.
 *
 * @param sessions     Running sessions for the week (non-run sessions are ignored by caller).
 * @param observedMaxHr  Athlete's observed or estimated max HR.
 * @param hrRest       Optional resting HR. When provided, uses Banister-Karvonen model.
 * @param sex          "male" | "female" | "other" | null — affects Banister weighting.
 */
export function computeIntensityV2(
  sessions: SessionMetrics[],
  observedMaxHr: number,
  hrRest: number | null,
  sex: "male" | "female" | "other" | null,
): IntensityV2Breakdown {
  const warnings: string[] = [];

  // Buckets by zone
  let easyTimeSec = 0;
  let modTimeSec = 0;
  let hardTimeSec = 0;
  let totalTimeSec = 0;

  let easyTrimp = 0;
  let modTrimp = 0;
  let hardTrimp = 0;
  let totalTrimp = 0;

  const modelUsed: IntensityV2Breakdown["modelUsed"] =
    hrRest != null ? "banister_karvonen" : "karvonen_approx";

  if (hrRest == null) {
    warnings.push("hr_rest missing — TRIMP using HR-max-only approximation");
  }

  for (const s of sessions) {
    if (s.avg_hr == null || observedMaxHr <= 0) continue;

    const durationMin = s.duration_seconds / 60;
    totalTimeSec += s.duration_seconds;

    let r: number;
    if (hrRest != null) {
      // Karvonen heart-rate reserve
      r = (s.avg_hr - hrRest) / (observedMaxHr - hrRest);
    } else {
      // Simple fraction of max HR
      r = s.avg_hr / observedMaxHr;
    }
    r = clamp(r, 0, 1);

    // Banister TRIMP formula — sex-specific weighting
    // female: trimp = dur_min * r * 0.86 * exp(1.67 * r)
    // male / other: trimp = dur_min * r * 0.64 * exp(1.92 * r)
    const trimp =
      sex === "female"
        ? durationMin * r * 0.86 * Math.exp(1.67 * r)
        : durationMin * r * 0.64 * Math.exp(1.92 * r);

    totalTrimp += trimp;

    // Zone classification by r:
    //   Z1+Z2 ("easy"):     r < 0.74
    //   Z3 ("moderate"):    0.74 ≤ r < 0.84
    //   Z4+Z5 ("hard"):     r ≥ 0.84
    if (r < 0.74) {
      easyTimeSec += s.duration_seconds;
      easyTrimp += trimp;
    } else if (r < 0.84) {
      modTimeSec += s.duration_seconds;
      modTrimp += trimp;
    } else {
      hardTimeSec += s.duration_seconds;
      hardTrimp += trimp;
    }
  }

  if (totalTimeSec === 0) {
    return {
      pctEasyTime: 0, pctModerateTime: 0, pctHardTime: 0,
      pctEasyLoad: 0, pctModerateLoad: 0, pctHardLoad: 0,
      totalRunningSeconds: 0,
      totalTrimp: 0,
      modelUsed,
      warnings,
    };
  }

  const [pctEasyTime, pctModerateTime, pctHardTime] = roundToHundred(
    (easyTimeSec / totalTimeSec) * 100,
    (modTimeSec / totalTimeSec) * 100,
    (hardTimeSec / totalTimeSec) * 100,
  );

  let pctEasyLoad = 0;
  let pctModerateLoad = 0;
  let pctHardLoad = 0;

  if (totalTrimp > 0) {
    [pctEasyLoad, pctModerateLoad, pctHardLoad] = roundToHundred(
      (easyTrimp / totalTrimp) * 100,
      (modTrimp / totalTrimp) * 100,
      (hardTrimp / totalTrimp) * 100,
    );
  }

  return {
    pctEasyTime,
    pctModerateTime,
    pctHardTime,
    pctEasyLoad,
    pctModerateLoad,
    pctHardLoad,
    totalRunningSeconds: totalTimeSec,
    totalTrimp,
    modelUsed,
    warnings,
  };
}
