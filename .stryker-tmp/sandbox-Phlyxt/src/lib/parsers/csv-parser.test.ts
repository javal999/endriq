// @ts-nocheck
import { describe, expect, it } from "vitest";
import { classifySession, mapSportType } from "@/lib/normalizer";
import { detectFormat, parseActivityCsv } from "./csv-parser";

describe("detectFormat", () => {
  it("detects COROS headers", () => {
    const headers = [
      "Date",
      "Sport",
      "Duration",
      "Distance (km)",
      "Avg Heart Rate (bpm)",
      "Max Heart Rate (bpm)",
    ];
    expect(detectFormat(headers)).toBe("coros");
  });

  it("detects Garmin headers", () => {
    const headers = [
      "Activity Type",
      "Date",
      "Favorite",
      "Title",
      "Distance",
      "Calories",
      "Time",
      "Avg HR",
      "Max HR",
    ];
    expect(detectFormat(headers)).toBe("garmin");
  });

  it("returns null for garbage headers", () => {
    expect(detectFormat(["foo", "bar"])).toBeNull();
  });
});

describe("parseActivityCsv", () => {
  it("throws on unrecognized headers", () => {
    expect(() => parseActivityCsv("a,b\n1,2")).toThrow(/Unrecognized CSV/);
  });

  it("parses COROS-style rows with all fields present", () => {
    const csv = `Date,Sport,Duration,Distance (km),Avg Heart Rate (bpm),Max Heart Rate (bpm)
2026-05-01,Run,00:45:00,8.2,157,174`;
    const r = parseActivityCsv(csv);
    expect(r.format).toBe("coros");
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]).toMatchObject({
      date: "2026-05-01",
      sport: "Run",
      durationSeconds: 45 * 60,
      distanceMeters: 8200,
      avgHr: 157,
      maxHr: 174,
    });
  });

  it("parses Garmin-style rows with Activity Type", () => {
    const csv = `Activity Type,Date,Favorite,Title,Distance,Calories,Time,Avg HR,Max HR,Avg Cadence,Elev Gain
running,2026-05-02,false,x,10.1,500,01:00:00,162,180,172,50`;
    const r = parseActivityCsv(csv);
    expect(r.format).toBe("garmin");
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].distanceMeters).toBe(10100);
    expect(r.rows[0].durationSeconds).toBe(3600);
  });

  it("handles missing optional HR/cadence columns as null", () => {
    const csv = `Date,Sport,Duration,Distance (km)
2026-05-04,Run,00:30:00,5`;
    const r = parseActivityCsv(csv);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].avgHr).toBeNull();
    expect(r.rows[0].maxHr).toBeNull();
    expect(r.rows[0].avgCadence).toBeNull();
  });

  it("headers-only CSV returns empty rows", () => {
    const csv = `Date,Sport,Duration,Distance (km),Avg Heart Rate (bpm)`;
    const r = parseActivityCsv(csv);
    expect(r.format).toBe("coros");
    expect(r.rows).toEqual([]);
  });

  it("ignores unexpected extra columns", () => {
    const csv = `Date,Sport,Duration,Distance (km),Extra Junk,Also Extra\n2026-05-05,Run,1800,4,nope,x`;
    const r = parseActivityCsv(csv);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].date).toBe("2026-05-05");
  });

  it("parses ISO date prefix YYYY-MM-DD from longer timestamp string", () => {
    const csv = `Date,Sport,Duration,Distance (km)
2026-05-06T08:00:00Z,Run,1800,4`;
    const r = parseActivityCsv(csv);
    expect(r.rows[0].date).toBe("2026-05-06");
  });

  it("parses slash dates when day-of-month disambiguates", () => {
    const csv = `Date,Sport,Duration,Distance (km)
15/04/2026,Run,1800,4`;
    const r = parseActivityCsv(csv);
    expect(r.rows[0].date).toBe("2026-04-15");
  });

  it("handles quoted fields containing commas", () => {
    const csv = `Date,Sport,Duration,Distance (km)\n"2026-05-07","Run, trail",3600,8000`;
    const r = parseActivityCsv(csv);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].sport).toBe("Run, trail");
  });

  it("handles BOM at file start", () => {
    const csv =
      "\uFEFFDate,Sport,Duration,Distance (km)\n2026-05-08,Run,3600,10";
    const r = parseActivityCsv(csv);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].distanceMeters).toBe(10000);
  });

  it("parses duration as HH:MM:SS and as plain seconds", () => {
    const csvHms = `Date,Sport,Duration,Distance (km)\n2026-05-09,Run,01:02:03,0`;
    expect(parseActivityCsv(csvHms).rows[0].durationSeconds).toBe(3600 + 120 + 3);
    const csvSec = `Date,Sport,Duration,Distance (km)\n2026-05-09,Run,7200,0`;
    expect(parseActivityCsv(csvSec).rows[0].durationSeconds).toBe(7200);
  });

  it("parses Garmin Distance (mi) into meters", () => {
    const csv = `Activity Type,Date,Favorite,Title,Distance (mi),Calories,Time,Avg HR,Max HR
running,2026-05-10,false,x,6.2,400,01:00:00,150,165`;
    const r = parseActivityCsv(csv);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].distanceMeters).toBe(Math.round(6.2 * 1609.344));
  });

  it("handles trailing CRLF", () => {
    const csv =
      "Date,Sport,Duration,Distance (km)\r\n2026-05-11,Run,1800,4\r\n";
    const r = parseActivityCsv(csv);
    expect(r.rows).toHaveLength(1);
  });

  it("maps sport labels via mapSportType and derives session_label via classifySession", () => {
    const sports = [
      ["Run", "run"],
      ["Trail Running", "run"],
      ["Cycling", "bike"],
      ["Strength", "strength"],
      ["Swimming", "other"],
      ["Yoga", "other"],
    ] as const;
    for (const [label, canonical] of sports) {
      expect(mapSportType(label)).toBe(canonical);
    }
    const row = parseActivityCsv(
      `Date,Sport,Duration,Distance (km),Avg Heart Rate (bpm),Max Heart Rate (bpm)
2026-05-12,Run,7200,18000,155,172`,
    ).rows[0];
    expect(
      classifySession(
        mapSportType(row.sport),
        row.avgHr,
        row.maxHr,
        row.durationSeconds,
        row.distanceMeters,
      ),
    ).toBe("long_run");
  });

  it("warns and skips rows missing duration", () => {
    const csv = `Date,Sport,Duration,Distance (km)
2026-05-03,Run,,5`;
    const r = parseActivityCsv(csv);
    expect(r.rows).toHaveLength(0);
    expect(r.warnings.some((w) => /skipped/.test(w))).toBe(true);
  });
});
