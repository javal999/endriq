// @ts-nocheck
"use client";

import { useState } from "react";
import type { TrendPoint } from "@/lib/report/model";

const H = 80;
const PAD = 6;

function weekLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const end = new Date(d);
  end.setUTCDate(d.getUTCDate() + 6);
  const fmt = (dt: Date) =>
    dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  return `${fmt(d)} – ${fmt(end)}`;
}

/** Build SVG polyline points using a 0-100 virtual width so the SVG is fully responsive. */
function buildPath(values: number[]): string {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values
    .map((v, i) => {
      const x = PAD + ((100 - PAD * 2) * i) / (values.length - 1);
      const y = H - PAD - ((v - min) / range) * (H - PAD * 2);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function xOf(i: number, n: number) {
  return PAD + ((100 - PAD * 2) * i) / (n - 1);
}
function yOf(v: number, values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return H - PAD - ((v - min) / range) * (H - PAD * 2);
}

function Sparkline({
  label,
  values,
  weekStarts,
  currentIdx,
  unit,
  color,
  decimals = 0,
}: {
  label: string;
  values: number[];
  weekStarts: string[];
  currentIdx: number;
  unit: string;
  color: string;
  decimals?: number;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const activeIdx = hoveredIdx ?? currentIdx;

  if (values.length < 2) return null;

  const curX = xOf(currentIdx, values.length);
  const curY = yOf(values[currentIdx]!, values);
  const hovX = hoveredIdx !== null ? xOf(hoveredIdx, values.length) : null;
  const hovY = hoveredIdx !== null ? yOf(values[hoveredIdx]!, values) : null;

  const displayValue = values[activeIdx]?.toFixed(decimals);
  const displayWeek = weekStarts[activeIdx] ? weekLabel(weekStarts[activeIdx]) : "";
  const isCurrent = activeIdx === currentIdx;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <p className="font-sans text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[22px] font-medium leading-none text-[var(--text-primary)]">
          {displayValue}
        </span>
        <span className="font-sans text-[13px] text-[var(--text-muted)]">{unit}</span>
      </div>
      <p className={`font-sans text-[11px] ${isCurrent ? "text-[var(--text-muted)]" : "text-[var(--accent)] font-medium"}`}>
        {isCurrent ? "This week" : displayWeek}
      </p>
      {/* Responsive SVG: viewBox uses a 100-unit virtual width, CSS makes it stretch full width */}
      <svg
        viewBox={`0 0 100 ${H}`}
        preserveAspectRatio="none"
        className="mt-2 w-full overflow-visible"
        style={{ height: `${H}px` }}
        aria-label={`${label} trend`}
      >
        {/* baseline */}
        <line x1={PAD} y1={H - PAD} x2={100 - PAD} y2={H - PAD} stroke="var(--border)" strokeWidth={0.4} />
        {/* week tick marks */}
        {values.map((_, i) => (
          <line
            key={i}
            x1={xOf(i, values.length)}
            y1={H - PAD}
            x2={xOf(i, values.length)}
            y2={H - PAD + 2}
            stroke="var(--border)"
            strokeWidth={0.4}
          />
        ))}
        {/* sparkline */}
        <polyline
          points={buildPath(values)}
          fill="none"
          stroke={color}
          strokeWidth={0.6}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.5}
          vectorEffect="non-scaling-stroke"
        />
        {/* current dot */}
        <circle cx={curX} cy={curY} r={1.8} fill={color} opacity={0.95} />
        {/* hover dot */}
        {hovX !== null && hovY !== null && hoveredIdx !== currentIdx && (
          <circle cx={hovX} cy={hovY} r={1.2} fill={color} opacity={0.75} />
        )}
        {/* invisible hit areas */}
        {values.map((_, i) => {
          const x = xOf(i, values.length);
          return (
            <rect
              key={i}
              x={x - 5}
              y={0}
              width={10}
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

  const currentIdx = Math.max(
    0,
    trend.findIndex((t) => t.weekStart === currentWeekStart),
  );
  const idx = currentIdx >= 0 ? currentIdx : trend.length - 1;
  const weekStarts = trend.map((t) => t.weekStart);

  return (
    <div className="mt-6 rounded border border-[var(--border)] bg-[var(--surface)] px-6 py-5">
      <div className="grid grid-cols-2 gap-8">
        <Sparkline
          label="Weekly distance"
          values={trend.map((t) => t.distanceKm)}
          weekStarts={weekStarts}
          currentIdx={idx}
          unit="km"
          color="var(--accent)"
          decimals={1}
        />
        <Sparkline
          label="Training load"
          values={trend.map((t) => t.acuteLoad)}
          weekStarts={weekStarts}
          currentIdx={idx}
          unit="TSS"
          color="var(--status-warn)"
          decimals={0}
        />
      </div>
      <p className="mt-3 border-t border-[var(--border)] pt-2 font-sans text-[11px] text-[var(--text-muted)]">
        Hover over any point to see that week. Filled dot = current week.
      </p>
    </div>
  );
}
