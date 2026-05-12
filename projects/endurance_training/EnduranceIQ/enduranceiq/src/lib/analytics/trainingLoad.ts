import type { BadgeTone } from "@/lib/report/model";

export interface LoadMetrics {
  acuteLoad: number;
  chronicLoad: number | null;
  loadRatio: number | null;
  statusWord: string;
  tone: BadgeTone;
}

function stressVal(raw: number | string | null | undefined): number {
  if (raw == null) return 0;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function sumStressInRange(
  workouts: { started_at: string; training_stress: unknown }[],
  startMs: number,
  endMsExclusive: number,
): number {
  let s = 0;
  for (const w of workouts) {
    const t = new Date(w.started_at).getTime();
    if (t >= startMs && t < endMsExclusive) s += stressVal(w.training_stress as number | string | null);
  }
  return s;
}

/** Acute = trailing 7d ending week boundary; chronic = mean of four prior non-overlapping 7d buckets. */
export function computeLoadMetrics(
  workouts: { started_at: string; training_stress: unknown }[],
  weekEndExclusiveMs: number,
): LoadMetrics {
  const acuteStart = weekEndExclusiveMs - 7 * 86400000;
  const acuteLoad = sumStressInRange(workouts, acuteStart, weekEndExclusiveMs);

  const weeklyTotals: number[] = [];
  for (let i = 1; i <= 4; i += 1) {
    const winEnd = weekEndExclusiveMs - i * 7 * 86400000;
    const winStart = winEnd - 7 * 86400000;
    weeklyTotals.push(sumStressInRange(workouts, winStart, winEnd));
  }

  const chronicSum = weeklyTotals.reduce((a, b) => a + b, 0);
  const chronicLoad = chronicSum > 0 ? chronicSum / weeklyTotals.length : null;

  const loadRatio =
    chronicLoad != null && chronicLoad > 0 ? acuteLoad / chronicLoad : null;

  let statusWord = "Normal";
  let tone: BadgeTone = "good";
  if (loadRatio == null) {
    statusWord = "—";
    tone = "warn";
  } else if (loadRatio > 1.5) {
    statusWord = "Spike";
    tone = "bad";
  } else if (loadRatio > 1.3) {
    statusWord = "Elevated";
    tone = "warn";
  } else if (loadRatio < 0.8) {
    statusWord = "Low";
    tone = "good";
  }

  return {
    acuteLoad,
    chronicLoad,
    loadRatio,
    statusWord,
    tone,
  };
}
