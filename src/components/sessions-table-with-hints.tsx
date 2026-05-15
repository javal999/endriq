"use client";

import { useState } from "react";
import type { BadgeTone } from "@/lib/report/model";

const TYPE_TOOLTIP =
  "Type is auto-classified from HR and distance: Easy (<75% max HR), Tempo (75–85%), Interval (wide HR range or short+hard), Long Run (>14 km), Strength (non-run), Recovery (easy + short).";

export function SessionsTableWithHints({
  sessions,
}: {
  sessions: Array<{
    workoutId: string;
    dateShort: string;
    typeLabel: string;
    distanceLabel: string;
    hrLabel: string;
    statusLabel: string;
    tone: BadgeTone;
  }>;
}) {
  const [showTypeInfo, setShowTypeInfo] = useState(false);

  return (
    <div className="overflow-x-auto rounded border border-[var(--border)] bg-[var(--surface)]">
      <table className="w-full min-w-[440px] border-collapse text-left text-[14px]">
        <thead>
          <tr className="border-b border-[var(--border)] font-sans text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
            <th scope="col" className="px-4 py-2">Date</th>
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
            <th scope="col" className="px-4 py-2">Distance</th>
            <th scope="col" className="px-4 py-2">Avg HR</th>
            <th scope="col" className="px-4 py-2 text-right">Status</th>
          </tr>
          {showTypeInfo && (
            <tr>
              <td colSpan={5} className="border-b border-[var(--border)] bg-[rgba(46,94,78,0.04)] px-4 py-2 font-sans text-[12px] leading-relaxed text-[var(--text-secondary)]">
                {TYPE_TOOLTIP}
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
  );
}

function SessionRow({
  row,
}: {
  row: {
    workoutId: string;
    dateShort: string;
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
      <td className="px-4 py-3 font-mono text-[13px]">{row.dateShort}</td>
      <td className="px-4 py-3 font-sans text-[13px] font-medium text-[var(--text-primary)]">
        {row.typeLabel}
      </td>
      <td className="px-4 py-3 font-mono text-[13px]">{row.distanceLabel}</td>
      <td className="px-4 py-3 font-mono text-[13px]">{row.hrLabel}</td>
      <td className="px-4 py-3 text-right">
        <span className={`inline-flex items-center gap-2 rounded-sm px-2 py-1 font-sans text-[12px] font-medium ${badge}`}>
          <span className="size-1.5 rounded-full bg-current" aria-hidden />
          {row.statusLabel}
        </span>
      </td>
    </tr>
  );
}
