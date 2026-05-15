import Papa from "papaparse";

export type ExportFormat = "coros" | "garmin";

/** Single row after CSV parsing, before normalization to canonical workout. */
export interface RawWorkoutRow {
  date: string;
  sport: string;
  durationSeconds: number;
  distanceMeters: number | null;
  avgHr: number | null;
  maxHr: number | null;
  avgCadence: number | null;
  elevationGainMeters: number | null;
  calories: number | null;
}

export interface ParseCsvResult {
  format: ExportFormat;
  rows: RawWorkoutRow[];
  warnings: string[];
}

function normHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

function parseDurationToSeconds(raw: string | undefined): number | null {
  if (raw == null || raw === "") return null;
  const s = raw.trim();
  const colonParts = s.split(":").map((p) => p.trim());
  if (colonParts.length === 3) {
    const h = Number(colonParts[0]);
    const m = Number(colonParts[1]);
    const sec = Number(colonParts[2]);
    if ([h, m, sec].every((n) => Number.isFinite(n)))
      return Math.round(h * 3600 + m * 60 + sec);
  }
  const asNum = Number(s.replace(",", "."));
  if (Number.isFinite(asNum) && asNum > 0) {
    // Assume seconds if large-ish number without colon
    return Math.round(asNum);
  }
  return null;
}

function parseDateIso(raw: string | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim();
  const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (slash) {
    const a = Number(slash[1]);
    const b = Number(slash[2]);
    const y = Number(slash[3]);
    let mm: number;
    let dd: number;
    if (a > 12) {
      dd = a;
      mm = b;
    } else if (b > 12) {
      mm = a;
      dd = b;
    } else {
      mm = a;
      dd = b;
    }
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      return `${y}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
    }
  }
  const d = new Date(t);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

/** Detect COROS vs Garmin from header row. */
export function detectFormat(headers: string[]): ExportFormat | null {
  const n = headers.map(normHeader);
  const joined = n.join("|");
  if (
    n.some((h) => h.includes("sport")) &&
    (n.some((h) => h.includes("distance")) ||
      joined.includes("avg heart rate") ||
      joined.includes("avg hr"))
  ) {
    if (n.some((h) => h === "activity type") || joined.includes("favorite"))
      return "garmin";
    return "coros";
  }
  if (n.some((h) => h === "activity type")) return "garmin";
  return null;
}

function findCol(
  headers: string[],
  predicates: ((h: string) => boolean)[],
): number {
  const n = headers.map(normHeader);
  for (let i = 0; i < n.length; i++) {
    if (predicates.every((p) => p(n[i]))) return i;
  }
  return -1;
}

function pickCorosIndices(headers: string[]) {
  const n = headers.map(normHeader);
  const dateIdx = n.findIndex((h) => h === "date");
  const sportIdx = n.findIndex((h) => h === "sport");
  const durIdx = n.findIndex((h) => h === "duration");
  const distIdx = n.findIndex(
    (h) => h.includes("distance") && h.includes("km"),
  );
  const avgHrIdx = findCol(headers, [
    (h) => h.includes("avg"),
    (h) => h.includes("heart") || h.includes("hr"),
  ]);
  const maxHrIdx = findCol(headers, [
    (h) => h.includes("max"),
    (h) => h.includes("heart") || h.includes("hr"),
  ]);
  const cadIdx = n.findIndex((h) => h.includes("cadence"));
  const elevIdx = n.findIndex((h) => h.includes("elevation"));
  const calIdx = n.findIndex((h) => h.includes("calor"));
  return {
    dateIdx,
    sportIdx,
    durIdx,
    distIdx,
    avgHrIdx,
    maxHrIdx,
    cadIdx,
    elevIdx,
    calIdx,
  };
}

function pickGarminIndices(headers: string[]) {
  const n = headers.map(normHeader);
  const dateIdx = n.findIndex((h) => h === "date");
  const sportIdx = n.findIndex((h) => h === "activity type");
  const durIdx = n.findIndex((h) => h === "time");
  const distIdx = n.findIndex((h) => h === "distance" || h.startsWith("distance "));
  const avgHrIdx = findCol(headers, [
    (h) => h.includes("avg"),
    (h) => h.includes("hr"),
  ]);
  const maxHrIdx = findCol(headers, [
    (h) => h.includes("max"),
    (h) => h.includes("hr"),
  ]);
  const cadIdx = n.findIndex((h) => h.includes("cadence"));
  const elevIdx = n.findIndex((h) => h.includes("elev"));
  const calIdx = n.findIndex((h) => h.includes("calor"));
  return {
    dateIdx,
    sportIdx,
    durIdx,
    distIdx,
    avgHrIdx,
    maxHrIdx,
    cadIdx,
    elevIdx,
    calIdx,
  };
}

function parseDistanceToMeters(
  raw: string | undefined,
  format: ExportFormat,
  distanceColumnHeader?: string,
): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(String(raw).replace(",", "."));
  if (!Number.isFinite(n)) return null;
  const header = distanceColumnHeader?.trim() ?? "";
  const h = normHeader(header);
  const miles =
    (h.includes("mi") || h.includes("mile")) && !h.includes("km");
  const metersPerUnit = miles ? 1609.344 : 1000;
  if (format === "coros" || format === "garmin") {
    return Math.round(n * metersPerUnit);
  }
  return null;
}

function parseIntLoose(raw: string | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(String(raw).replace(",", "."));
  return Number.isFinite(n) ? Math.round(n) : null;
}

/**
 * Parse COROS or Garmin activity CSV export into raw workout rows.
 * Collects warnings for skipped rows; throws if headers are not recognized.
 */
export function parseActivityCsv(input: string): ParseCsvResult {
  const bomStripped = input.replace(/^\uFEFF/, "");
  const parsed = Papa.parse<string[]>(bomStripped, {
    skipEmptyLines: true,
  });
  if (parsed.errors.length) {
    throw new Error(`CSV parse error: ${parsed.errors[0]?.message ?? "unknown"}`);
  }
  const rows = parsed.data.filter((r) =>
    r.some((c) => String(c).trim() !== ""),
  );
  if (rows.length < 1) {
    throw new Error(
      "CSV has no rows. Expected COROS or Garmin activity export headers.",
    );
  }
  const headers = rows[0].map((h) => String(h));
  const format = detectFormat(headers);
  if (rows.length === 1) {
    if (!format) {
      throw new Error(
        "Unrecognized CSV format. Expected COROS or Garmin export columns (Date, Sport/Duration/Distance, HR).",
      );
    }
    return { format, rows: [], warnings: [] };
  }
  if (!format) {
    throw new Error(
      "Unrecognized CSV format. Expected COROS or Garmin export columns (Date, Sport/Duration/Distance, HR).",
    );
  }

  const warnings: string[] = [];
  const out: RawWorkoutRow[] = [];
  const idx =
    format === "coros" ? pickCorosIndices(headers) : pickGarminIndices(headers);

  if (idx.dateIdx < 0 || idx.sportIdx < 0 || idx.durIdx < 0) {
    throw new Error(
      `Missing required columns for ${format} export (date, sport/type, duration/time).`,
    );
  }

  for (let i = 1; i < rows.length; i++) {
    const line = rows[i];
    const dateIso = parseDateIso(line[idx.dateIdx]);
    const dur = parseDurationToSeconds(line[idx.durIdx]);
    if (!dateIso || dur == null || dur <= 0) {
      warnings.push(`Row ${i + 1}: missing date or duration, skipped`);
      continue;
    }
    const sport = String(line[idx.sportIdx] ?? "").trim() || "unknown";
    const distHeader = idx.distIdx >= 0 ? headers[idx.distIdx] : undefined;
    const distanceMeters =
      idx.distIdx >= 0
        ? parseDistanceToMeters(line[idx.distIdx], format, distHeader)
        : null;
    const avgHr = idx.avgHrIdx >= 0 ? parseIntLoose(line[idx.avgHrIdx]) : null;
    const maxHr = idx.maxHrIdx >= 0 ? parseIntLoose(line[idx.maxHrIdx]) : null;
    const avgCadence =
      idx.cadIdx >= 0 ? parseIntLoose(line[idx.cadIdx]) : null;
    const elevationGainMeters =
      idx.elevIdx >= 0 ? parseIntLoose(line[idx.elevIdx]) : null;
    const calories = idx.calIdx >= 0 ? parseIntLoose(line[idx.calIdx]) : null;

    out.push({
      date: dateIso,
      sport,
      durationSeconds: dur,
      distanceMeters,
      avgHr,
      maxHr,
      avgCadence,
      elevationGainMeters,
      calories,
    });
  }

  return { format, rows: out, warnings };
}
