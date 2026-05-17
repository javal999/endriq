/**
 * <RaceArc> — F14.A 22-week race-countdown calendar.
 *
 * SVG. Each column is one week, ordered left → right (oldest planned week
 * on the left, race-day on the right). Column height = relative planned
 * volume; column fill color = periodisation phase. Today's column has a
 * subtle accent overlay. Race-day column carries a flag icon.
 *
 * Pure render — parent computes the per-week input.
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.7 F14.A; PHASE-2.0-UI-DESIGN.md §4.3.
 */

import type { PeriodizationPhase } from "@/lib/analytics/periodization";

export interface RaceArcWeek {
  /** ISO Monday of this week (YYYY-MM-DD). */
  weekStart: string;
  /** Planned weekly volume in kilometres. */
  plannedKm: number;
  /** Completed weekly volume in km, if this week is in the past. */
  completedKm?: number;
  /** Phase label for the week's hue. */
  phase: PeriodizationPhase;
  /** True iff this week's Monday is today's Monday. */
  isCurrent: boolean;
  /** True iff this is the week containing race_date. */
  isRaceWeek: boolean;
  /** Optional one-line label rendered in the tooltip (e.g. "long run 32km"). */
  keyNote?: string;
}

const PHASE_FILL: Record<PeriodizationPhase, string> = {
  transition: "var(--phase-transition)",
  general_prep: "var(--phase-general-prep)",
  specific_prep: "var(--phase-specific-prep)",
  pre_competition: "var(--phase-pre-competition)",
  taper: "var(--phase-taper)",
  race_week: "var(--phase-race-week)",
  recovery: "var(--phase-recovery)",
};

export interface RaceArcProps {
  weeks: RaceArcWeek[];
  /** SVG height in px. Default 200. */
  height?: number;
}

export function RaceArc({ weeks, height = 200 }: RaceArcProps) {
  if (weeks.length === 0) return null;

  const maxKm = Math.max(1, ...weeks.map((w) => Math.max(w.plannedKm, w.completedKm ?? 0)));
  // Layout constants
  const colGap = 4;
  const colWidth = 16;
  const labelHeight = 28;
  const usableHeight = height - labelHeight - 12;
  const totalWidth = weeks.length * (colWidth + colGap);

  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label={`Race countdown — ${weeks.length} weeks`}
        viewBox={`0 0 ${totalWidth} ${height}`}
        width={totalWidth}
        height={height}
        className="block"
      >
        {weeks.map((w, i) => {
          const x = i * (colWidth + colGap);
          const plannedH = Math.max(2, (w.plannedKm / maxKm) * usableHeight);
          const completedH = w.completedKm != null
            ? Math.max(2, (w.completedKm / maxKm) * usableHeight)
            : null;
          const yPlanned = usableHeight - plannedH;
          const yCompleted = completedH != null ? usableHeight - completedH : 0;
          return (
            <g key={w.weekStart}>
              {w.isCurrent && (
                <rect
                  x={x - 1}
                  y={0}
                  width={colWidth + 2}
                  height={usableHeight + labelHeight}
                  fill="rgba(46, 94, 78, 0.08)"
                />
              )}

              {/* Planned bar (faded). */}
              <rect
                x={x}
                y={yPlanned}
                width={colWidth}
                height={plannedH}
                fill={PHASE_FILL[w.phase]}
                opacity={w.completedKm != null ? 0.35 : 0.9}
                rx={2}
              >
                <title>
                  {tooltipText(w)}
                </title>
              </rect>

              {/* Completed bar (solid, on top of planned). */}
              {completedH != null && (
                <rect
                  x={x}
                  y={yCompleted}
                  width={colWidth}
                  height={completedH}
                  fill={PHASE_FILL[w.phase]}
                  opacity={0.95}
                  rx={2}
                >
                  <title>{tooltipText(w)}</title>
                </rect>
              )}

              {/* Race flag */}
              {w.isRaceWeek && (
                <text
                  x={x + colWidth / 2}
                  y={usableHeight - plannedH - 4}
                  textAnchor="middle"
                  fontSize={11}
                  fill="var(--phase-race-week)"
                >
                  🏁
                </text>
              )}

              {/* Bottom label — week-of date abbreviation */}
              <text
                x={x + colWidth / 2}
                y={usableHeight + 14}
                textAnchor="middle"
                fontSize={9}
                fill="var(--text-muted)"
                fontFamily="ui-monospace, monospace"
              >
                {w.weekStart.slice(5)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function tooltipText(w: RaceArcWeek): string {
  const parts: string[] = [
    `Week of ${w.weekStart}`,
    `Phase: ${w.phase.replace("_", " ")}`,
    `Planned: ${w.plannedKm.toFixed(1)} km`,
  ];
  if (w.completedKm != null) parts.push(`Actual: ${w.completedKm.toFixed(1)} km`);
  if (w.keyNote) parts.push(w.keyNote);
  return parts.join("\n");
}
