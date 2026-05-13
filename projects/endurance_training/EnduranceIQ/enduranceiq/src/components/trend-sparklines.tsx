"use client";

import { useState } from "react";
import type { TrendPoint } from "@/lib/report/model";

const W = 120;
const H = 40;
const PAD = 4;

function buildPath(values: number[]): string {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = PAD + ((W - PAD * 2) * i) / (values.length - 1);
    const y = H - PAD - ((v - min) / range) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return pts.join(" ");
}

function Sparkline({
  label,
  values,
  currentIdx,
  unit,
  color,
}: {
  label: string;
  values: number[];
  currentIdx: number;
  unit: string;
  color: string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const activeIdx = hoveredIdx ?? currentIdx;

  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const currentX = PAD + ((W - PAD * 2) * currentIdx) / (values.length - 1);
  const currentY = H - PAD - ((values[currentIdx]! - min) / range) * (H - PAD * 2);

  const hoverX = hoveredIdx !== null
    ? PAD + ((W - PAD * 2) * hoveredIdx) / (values.length - 1)
    : null;
  const hoverY = hoveredIdx !== null
    ? H - PAD - ((values[hoveredIdx]! - min) / range) * (H - PAD * 2)
    : null;

  return (
    <div className="flex flex-col items-start gap-1">
      <p className="font-sans text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <p className="font-mono text-[15px] font-medium text-[var(--text-primary)]">
        {values[activeIdx]?.toFixed(label === "Distance" ? 1 : 0)}{unit}
      </p>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="overflow-visible"
        aria-label={`${label} trend chart`}
      >
        {/* baseline */}
        <line
          x1={PAD}
          y1={H - PAD}
          x2={W - PAD}
          y2={H - PAD}
          stroke="var(--border)"
          strokeWidth={1}
        />
        {/* sparkline polyline */}
        <polyline
          points={buildPath(values)}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.5}
        />
        {/* current week dot */}
        <circle
          cx={currentX}
          cy={currentY}
          r={3.5}
          fill={color}
          opacity={0.9}
        />
        {/* hover dot */}
        {hoverX !== null && hoverY !== null && hoveredIdx !== currentIdx && (
          <circle cx={hoverX} cy={hoverY} r={2.5} fill={color} opacity={0.6} />
        )}
        {/* invisible hit areas for each data point */}
        {values.map((_, i) => {
          const x = PAD + ((W - PAD * 2) * i) / (values.length - 1);
          return (
            <rect
              key={i}
              x={x - 10}
              y={0}
              width={20}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{ cursor: "crosshair" }}
            />
          );
        })}
      </svg>
    </div>
  );
}

export function TrendSparklines({
  trend,
  currentWeekStart,
}: {
  trend: TrendPoint[];
  currentWeekStart: string;
}) {
  if (trend.length < 3) {
    return (
      <p className="mt-6 font-sans text-[13px] text-[var(--text-muted)]">
        Trends unlock after 3 weeks of data.
      </p>
    );
  }

  const currentIdx = trend.findIndex((t) => t.weekStart === currentWeekStart);
  const idx = currentIdx >= 0 ? currentIdx : trend.length - 1;

  return (
    <div className="mt-6 flex flex-wrap gap-8">
      <Sparkline
        label="Distance"
        values={trend.map((t) => t.distanceKm)}
        currentIdx={idx}
        unit=" km"
        color="var(--accent)"
      />
      <Sparkline
        label="Load"
        values={trend.map((t) => t.acuteLoad)}
        currentIdx={idx}
        unit=" TSS"
        color="var(--status-warn)"
      />
      <Sparkline
        label="Easy zone"
        values={trend.map((t) => t.pctZone1_2)}
        currentIdx={idx}
        unit="%"
        color="var(--status-good)"
      />
    </div>
  );
}
