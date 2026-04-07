/**
 * Field / Indonesian Excel convention: day before month in slash dates (d/m/yy, dd/mm/yyyy).
 * Excel serial numbers use 1899-12-30 epoch (same as Sheets / XLSX).
 */

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Parse 2- or 4-digit year to full year (2000–2099 for yy). */
function expandYear(y: number): number {
  if (y >= 100) return y;
  return y + 2000;
}

/**
 * Normalize a cell value from Excel (number serial, ISO string, or d/m/y slash string) to YYYY-MM-DD.
 */
export function parseExcelCellDateToIso(value: unknown): string {
  if (value === null || value === undefined) {
    return new Date().toISOString().split("T")[0];
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().split("T")[0];
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    if (value > 2000 && value < 100000) {
      const d = new Date(Date.UTC(1899, 11, 30 + Math.floor(value)));
      return d.toISOString().split("T")[0];
    }
  }

  const s = String(value).trim();
  if (!s) return new Date().toISOString().split("T")[0];

  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.split("T")[0].slice(0, 10);
  }

  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s|$|T|,)/);
  if (slash) {
    const day = parseInt(slash[1], 10);
    const month = parseInt(slash[2], 10);
    const year = expandYear(parseInt(slash[3], 10));
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${pad2(month)}-${pad2(day)}`;
    }
  }

  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }

  return new Date().toISOString().split("T")[0];
}

/**
 * If progress starts with "Update d/m/yy" and issue.date equals the US (m/d) reading of that token
 * but not the D/M reading, return corrected ISO; otherwise return original date.
 */
export function alignIssueDateWithProgressDate(date: string, progress: string): string {
  const m = /^[\s\S]*?Update\s+(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i.exec(progress || "");
  if (!m) return date;

  const a = parseInt(m[1], 10);
  const b = parseInt(m[2], 10);
  const y = expandYear(parseInt(m[3], 10));

  const dmyIso = `${y}-${pad2(b)}-${pad2(a)}`;
  const mdyIso = `${y}-${pad2(a)}-${pad2(b)}`;

  if (date === mdyIso && dmyIso !== mdyIso) {
    return dmyIso;
  }
  return date;
}
