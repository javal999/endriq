"use client";

import { useState } from "react";
import type { BadgeTone } from "@/lib/report/model";

export function SessionsTableWithHints({
  sessions,
  explanations,
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
  explanations: Record<string, string>;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto rounded border border-[var(--border)] bg-[var(--surface)]">
      <table className="w-full min-w-[520px] border-collapse text-left text-[14px]">
        <thead>
          <tr className="border-b border-[var(--border)] font-sans text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
            <th scope="col" className="px-4 py-2">
              Date
            </th>
            <th scope="col" className="px-4 py-2">
              Type
            </th>
            <th scope="col" className="px-4 py-2">
              Distance
            </th>
            <th scope="col" className="px-4 py-2">
              Avg HR
            </th>
            <th scope="col" className="px-4 py-2 text-right">
              Status
            </th>
            <th scope="col" className="px-4 py-2 text-right text-[10px] font-normal normal-case">
              Why
            </th>
          </tr>
        </thead>
        <tbody className="text-[var(--text-secondary)]">
          {sessions.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="px-4 py-6 text-center font-sans text-[13px] text-[var(--text-muted)]"
              >
                No sessions in this window.
              </td>
            </tr>
          ) : (
            sessions.map((row) => (
              <SessionBlock
                key={row.workoutId}
                row={row}
                explanation={explanations[row.workoutId] ?? ""}
                open={openId === row.workoutId}
                onToggle={() =>
                  setOpenId((cur) =>
                    cur === row.workoutId ? null : row.workoutId,
                  )
                }
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function SessionBlock({
  row,
  explanation,
  open,
  onToggle,
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
  explanation: string;
  open: boolean;
  onToggle: () => void;
}) {
  const badge =
    row.tone === "good"
      ? "bg-[rgba(46,125,91,0.08)] text-[var(--status-good)]"
      : row.tone === "warn"
        ? "bg-[rgba(184,122,10,0.08)] text-[var(--status-warn)]"
        : "bg-[rgba(196,75,63,0.06)] text-[var(--status-bad)]";

  return (
    <>
      <tr className="border-b border-[var(--surface-raised)]">
        <td className="px-4 py-3 font-mono text-[13px]">{row.dateShort}</td>
        <td className="px-4 py-3 font-sans text-[13px] font-medium text-[var(--text-primary)]">
          {row.typeLabel}
        </td>
        <td className="px-4 py-3 font-mono text-[13px]">{row.distanceLabel}</td>
        <td className="px-4 py-3 font-mono text-[13px]">{row.hrLabel}</td>
        <td className="px-4 py-3 text-right">
          <span
            className={`inline-flex items-center gap-2 rounded-sm px-2 py-1 font-sans text-[12px] font-medium ${badge}`}
          >
            <span className="size-1.5 rounded-full bg-current" aria-hidden />
            {row.statusLabel}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <button
            type="button"
            onClick={onToggle}
            className="font-sans text-[12px] font-medium text-[var(--accent)] underline-offset-2 hover:underline"
            aria-expanded={open}
          >
            {open ? "Hide" : "Explain"}
          </button>
        </td>
      </tr>
      {open ? (
        <tr className="border-b border-[var(--surface-raised)] bg-[rgba(46,94,78,0.04)]">
          <td colSpan={6} className="px-4 pb-4 pt-1 font-sans text-[13px] leading-relaxed text-[var(--text-secondary)]">
            {explanation || "No explanation available for this session."}
          </td>
        </tr>
      ) : null}
    </>
  );
}
