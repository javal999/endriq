/** ISO Monday (UTC calendar date) containing this UTC instant — matches `weekRangeUTC` boundaries. */
export function utcIsoMondayContainingTimestamp(isoTimestamp: string): string {
  const d = new Date(isoTimestamp);
  const t = d.getTime();
  if (Number.isNaN(t)) throw new Error(`Invalid timestamp: ${isoTimestamp}`);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mondayMs = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate() + diff,
  );
  const md = new Date(mondayMs);
  const y = md.getUTCFullYear();
  const m = String(md.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(md.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** Monday date (local timezone) as YYYY-MM-DD for URL segments. */
export function isoMondayLocal(d = new Date()): string {
  const c = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = c.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  c.setDate(c.getDate() + diff);
  const y = c.getFullYear();
  const m = String(c.getMonth() + 1).padStart(2, "0");
  const dd = String(c.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** Shift a calendar Monday (YYYY-MM-DD) by whole days in UTC. */
export function addDaysIsoMonday(isoMonday: string, deltaDays: number): string {
  const parts = isoMonday.split("-").map(Number);
  const y = parts[0];
  const mo = parts[1];
  const d = parts[2];
  if (!y || !mo || !d) return isoMonday;
  const ms = Date.UTC(y, mo - 1, d + deltaDays);
  const dt = new Date(ms);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function weekRangeUTC(isoMonday: string): {
  startIso: string;
  endExclusiveIso: string;
} {
  const parts = isoMonday.split("-").map(Number);
  const y = parts[0];
  const mo = parts[1];
  const d = parts[2];
  if (!y || !mo || !d) throw new Error(`Invalid weekStart: ${isoMonday}`);
  const startMs = Date.UTC(y, mo - 1, d);
  const endMs = Date.UTC(y, mo - 1, d + 7);
  return {
    startIso: new Date(startMs).toISOString(),
    endExclusiveIso: new Date(endMs).toISOString(),
  };
}

export function formatWeekRangeLabel(isoMonday: string): string {
  const start = new Date(`${isoMonday}T12:00:00Z`);
  if (Number.isNaN(start.getTime())) return isoMonday;
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
}

export function shortSessionDate(isoTimestamp: string): string {
  const dt = new Date(isoTimestamp);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h <= 0) return `${m}m`;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}
