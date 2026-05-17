/**
 * <ConfidencePill> — small pill showing the F8 confidence label.
 *
 * Cold-start "Calibrating" state pulses subtly (1s ease-in-out) so users
 * notice the product is still learning. Respects `prefers-reduced-motion`:
 * the pulse becomes a static dot.
 *
 * Refs: PHASE-2.0-UI-DESIGN.md §3.2 + §4.1.
 */

import type { InterpretConfidence } from "@/lib/analytics/interpretRun";

const LABELS_EN: Record<InterpretConfidence, string> = {
  high: "High",
  moderate: "Moderate",
  low: "Low",
  calibrating: "Calibrating",
};

const LABELS_ID: Record<InterpretConfidence, string> = {
  high: "Tinggi",
  moderate: "Sedang",
  low: "Rendah",
  calibrating: "Kalibrasi",
};

const TONE: Record<InterpretConfidence, { bg: string; fg: string }> = {
  high: { bg: "var(--status-good-bg)", fg: "var(--status-good)" },
  moderate: { bg: "var(--surface-raised)", fg: "var(--text-secondary)" },
  low: { bg: "var(--status-warn-bg)", fg: "var(--status-warn)" },
  calibrating: { bg: "var(--accent-soft)", fg: "var(--accent-dark)" },
};

export interface ConfidencePillProps {
  level: InterpretConfidence;
  /** Optional locale override; default 'en'. */
  locale?: "en" | "id";
  /** Optional tooltip explaining why this confidence was chosen. */
  tooltip?: string;
}

export function ConfidencePill({ level, locale = "en", tooltip }: ConfidencePillProps) {
  const labels = locale === "id" ? LABELS_ID : LABELS_EN;
  const isCalibrating = level === "calibrating";
  const tone = TONE[level];

  return (
    <span
      title={tooltip}
      aria-label={`Confidence: ${labels[level]}${tooltip ? `. ${tooltip}` : ""}`}
      style={{ background: tone.bg, color: tone.fg }}
      className={
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 " +
        "font-sans text-[11px] font-medium uppercase tracking-wider " +
        (isCalibrating ? "eiq-calibrating-pulse" : "")
      }
    >
      <span
        aria-hidden
        style={{ background: tone.fg }}
        className="inline-block h-1.5 w-1.5 rounded-full"
      />
      {labels[level]}
    </span>
  );
}
