"use client";

/**
 * <PmcChart> — Performance Management Chart (CTL/ATL/TSB).
 *
 * Hand-rolled SVG line chart for three series. No charting dep.
 * Mobile compresses the X-axis labels but keeps the lines + readout.
 *
 * Refs: PHASE-2.1-BUILD.md §6 T06 step 3.
 */

import { useMemo, useState } from "react";
import type { PmcDataPoint } from "@/lib/analytics/pmc";
import { tsbZone } from "@/lib/analytics/pmc";

export interface PmcChartProps {
  series: PmcDataPoint[];
  /** Currently selected window in days; the parent owns this state. */
  windowDays: 90 | 180 | 365;
  onWindowChange: (next: 90 | 180 | 365) => void;
}

const WIDTH = 720;
const HEIGHT = 260;
const PADDING = { top: 16, right: 16, bottom: 28, left: 36 };
const PLOT_W = WIDTH - PADDING.left - PADDING.right;
const PLOT_H = HEIGHT - PADDING.top - PADDING.bottom;

export function PmcChart({ series, windowDays, onWindowChange }: PmcChartProps) {
  const trimmed = useMemo(() => {
    if (series.length <= windowDays) return series;
    return series.slice(series.length - windowDays);
  }, [series, windowDays]);

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const stats = useMemo(() => {
    if (trimmed.length === 0) return null;
    const all = trimmed.flatMap((p) => [p.ctl, p.atl, p.tsb]);
    return {
      min: Math.min(...all),
      max: Math.max(...all),
    };
  }, [trimmed]);

  if (trimmed.length === 0 || !stats) {
    return (
      <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-6">
        <p className="font-sans text-[14px] text-[var(--text-secondary)]">
          Not enough training history yet to chart your fitness trend. Log a few
          weeks of training and check back.
        </p>
      </div>
    );
  }

  const xStep = trimmed.length === 1 ? 0 : PLOT_W / (trimmed.length - 1);
  const range = Math.max(1, stats.max - stats.min);
  const padRange = range * 0.12;
  const yMin = stats.min - padRange;
  const yMax = stats.max + padRange;
  const yScale = (v: number) =>
    PADDING.top + PLOT_H - ((v - yMin) / (yMax - yMin)) * PLOT_H;
  const xScale = (i: number) => PADDING.left + i * xStep;

  const pathFor = (key: keyof Pick<PmcDataPoint, "ctl" | "atl" | "tsb">) =>
    trimmed
      .map((p, i) => `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(p[key]).toFixed(1)}`)
      .join(" ");

  const last = trimmed[trimmed.length - 1];
  const hover = hoverIdx != null ? trimmed[hoverIdx] : null;
  const zone = tsbZone(last.tsb);
  const zoneLabel: Record<typeof zone, string> = {
    fresh: "Fresh — peaked for a race",
    neutral: "Neutral — balanced training",
    fatigued: "Fatigued — recoverable",
    over_reached: "Over-reached — back off",
  };

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * WIDTH - PADDING.left;
    if (x < 0 || trimmed.length === 0) {
      setHoverIdx(null);
      return;
    }
    const i = xStep === 0 ? 0 : Math.round(x / xStep);
    if (i >= 0 && i < trimmed.length) setHoverIdx(i);
  }

  // Pick ~6 evenly-spaced labels for the x-axis
  const labelCount = Math.min(6, trimmed.length);
  const labelIdx = Array.from({ length: labelCount }, (_, i) =>
    Math.round((i * (trimmed.length - 1)) / Math.max(1, labelCount - 1)),
  );

  return (
    <section
      className="space-y-3"
      aria-label="Performance Management Chart"
    >
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-sans text-[15px] font-semibold text-[var(--text-primary)]">
            Fitness · Fatigue · Form
          </h3>
          <p className="font-sans text-[12px] text-[var(--text-muted)]">
            CTL (fitness) · ATL (fatigue) · TSB (form = fitness − fatigue)
          </p>
        </div>
        <WindowSelector value={windowDays} onChange={onWindowChange} />
      </header>

      <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
        <svg
          role="img"
          aria-label="Performance management chart"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full"
          onMouseMove={onMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          {/* Y gridlines */}
          {[0.25, 0.5, 0.75].map((f) => {
            const y = PADDING.top + PLOT_H * f;
            return (
              <line
                key={f}
                x1={PADDING.left}
                x2={PADDING.left + PLOT_W}
                y1={y}
                y2={y}
                stroke="var(--border)"
                strokeWidth="0.5"
              />
            );
          })}
          {/* Zero line if in range */}
          {yMin < 0 && yMax > 0 && (
            <line
              x1={PADDING.left}
              x2={PADDING.left + PLOT_W}
              y1={yScale(0)}
              y2={yScale(0)}
              stroke="var(--text-muted)"
              strokeWidth="0.7"
              strokeDasharray="3 3"
            />
          )}
          {/* TSB area shading: lightly fill the TSB curve to suggest form */}
          <path
            d={pathFor("tsb")}
            fill="none"
            stroke="rgba(64, 119, 169, 0.85)"
            strokeWidth="1.4"
          />
          <path
            d={pathFor("atl")}
            fill="none"
            stroke="var(--status-bad)"
            strokeWidth="1.6"
          />
          <path
            d={pathFor("ctl")}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
          />
          {/* Today marker */}
          <line
            x1={xScale(trimmed.length - 1)}
            x2={xScale(trimmed.length - 1)}
            y1={PADDING.top}
            y2={PADDING.top + PLOT_H}
            stroke="var(--text-secondary)"
            strokeWidth="0.7"
            strokeDasharray="2 3"
          />
          {/* Hover marker */}
          {hover && hoverIdx != null && (
            <>
              <line
                x1={xScale(hoverIdx)}
                x2={xScale(hoverIdx)}
                y1={PADDING.top}
                y2={PADDING.top + PLOT_H}
                stroke="var(--text-primary)"
                strokeWidth="0.5"
              />
              <circle
                cx={xScale(hoverIdx)}
                cy={yScale(hover.ctl)}
                r="3"
                fill="var(--accent)"
              />
              <circle
                cx={xScale(hoverIdx)}
                cy={yScale(hover.atl)}
                r="3"
                fill="var(--status-bad)"
              />
              <circle
                cx={xScale(hoverIdx)}
                cy={yScale(hover.tsb)}
                r="3"
                fill="rgba(64, 119, 169, 0.85)"
              />
            </>
          )}
          {/* X labels */}
          {labelIdx.map((i) => (
            <text
              key={i}
              x={xScale(i)}
              y={HEIGHT - 8}
              textAnchor="middle"
              className="fill-[var(--text-muted)]"
              style={{ font: "10px var(--font-mono, monospace)" }}
            >
              {trimmed[i]?.date.slice(5)}
            </text>
          ))}
          {/* Y labels */}
          <text
            x={4}
            y={yScale(yMax)}
            className="fill-[var(--text-muted)]"
            style={{ font: "10px var(--font-mono, monospace)" }}
          >
            {Math.round(yMax)}
          </text>
          <text
            x={4}
            y={yScale(yMin) + 4}
            className="fill-[var(--text-muted)]"
            style={{ font: "10px var(--font-mono, monospace)" }}
          >
            {Math.round(yMin)}
          </text>
        </svg>

        <ul className="mt-3 flex flex-wrap gap-3 text-[11px] text-[var(--text-secondary)]">
          <Legend dot="var(--accent)" label="CTL (fitness)" />
          <Legend dot="var(--status-bad)" label="ATL (fatigue)" />
          <Legend dot="rgba(64, 119, 169, 0.85)" label="TSB (form)" />
        </ul>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 font-mono text-[13px]">
        <Readout label="CTL" value={hover?.ctl ?? last.ctl} accent="var(--accent)" />
        <Readout label="ATL" value={hover?.atl ?? last.atl} accent="var(--status-bad)" />
        <Readout label="TSB" value={hover?.tsb ?? last.tsb} accent="rgba(64, 119, 169, 0.85)" />
      </div>

      <p
        className="font-sans text-[12px] text-[var(--text-secondary)]"
        aria-live="polite"
      >
        <span className="font-medium">Today:</span> {zoneLabel[zone]} (TSB{" "}
        {last.tsb > 0 ? "+" : ""}
        {last.tsb.toFixed(1)}).
      </p>
    </section>
  );
}

function WindowSelector({
  value,
  onChange,
}: {
  value: 90 | 180 | 365;
  onChange: (n: 90 | 180 | 365) => void;
}) {
  const options: Array<{ n: 90 | 180 | 365; label: string }> = [
    { n: 90, label: "3m" },
    { n: 180, label: "6m" },
    { n: 365, label: "12m" },
  ];
  return (
    <div role="group" aria-label="Chart window" className="flex gap-1">
      {options.map((o) => (
        <button
          key={o.n}
          type="button"
          onClick={() => onChange(o.n)}
          aria-pressed={value === o.n}
          className={
            "rounded-sm border px-2 py-1 font-sans text-[11px] " +
            (value === o.n
              ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-dark)]"
              : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]")
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <li className="inline-flex items-center gap-1.5 font-sans">
      <span
        aria-hidden
        className="inline-block size-2 rounded-full"
        style={{ background: dot }}
      />
      {label}
    </li>
  );
}

function Readout({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div>
      <p
        className="font-sans text-[10px] font-medium uppercase tracking-wider"
        style={{ color: accent }}
      >
        {label}
      </p>
      <p className="font-mono text-[15px] tabular-nums text-[var(--text-primary)]">
        {value.toFixed(1)}
      </p>
    </div>
  );
}
