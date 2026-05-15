import type { BadgeTone } from "@/lib/report/model";

export interface DbWorkoutLike {
  sport_type: string;
  session_label: string | null;
  avg_hr: number | null;
  distance_meters: number | string | null;
  duration_seconds: number;
}

export function sessionTypeLabel(w: DbWorkoutLike): string {
  if (w.sport_type === "strength") return "Strength";
  if (w.sport_type === "bike") return "Bike";
  if (w.sport_type !== "run") return "Other";
  const sl = w.session_label;
  if (sl === "long_run") return "Long run";
  if (sl === "interval") return "Intervals";
  if (sl === "tempo") return "Tempo";
  if (sl === "recovery") return "Recovery run";
  return "Easy run";
}

export function distanceLabel(w: DbWorkoutLike): string {
  if (w.sport_type === "strength") return "—";
  const dm = w.distance_meters;
  if (dm == null) return "—";
  const n = typeof dm === "number" ? dm : Number(dm);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `${(n / 1000).toFixed(1)} km`;
}

export function hrLabel(avg: number | null): string {
  if (avg == null) return "—";
  return `${avg} bpm`;
}

/** Session-level HR check vs session intent (avg HR vs observed max HR). */
export function sessionHrStatus(
  w: DbWorkoutLike,
  observedMaxHr: number,
): { label: string; tone: BadgeTone } {
  if (w.sport_type !== "run") {
    return { label: "Good", tone: "good" };
  }
  const avg = w.avg_hr;
  const mx = observedMaxHr;
  if (avg == null || mx <= 0) {
    return { label: "No HR", tone: "warn" };
  }
  const frac = avg / mx;
  const sl = w.session_label;

  if (sl === "easy" || sl === "recovery") {
    if (frac > 0.78) return { label: "Too hard", tone: "bad" };
    return { label: "Good", tone: "good" };
  }
  if (sl === "interval" || sl === "tempo") {
    if (frac < 0.82) return { label: "Low intensity", tone: "warn" };
    return { label: "Good", tone: "good" };
  }
  if (sl === "long_run") {
    if (frac > 0.82) return { label: "Watch", tone: "warn" };
    return { label: "Good", tone: "good" };
  }
  if (frac > 0.78) return { label: "Too hard", tone: "bad" };
  return { label: "Good", tone: "good" };
}
