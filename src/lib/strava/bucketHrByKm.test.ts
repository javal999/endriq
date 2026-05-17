import { describe, it, expect } from "vitest";
import { bucketHrByKm } from "@/lib/strava/bucketHrByKm";

/**
 * Helper — synthesise a 1-Hz stream of `seconds` length at constant HR
 * and constant pace (`pace_sec_per_km`).
 */
function synth(
  seconds: number,
  paceSecPerKm: number,
  hr: number,
): { heartrate: number[]; distance: number[]; time: number[] } {
  const metresPerSecond = 1000 / paceSecPerKm;
  const heartrate: number[] = [];
  const distance: number[] = [];
  const time: number[] = [];
  for (let s = 0; s <= seconds; s += 1) {
    heartrate.push(hr);
    distance.push(s * metresPerSecond);
    time.push(s);
  }
  return { heartrate, distance, time };
}

describe("bucketHrByKm", () => {
  it("returns [] for empty streams", () => {
    expect(bucketHrByKm({ heartrate: [], distance: [], time: [] })).toEqual([]);
  });

  it("returns [] when there is less than 1km of distance", () => {
    expect(bucketHrByKm(synth(60, 600, 140))).toEqual([]);
  });

  it("returns exactly one bucket for a 1km steady run", () => {
    const out = bucketHrByKm(synth(300, 300, 150));
    expect(out).toHaveLength(1);
    expect(out[0].km_index).toBe(1);
    expect(out[0].avg_hr).toBe(150);
    expect(out[0].max_hr).toBe(150);
    expect(out[0].duration_sec).toBeGreaterThan(290);
    expect(out[0].duration_sec).toBeLessThanOrEqual(300);
  });

  it("buckets a 5km run at 5:00/km into 5 buckets", () => {
    const out = bucketHrByKm(synth(1500, 300, 140));
    expect(out).toHaveLength(5);
    for (let i = 0; i < 5; i += 1) {
      expect(out[i].km_index).toBe(i + 1);
      expect(out[i].avg_hr).toBe(140);
    }
  });

  it("drops the trailing partial km", () => {
    // 1.5km of distance → only one complete km
    const out = bucketHrByKm(synth(450, 300, 140));
    expect(out).toHaveLength(1);
  });

  it("computes per-km drift across a long run with rising HR", () => {
    // 5km at 5:00 pace; HR drifts 140 → 160 linearly
    const metresPerSecond = 1000 / 300;
    const heartrate: number[] = [];
    const distance: number[] = [];
    const time: number[] = [];
    const totalSec = 1500;
    for (let s = 0; s <= totalSec; s += 1) {
      heartrate.push(140 + (20 * s) / totalSec);
      distance.push(s * metresPerSecond);
      time.push(s);
    }
    const out = bucketHrByKm({ heartrate, distance, time });
    expect(out).toHaveLength(5);
    expect(out[0].avg_hr).toBeLessThan(out[4].avg_hr);
    // Last km should be 4 bpm or more higher than first km (drift visible)
    expect(out[4].avg_hr - out[0].avg_hr).toBeGreaterThanOrEqual(4);
  });

  it("filters non-finite HR samples but keeps the bucket if some are valid", () => {
    const base = synth(600, 300, 150);
    base.heartrate[100] = NaN;
    base.heartrate[200] = -1; // out of physiological range, dropped
    const out = bucketHrByKm(base);
    expect(out).toHaveLength(2);
    expect(out[0].avg_hr).toBe(150);
  });

  it("drops a bucket where no HR sample is valid", () => {
    const base = synth(600, 300, 150);
    // Wipe HR for km 1 entirely (samples 0..300)
    for (let i = 0; i <= 300; i += 1) base.heartrate[i] = NaN;
    const out = bucketHrByKm(base);
    // Bucket 1 dropped; bucket 2 still present
    expect(out.length).toBe(1);
    expect(out[0].km_index).toBe(2);
  });

  it("tolerates mismatched array lengths by truncating to the shortest", () => {
    const s = synth(900, 300, 150);
    s.heartrate.length = 500; // truncate HR
    const out = bucketHrByKm(s);
    // distance/time still record 3km, but HR only covers ~500/900 = 1.66km
    // -> at least 1 bucket emitted (more if the truncation crosses a boundary)
    expect(out.length).toBeGreaterThanOrEqual(1);
  });

  it("pace_sec_per_km equals duration_sec (exactly 1km per bucket)", () => {
    const out = bucketHrByKm(synth(1500, 300, 140));
    for (const b of out) {
      expect(b.pace_sec_per_km).toBe(b.duration_sec);
    }
  });

  it("captures interval-like HR variance — max > avg in a hard km", () => {
    // 1km easy, 1km with HR oscillating 160-185 (intervals)
    const total = 600;
    const metresPerSecond = 1000 / 300;
    const heartrate: number[] = [];
    const distance: number[] = [];
    const time: number[] = [];
    for (let s = 0; s <= total; s += 1) {
      const hr =
        s < 300 ? 140 : 160 + 25 * Math.sin((s - 300) * 0.5);
      heartrate.push(hr);
      distance.push(s * metresPerSecond);
      time.push(s);
    }
    const out = bucketHrByKm({ heartrate, distance, time });
    expect(out).toHaveLength(2);
    expect(out[1].max_hr).toBeGreaterThan(out[1].avg_hr);
    expect(out[1].avg_hr).toBeGreaterThan(out[0].avg_hr);
  });
});
