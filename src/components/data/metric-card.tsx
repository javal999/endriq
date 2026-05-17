/**
 * <MetricCard> — single-value metric surface refreshed for the Apple-derivative
 * Phase 2.1 direction (T01).
 *
 * White surface, hairline border, 14px radius, big mono number, optional
 * status pill below ("on plan" / "in range"), optional inline sparkline.
 * Use everywhere a single value carries primary meaning (dashboard rings
 * companion stats, /week summary tiles, /race countdown tiles).
 */

import type { ReactNode } from "react";

export type MetricCardTone = "good" | "warn" | "bad" | "neutral";

export interface MetricCardProps {
  /** Short uppercase label, e.g. "Distance". */
  label: string;
  /** Big value. Caller decides format (string with units or plain number). */
  value: ReactNode;
  /** Optional small status pill below the value. */
  status?: { label: string; tone?: MetricCardTone };
  /** Optional secondary line (e.g. "vs last week +4 km"). */
  delta?: ReactNode;
  /** Optional inline element below the value (e.g. <TrendSparkline />). */
  inline?: ReactNode;
  className?: string;
}

const STATUS_TONE: Record<MetricCardTone, { bg: string; fg: string }> = {
  good: { bg: "var(--status-good-bg)", fg: "var(--status-good)" },
  warn: { bg: "var(--status-warn-bg)", fg: "var(--status-warn)" },
  bad: { bg: "var(--status-bad-bg)", fg: "var(--status-bad)" },
  neutral: { bg: "var(--surface-raised)", fg: "var(--text-secondary)" },
};

export function MetricCard({
  label,
  value,
  status,
  delta,
  inline,
  className = "",
}: MetricCardProps) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "var(--card-border)",
        borderRadius: "var(--radius-card)",
      }}
      className={`p-4 ${className}`}
    >
      <p className="font-sans text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 font-mono text-[20px] leading-[24px] font-medium text-[var(--text-primary)]">
        {value}
      </p>
      {inline && <div className="mt-2">{inline}</div>}
      {status && (
        <span
          style={{
            background: STATUS_TONE[status.tone ?? "neutral"].bg,
            color: STATUS_TONE[status.tone ?? "neutral"].fg,
          }}
          className="mt-2 inline-flex rounded-sm px-2 py-0.5 font-sans text-[11px] font-medium"
        >
          {status.label}
        </span>
      )}
      {delta && (
        <p className="mt-2 font-sans text-[12px] text-[var(--text-secondary)]">
          {delta}
        </p>
      )}
    </div>
  );
}
