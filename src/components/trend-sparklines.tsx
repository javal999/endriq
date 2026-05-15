"use client";

import { useState } from "react";
import type { TrendPoint } from "@/lib/report/model";

const W = 240;
const H = 70;
const PAD = 6;

function weekLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const end = new Date(d);
  end.setUTCDate(d.getUTCDate() + 6);
  const fmt = (dt: Date) =>
    dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  return `${fmt(d)} – ${fmt(end)}`;
}

function buildPath(values: number[], w = W, h = H, pad = PAD): string {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values
    .map((v, i) => {
      const x = pad + ((w - pad * 2) * i) / (values.length - 1);
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
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

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  function xOf(i: number) {
    return PAD + ((W - PAD * 2) * i) / (values.length - 1);
  }
  function yOf(v: number) {
    return H - PAD - ((v - min) / range) * (H - PAD * 2);
  }

  const curX = xOf(currentIdx);
  const curY = yOf(values[currentIdx]!);
  const hovX = hoveredIdx !== null ? xOf(hoveredIdx) : null;
  const hovY = hoveredIdx !== null ? yOf(values[hoveredIdx]!) : null;

  const displayValue = values[activeIdx]?.toFixed(decimals);
  const displayWeek = weekStarts[activeIdx] ? weekLabel(weekStarts[activeIdx]) : "";
  const isCurrent = activeIdx === currentIdx;

  return (
    <div className="flex flex-col gap-1">
      <p className="font-sans text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <p className="font-mono text-[20px] font-medium leading-none text-[var(--text-primary)]">
        {displayValue}
        <span className="font-sans text-[13px] font-normal text-[var(--text-muted)]">{unit}</span>
      </p>
      <p className={`font-sans text-[11px] ${isCurrent ? "text-[var(--text-muted)]" : "text-[var(--accent)]"}`}>
        {isCurrent ? "This week" : displayWeek}
      </p>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="mt-1 overflow-visible"
        aria-label={`${label} trend`}
      >
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--border)" strokeWidth={1} />
        <polyline
          points={buildPath(values)}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.4}
        />
        {/* current week dot */}
        <circle cx={curX} cy={curY} r={5} fill={color} opacity={0.95} />
        {/* hover dot */}
        {hovX !== null && hovY !== null && hoveredIdx !== currentIdx && (
          <circle cx={hovX} cy={hovY} r={3.5} fill={color} opacity={0.7} />
        )}
        {/* hit areas */}
        {values.map((_, i) => (
          <rect
            key={i}
            x={xOf(i) - 14}
            y={0}
            width={28}
            height={H}
            fill="transparent"
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            style={{ cursor: "crosshair" }}
          />
        ))}
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
    <div className="mt-6 flex flex-wrap gap-10 rounded border border-[var(--border)] bg-[var(--surface)] px-6 py-5">
      <Sparkline
        label="Weekly distance"
        values={trend.map((t) => t.distanceKm)}
        weekStarts={weekStarts}
        currentIdx={idx}
        unit=" km"
        color="var(--accent)"
        decimals={1}
      />
      <Sparkline
        label="Training load"
        values={trend.map((t) => t.acuteLoad)}
        weekStarts={weekStarts}
        currentIdx={idx}
        unit=" TSS"
        color="var(--status-warn)"
        decimals={0}
      />
    </div>
  );
}
