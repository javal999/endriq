/**
 * Bucket a raw Strava stream into per-km HR aggregates.
 *
 * Strava returns three parallel arrays (heartrate / distance in metres /
 * time in seconds since start). We walk the distance array; every 1000m
 * boundary closes one bucket and opens the next.
 *
 * Pure function. Deterministic. No I/O.
 *
 * Refs: PHASE-2.1-BUILD.md §6 T10 step 3.
 */

export interface KmBucket {
  km_index: number;
  avg_hr: number;
  max_hr: number;
  duration_sec: number;
  pace_sec_per_km: number;
}

export interface RawStreams {
  heartrate: number[];
  /** Cumulative metres since activity start. */
  distance: number[];
  /** Seconds since activity start. */
  time: number[];
}

/**
 * Returns one bucket per completed kilometre. A trailing partial km is
 * dropped (we don't report a partial-pace bucket because the pace
 * would be misleading).
 *
 * The function tolerates:
 *   - Mismatched array lengths (truncates to the shortest).
 *   - Non-finite HR samples (filtered out per-bucket; bucket dropped if
 *     no valid HR remains).
 *   - Zero-distance streams (returns []).
 */
export function bucketHrByKm(streams: RawStreams): KmBucket[] {
  const n = Math.min(
    streams.heartrate.length,
    streams.distance.length,
    streams.time.length,
  );
  if (n < 2) return [];

  const buckets: KmBucket[] = [];

  let kmIndex = 1;
  let kmStartIdx = 0;
  let kmStartDistance = streams.distance[0] ?? 0;
  let kmStartTime = streams.time[0] ?? 0;

  for (let i = 1; i < n; i += 1) {
    const d = streams.distance[i];
    const distInThisKm = d - kmStartDistance;
    if (distInThisKm >= 1000) {
      // Close out this bucket using samples [kmStartIdx..i] inclusive.
      const bucket = aggregate(
        streams.heartrate,
        streams.time,
        kmStartIdx,
        i,
        kmIndex,
        kmStartTime,
      );
      if (bucket) buckets.push(bucket);
      kmIndex += 1;
      kmStartIdx = i;
      kmStartDistance = d;
      kmStartTime = streams.time[i];
    }
  }
  // Trailing partial-km not emitted.

  return buckets;
}

function aggregate(
  hr: number[],
  time: number[],
  startIdx: number,
  endIdx: number,
  kmIndex: number,
  kmStartTime: number,
): KmBucket | null {
  let sum = 0;
  let count = 0;
  let max = 0;
  for (let i = startIdx; i <= endIdx; i += 1) {
    const v = hr[i];
    if (Number.isFinite(v) && v > 30 && v < 240) {
      sum += v;
      count += 1;
      if (v > max) max = v;
    }
  }
  if (count === 0) return null;
  const durationSec = Math.max(1, time[endIdx] - kmStartTime);
  return {
    km_index: kmIndex,
    avg_hr: Math.round(sum / count),
    max_hr: Math.round(max),
    duration_sec: durationSec,
    pace_sec_per_km: durationSec, // exactly 1km per bucket
  };
}
