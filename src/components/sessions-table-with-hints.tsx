"use client";

import { useEffect, useState } from "react";
import type { BadgeTone } from "@/lib/report/model";

/**
 * Renders an ISO timestamp in the browser's local timezone. SSR shows the
 * server-formatted fallback briefly; on hydration we replace it with the
 * locally-formatted date, which produces the right weekday for athletes
 * outside UTC. Fixes the bug where a Sunday-AM run in Jakarta showed up
 * as "Saturday" because the server was UTC.
 */
function ClientLocalDate({
  iso,
  fallback,
}: {
  iso: string | undefined;
  fallback: string;
}) {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    if (!iso) return;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLabel(
      d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" }),
    );
  }, [iso]);
  return <>{label ?? fallback}</>;
}

// All possible type labels from sessionTypeLabel()
const TYPE_CLASSIFICATION = [
  { label: "Easy run", rule: "avg HR < 75% max HR, labelled easy" },
  { label: "Intervals", rule: "avg HR ≥ 82% max HR, or labelled interval" },
  { label: "Tempo", rule: "avg HR 75–85% max HR, labelled tempo" },
  { label: "Long run", rule: "distance > 14 km" },
  { label: "Recovery run", rule: "labelled recovery" },
  { label: "Strength", rule: "non-run workout" },
  { label: "Bike", rule: "cycling activity" },
  { label: "Other", rule: "activity type not specifically classified (e.g., swim, walk, hike)" },
];

// All possible status labels from sessionHrStatus()
const STATUS_LEGEND = [
  { label: "Good", tone: "good" as BadgeTone, meaning: "HR matched expected effort for this session type" },
  { label: "Too hard", tone: "bad" as BadgeTone, meaning: "Easy or recovery run had HR above 78% max — not actually easy" },
  { label: "Low intensity", tone: "warn" as BadgeTone, meaning: "Interval or tempo session had HR below 82% max — may not have reached target effort" },
  { label: "Watch", tone: "warn" as BadgeTone, meaning: "Long run HR exceeded 82% max — pacing may have been too aggressive" },
  { label: "No HR", tone: "warn" as BadgeTone, meaning: "No heart rate data available for this session" },
];

export function SessionsTableWithHints({
  sessions,
}: {
  sessions: Array<{
    workoutId: string;
    dateShort: string;
    startedAtIso?: string;
    typeLabel: string;
    distanceLabel: string;
    hrLabel: string;
    statusLabel: string;
    tone: BadgeTone;
  }>;
}) {
  const [showTypeInfo, setShowTypeInfo] = useState(false);

  return (
    <div>
      <div className="overflow-x-auto rounded border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full border-collapse text-left text-[14px]">
          <thead>
            <tr className="border-b border-[var(--border)] font-sans text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
              <th scope="col" className="px-4 py-2 w-[90px]">Date</th>
              <th scope="col" className="px-4 py-2">
                <span className="flex items-center gap-1">
                  Type
                  <button
                    type="button"
                    onClick={() => setShowTypeInfo((v) => !v)}
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-raised)] font-sans text-[9px] font-bold text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors normal-case"
                    aria-label="How is type classified?"
                  >
                    i
                  </button>
                </span>
              </th>
              <th scope="col" className="px-4 py-2 w-[110px]">Distance</th>
              <th scope="col" className="px-4 py-2 w-[100px]">Avg HR</th>
              <th scope="col" className="px-4 py-2 w-[120px] text-right">Status</th>
            </tr>
            {showTypeInfo && (
              <tr>
                <td colSpan={5} className="border-b border-[var(--border)] bg-[rgba(46,94,78,0.04)] px-4 py-3">
                  <p className="font-sans text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">How type is classified</p>
                  <ul className="grid gap-1 sm:grid-cols-2">
                    {TYPE_CLASSIFICATION.map((t) => (
                      <li key={t.label} className="font-sans text-[12px] text-[var(--text-secondary)]">
                        <span className="font-medium text-[var(--text-primary)]">{t.label}</span>
                        {" — "}{t.rule}
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            )}
          </thead>
          <tbody className="text-[var(--text-secondary)]">
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center font-sans text-[13px] text-[var(--text-muted)]">
                  No sessions in this window.
                </td>
              </tr>
            ) : (
              sessions.map((row) => <SessionRow key={row.workoutId} row={row} />)
            )}
          </tbody>
        </table>
      </div>

      {/* Status legend — all possible values */}
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 font-sans text-[11px] text-[var(--text-muted)]">
        {STATUS_LEGEND.map((s) => {
          const dot =
            s.tone === "good"
              ? "bg-[var(--status-good)]"
              : s.tone === "bad"
                ? "bg-[var(--status-bad)]"
                : "bg-[var(--status-warn)]";
          return (
            <span key={s.label} className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${dot}`} aria-hidden />
              <strong className="font-medium text-[var(--text-secondary)]">{s.label}</strong>
              {" — "}{s.meaning}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function SessionRow({
  row,
}: {
  row: {
    workoutId: string;
    dateShort: string;
    startedAtIso?: string;
    typeLabel: string;
    distanceLabel: string;
    hrLabel: string;
    statusLabel: string;
    tone: BadgeTone;
  };
}) {
  const badge =
    row.tone === "good"
      ? "bg-[rgba(46,125,91,0.08)] text-[var(--status-good)]"
      : row.tone === "warn"
        ? "bg-[rgba(184,122,10,0.08)] text-[var(--status-warn)]"
        : "bg-[rgba(196,75,63,0.06)] text-[var(--status-bad)]";

  return (
    <tr className="border-b border-[var(--surface-raised)] last:border-0">
      <td className="px-4 py-3 font-mono text-[13px]">
        <ClientLocalDate iso={row.startedAtIso} fallback={row.dateShort} />
      </td>
      <td className="px-4 py-3 font-sans text-[13px] font-medium text-[var(--text-primary)]">{row.typeLabel}</td>
      <td className="px-4 py-3 font-mono text-[13px]">{row.distanceLabel}</td>
      <td className="px-4 py-3 font-mono text-[13px]">{row.hrLabel}</td>
      <td className="px-4 py-3 text-right">
        <span className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-1 font-sans text-[12px] font-medium whitespace-nowrap ${badge}`}>
          <span className="size-1.5 rounded-full bg-current" aria-hidden />
          {row.statusLabel}
        </span>
      </td>
    </tr>
  );
}
