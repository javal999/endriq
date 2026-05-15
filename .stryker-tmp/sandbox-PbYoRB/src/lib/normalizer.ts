/** Maps normalized sport label to canonical sport_type */
// @ts-nocheck

export function mapSportType(raw: string): "run" | "strength" | "bike" | "other" {
  const s = raw.toLowerCase();
  if (s.includes("run") || s.includes("trail")) return "run";
  if (s.includes("strength") || s.includes("weights") || s.includes("gym"))
    return "strength";
  if (s.includes("bike") || s.includes("cycl")) return "bike";
  return "other";
}

/**
 * Auto-classify session_label from summary stats (CSV has no per-second HR).
 * Mirrors PHASE-0-BUILD / architecture doc.
 */
export function classifySession(
  sportType: string,
  avgHr: number | null,
  maxHr: number | null,
  durationSeconds: number,
  distanceMeters: number | null,
): string {
  if (sportType === "strength") return "strength";
  if (sportType !== "run") return "unknown";

  const distanceKm = distanceMeters != null ? distanceMeters / 1000 : null;
  const mh = maxHr ?? 0;

  if (distanceKm != null && distanceKm > 15) return "long_run";
  if (avgHr != null && mh > 0 && avgHr > mh * 0.88) return "interval";
  if (avgHr != null && mh > 0 && avgHr > mh * 0.82) return "tempo";
  if (durationSeconds < 1800) return "recovery";
  return "easy";
}

/** Percent time in each zone bucket when only avg HR is known (whole session in one zone). */
export function hrZoneDistributionFromAvg(
  avgHr: number | null,
  observedMaxHr: number,
): Record<string, number> | null {
  if (avgHr == null || observedMaxHr <= 0) return null;
  const p = avgHr / observedMaxHr;
  if (p < 0.6) return { z1: 1 };
  if (p < 0.75) return { z2: 1 };
  if (p < 0.85) return { z3: 1 };
  if (p < 0.92) return { z4: 1 };
  return { z5: 1 };
}

/**
 * Training stress for running: duration_minutes * (avg_hr / estimated_lthr) ^ 1.5
 */
export function runningTrainingStress(
  durationSeconds: number,
  avgHr: number | null,
  observedMaxHr: number,
): number | null {
  if (avgHr == null || observedMaxHr <= 0) return null;
  const estimatedLthr = observedMaxHr * 0.85;
  const minutes = durationSeconds / 60;
  return minutes * Math.pow(avgHr / estimatedLthr, 1.5);
}

/** PHASE-0-BUILD strength placeholder when sets/RPE unknown: `(sets||10)*(RPE||6)*0.5`. */
export function strengthTrainingStress(
  totalSets: number | null,
  estimatedAvgRpe: number | null,
): number {
  const sets = totalSets ?? 10;
  const rpe = estimatedAvgRpe ?? 6;
  return sets * rpe * 0.5;
}
