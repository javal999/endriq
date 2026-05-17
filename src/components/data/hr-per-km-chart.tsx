"use client";

/**
 * <HrPerKmChart> — minimal per-km HR line chart for run sessions.
 *
 * Renders one line of per-km avg HR with zone shading (Z1-Z5) using the
 * athlete's observed max HR for the thresholds. Hover surfaces the bucket.
 *
 * Hidden when no streams are present (parent passes null).
 *
 * Refs: PHASE-2.1-BUILD.md §6 T10 step 9.
 */

import { useMemo, useState } from "react";

export interface HrPerKmBucket {
  km_index: number;
  avg_hr: number;
  max_hr: number;
  duration_sec: number;
  pace_sec_per_km: number;
}

export interface HrPerKmChartProps {
  buckets: HrPerKmBucket[];
  observedMaxHr: number;
}

const WIDTH = 640;
const HEIGHT = 200;
const PADDING = { top: 12, right: 12, bottom: 24, left: 32 };
const PLOT_W = WIDTH - PADDING.left - PADDING.right;
const PLOT_H = HEIGHT - PADDING.top - PADDING.bottom;

export function HrPerKmChart({ buckets, observedMaxHr }: HrPerKmChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const zones = useMemo(() => {
    const max = observedMaxHr;
    return [
      { name: "Z1", topPct: 0.6, color: "rgba(46, 94, 78, 0.06)" },
      { name: "Z2", topPct: 0.75, color: "rgba(46, 94, 78, 0.12)" },
      { name: "Z3", topPct: 0.85, color: "rgba(184, 122, 10, 0.10)" },
      { name: "Z4", topPct: 0.92, color: "rgba(196, 75, 63, 0.08)" },
      { name: "Z5", topPct: 1.05, color: "rgba(196, 75, 63, 0.14)" },
    ].map((z) => ({ ...z, topBpm: Math.round(max * z.topPct) }));
  }, [observedMaxHr]);

  if (buckets.length === 0 || !observedMaxHr) return null;

  const yMin = Math.min(observedMaxHr * 0.5, Math.min(...buckets.map((b) => b.avg_hr)) - 5);
  const yMax = Math.max(observedMaxHr * 1.02, Math.max(...buckets.map((b) => b.max_hr)) + 3);
  const range = yMax - yMin;

  const xStep = buckets.length === 1 ? 0 : PLOT_W / (buckets.length - 1);
  const xScale = (i: number) => PADDING.left + i * xStep;
  const yScale = (v: number) =>
    PADDING.top + PLOT_H - ((v - yMin) / range) * PLOT_H;

  const path = buckets
    .map((b, i) => `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(b.avg_hr).toFixed(1)}`)
    .join(" ");

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * WIDTH - PADDING.left;
    if (x < 0 || buckets.length === 0) {
      setHoverIdx(null);
      return;
    }
    const i = xStep === 0 ? 0 : Math.round(x / xStep);
    if (i >= 0 && i < buckets.length) setHoverIdx(i);
  }

  const hover = hoverIdx != null ? buckets[hoverIdx] : null;

  return (
    <section className="space-y-2" aria-label="Heart rate per kilometre">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-sans text-[13px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
          HR per km
        </h3>
        <p className="font-sans text-[11px] text-[var(--text-muted)]">
          {buckets.length} km · max HR {observedMaxHr} bpm
        </p>
      </header>

      <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
        <svg
          role="img"
          aria-label="Heart rate per kilometre chart"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full"
          onMouseMove={onMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          {/* Zone shading */}
          {zones.map((z, i) => {
            const bottom = i === 0 ? yMin : zones[i - 1].topBpm;
            const top = Math.min(yMax, z.topBpm);
            if (top <= bottom) return null;
            return (
              <rect
                key={z.name}
                x={PADDING.left}
                y={yScale(top)}
                width={PLOT_W}
                height={yScale(bottom) - yScale(top)}
                fill={z.color}
              />
            );
          })}
          {/* Line */}
          <path d={path} fill="none" stroke="var(--accent)" strokeWidth="1.8" />
          {/* Dots */}
          {buckets.map((b, i) => (
            <circle
              key={i}
              cx={xScale(i)}
              cy={yScale(b.avg_hr)}
              r="2"
              fill="var(--accent)"
            />
          ))}
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
                cy={yScale(hover.avg_hr)}
                r="3.5"
                fill="var(--accent)"
              />
            </>
          )}
          {/* X axis labels — first and last km */}
          <text
            x={xScale(0)}
            y={HEIGHT - 6}
            textAnchor="middle"
            className="fill-[var(--text-muted)]"
            style={{ font: "10px var(--font-mono, monospace)" }}
          >
            km 1
          </text>
          {buckets.length > 1 && (
            <text
              x={xScale(buckets.length - 1)}
              y={HEIGHT - 6}
              textAnchor="middle"
              className="fill-[var(--text-muted)]"
              style={{ font: "10px var(--font-mono, monospace)" }}
            >
              km {buckets[buckets.length - 1].km_index}
            </text>
          )}
          {/* Y axis labels */}
          <text
            x={4}
            y={yScale(yMax) + 8}
            className="fill-[var(--text-muted)]"
            style={{ font: "10px var(--font-mono, monospace)" }}
          >
            {Math.round(yMax)}
          </text>
          <text
            x={4}
            y={yScale(yMin) + 2}
            className="fill-[var(--text-muted)]"
            style={{ font: "10px var(--font-mono, monospace)" }}
          >
            {Math.round(yMin)}
          </text>
        </svg>
      </div>

      <p className="font-sans text-[12px] text-[var(--text-secondary)]" aria-live="polite">
        {hover ? (
          <>
            <span className="font-medium">km {hover.km_index}:</span>{" "}
            <span className="font-mono">{hover.avg_hr} bpm</span> avg ·{" "}
            <span className="font-mono">{hover.max_hr} bpm</span> max ·{" "}
            <span className="font-mono">
              {Math.floor(hover.pace_sec_per_km / 60)}:{String(hover.pace_sec_per_km % 60).padStart(2, "0")}
            </span>{" "}
            /km
          </>
        ) : (
          "Hover a km for details."
        )}
      </p>
    </section>
  );
}
