/**
 * Performance Management Chart — CTL/ATL/TSB computation.
 *
 * Methodology (Banister/Calvert, popularised by Coggan/Allen):
 *   - CTL (Chronic Training Load) = exponentially weighted average of
 *     daily training stress with time constant 42 days. Proxies "fitness".
 *   - ATL (Acute Training Load) = same average with time constant 7 days.
 *     Proxies "fatigue".
 *   - TSB (Training Stress Balance) = CTL − ATL. Positive when fresh,
 *     negative when fatigued. ~+25 = peaked; < −30 = over-reached.
 *
 * Exponential update rule:
 *
 *     CTL_t = CTL_{t-1} + (load_t − CTL_{t-1}) × (1 / 42)
 *     ATL_t = ATL_{t-1} + (load_t − ATL_{t-1}) × (1 / 7)
 *
 * Pure function, deterministic given inputs. No I/O. No date math
 * library — we operate on ISO YYYY-MM-DD strings already produced by
 * upstream callers.
 *
 * Refs: PHASE-2.1-BUILD.md §6 T06.
 */

export interface PmcDataPoint {
  /** ISO YYYY-MM-DD. */
  date: string;
  /** Chronic training load (42-day EWA). */
  ctl: number;
  /** Acute training load (7-day EWA). */
  atl: number;
  /** Training stress balance — ctl − atl. */
  tsb: number;
}

export interface PmcDailyLoad {
  /** ISO YYYY-MM-DD. */
  date: string;
  /** Total training stress for the day. 0 for rest days. */
  load: number;
}

export interface PmcOptions {
  /** Days of trailing history to retain in the output. Defaults to 180. */
  windowDays?: number;
  /** Override the EWA time constant for CTL (default 42). */
  ctlDays?: number;
  /** Override the EWA time constant for ATL (default 7). */
  atlDays?: number;
}

/**
 * Compute the CTL/ATL/TSB series for a daily load series.
 *
 * The function expects a dense, chronological array (one entry per day,
 * including zero-load rest days). Callers should fill gaps with `load: 0`
 * before calling — we do not try to interpolate dates here.
 *
 * The returned series has the same length as the input.
 */
export function computePmc(
  dailyLoadSeries: PmcDailyLoad[],
  options: PmcOptions = {},
): PmcDataPoint[] {
  const windowDays = options.windowDays ?? 180;
  const ctlAlpha = 1 / (options.ctlDays ?? 42);
  const atlAlpha = 1 / (options.atlDays ?? 7);

  if (dailyLoadSeries.length === 0) return [];

  const out: PmcDataPoint[] = [];
  let ctl = 0;
  let atl = 0;

  for (const point of dailyLoadSeries) {
    const load = Number.isFinite(point.load) ? point.load : 0;
    ctl = ctl + (load - ctl) * ctlAlpha;
    atl = atl + (load - atl) * atlAlpha;
    out.push({
      date: point.date,
      ctl: round1(ctl),
      atl: round1(atl),
      tsb: round1(ctl - atl),
    });
  }

  if (out.length <= windowDays) return out;
  return out.slice(out.length - windowDays);
}

/**
 * Bucket workout-level stress into daily loads. Callers pass the raw
 * trailing window of workouts; we return a dense series from `startDate`
 * (inclusive) through `endDate` (inclusive), filling zero-load days.
 */
export function densifyDailyLoads(
  workouts: Array<{ started_at: string; load: number }>,
  startDate: string,
  endDate: string,
): PmcDailyLoad[] {
  const startMs = Date.parse(`${startDate}T00:00:00Z`);
  const endMs = Date.parse(`${endDate}T00:00:00Z`);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
    return [];
  }

  const totals = new Map<string, number>();
  for (const w of workouts) {
    const k = w.started_at.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) continue;
    const prev = totals.get(k) ?? 0;
    const add = Number.isFinite(w.load) ? w.load : 0;
    totals.set(k, prev + add);
  }

  const days = Math.floor((endMs - startMs) / 86400000) + 1;
  const out: PmcDailyLoad[] = [];
  for (let i = 0; i < days; i += 1) {
    const ts = startMs + i * 86400000;
    const d = new Date(ts);
    const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    out.push({ date: k, load: totals.get(k) ?? 0 });
  }
  return out;
}

/**
 * Interpret the most recent TSB as a colour-coded zone, used in the UI
 * to colour the readout. Mirrors the band thresholds in T06 step 3.
 */
export function tsbZone(tsb: number): "fresh" | "neutral" | "fatigued" | "over_reached" {
  if (tsb > 25) return "fresh";
  if (tsb >= -10) return "neutral";
  if (tsb >= -30) return "fatigued";
  return "over_reached";
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
