/**
 * <ActivityRings> — three concentric SVG progress rings.
 *
 * Phase 2.1 T01. Used on /dashboard above the fold to surface weekly
 * progress against three targets (easy minutes, volume, strength sessions).
 *
 * Council fix #9 — `capAtTarget=true` (default) means the stroke arc
 * stops at 100% of circumference even when current > target. Sports-
 * science correctness: training more than planned isn't "better progress"
 * in a way the ring should reward visually.
 */

import type { CSSProperties } from "react";

export interface ActivityRing {
  id: "easy" | "volume" | "strength" | "custom";
  label: string;
  current: number;
  target: number;
  unit?: string;
  /** Override the ring's stroke colour. Default comes from the id. */
  color?: string;
}

export interface ActivityRingsProps {
  rings: ActivityRing[];
  /** SVG canvas edge in px. Default 160. */
  size?: number;
  /** Stroke width for each ring in px. Default 12. */
  strokeWidth?: number;
  /** When true, progress arc length is clamped to one full circle even if current > target. */
  capAtTarget?: boolean;
}

const RING_COLORS: Record<ActivityRing["id"], { stroke: string; track: string }> = {
  easy: {
    stroke: "var(--ring-easy)",
    track: "var(--ring-easy-track)",
  },
  volume: {
    stroke: "var(--ring-volume)",
    track: "var(--ring-volume-track)",
  },
  strength: {
    stroke: "var(--ring-strength)",
    track: "var(--ring-strength-track)",
  },
  custom: {
    stroke: "var(--accent)",
    track: "var(--accent-soft)",
  },
};

export function ActivityRings({
  rings,
  size = 160,
  strokeWidth = 12,
  capAtTarget = true,
}: ActivityRingsProps) {
  // Inner-most ring has the smallest radius. Each subsequent ring sits
  // outward with one stroke-width gap.
  const center = size / 2;
  const outerR = center - strokeWidth / 2 - 2;
  const ringGap = strokeWidth + 4;

  return (
    <svg
      role="img"
      aria-label={rings
        .map((r) => `${r.label}: ${r.current}/${r.target}${r.unit ? " " + r.unit : ""}`)
        .join("; ")}
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
    >
      {rings.map((ring, i) => {
        const r = outerR - i * ringGap;
        if (r <= 0) return null;
        const circumference = 2 * Math.PI * r;
        const rawFrac = ring.target > 0 ? ring.current / ring.target : 0;
        const frac = capAtTarget ? Math.min(1, rawFrac) : rawFrac;
        const dashLen = circumference * Math.max(0, frac);
        const colours = RING_COLORS[ring.id];
        const strokeColor = ring.color ?? colours.stroke;
        const trackColor = colours.track;
        const sharedStyle: CSSProperties = {
          fill: "none",
          strokeWidth,
          strokeLinecap: "round",
        };
        return (
          <g key={ring.id} transform={`rotate(-90 ${center} ${center})`}>
            <circle
              cx={center}
              cy={center}
              r={r}
              style={{ ...sharedStyle, stroke: trackColor }}
            />
            {dashLen > 0 && (
              <circle
                cx={center}
                cy={center}
                r={r}
                style={{
                  ...sharedStyle,
                  stroke: strokeColor,
                  strokeDasharray: `${dashLen} ${circumference}`,
                }}
              >
                <title>{`${ring.label}: ${ring.current}/${ring.target}${ring.unit ? " " + ring.unit : ""}`}</title>
              </circle>
            )}
          </g>
        );
      })}
    </svg>
  );
}
