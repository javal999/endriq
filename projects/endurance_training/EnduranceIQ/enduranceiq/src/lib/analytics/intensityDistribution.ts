export interface IntensityBreakdown {
  pctEasy: number;
  pctModerate: number;
  pctHard: number;
  totalRunningSeconds: number;
}

/**
 * Weight running duration by session-average HR vs observed max HR (summary-data approximation).
 */
export function intensityFromRuns(
  runs: { duration_seconds: number; avg_hr: number | null }[],
  observedMaxHr: number,
): IntensityBreakdown {
  let easy = 0;
  let mod = 0;
  let hard = 0;
  let total = 0;

  for (const r of runs) {
    if (r.avg_hr == null || observedMaxHr <= 0) continue;
    const sec = r.duration_seconds;
    total += sec;
    const p = r.avg_hr / observedMaxHr;
    if (p < 0.75) easy += sec;
    else if (p < 0.85) mod += sec;
    else hard += sec;
  }

  if (total <= 0) {
    return { pctEasy: 0, pctModerate: 0, pctHard: 0, totalRunningSeconds: 0 };
  }

  const pctEasy = Math.round((easy / total) * 100);
  const pctModerate = Math.round((mod / total) * 100);
  let pctHard = Math.round((hard / total) * 100);
  const sum = pctEasy + pctModerate + pctHard;
  if (sum !== 100) pctHard += 100 - sum;

  return {
    pctEasy,
    pctModerate,
    pctHard,
    totalRunningSeconds: total,
  };
}
