"use client";

/**
 * <TypicalWeekPlanner> — 7-day grid of session-type chips.
 *
 * Pure state machine: parent owns the value, planner emits updates. No
 * direct DB access — that's the parent's job (server action / route).
 * Below the grid the strength-placement advisories render inline.
 *
 * Mobile: vertical stack of 7 day cards. Desktop: 7-column grid.
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.2 F9; PHASE-2.0-UI-DESIGN.md §3.3 + §4.4.
 */

import { useMemo, useState } from "react";
import {
  SESSION_TYPE_LABELS,
  SessionTypeChip,
} from "@/components/inputs/session-type-chip";
import { HairlineCard } from "@/components/ui/hairline-card";
import { AdvisoryBlock } from "@/components/ui/advisory-block";
import { checkStrengthPlacement } from "@/lib/plan/strengthPlacement";
import type {
  PlannedSessionEntry,
  SessionType,
  TypicalWeekPattern,
  WeekdayIndex,
} from "@/lib/plan/types";

const ALL_TYPES: SessionType[] = [
  "easy_run",
  "long_run",
  "tempo",
  "interval",
  "drill",
  "strides",
  "recovery",
  "swim",
  "bike",
  "cross_training",
  "strength",
  "rest",
];

const WEEKDAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface TypicalWeekPlannerProps {
  /** Controlled value. The parent owns persistence. */
  value: TypicalWeekPattern;
  onChange: (next: TypicalWeekPattern) => void;
  /** Hide advisories block (useful in compact contexts like onboarding modals). */
  hideAdvisories?: boolean;
}

export function TypicalWeekPlanner({ value, onChange, hideAdvisories }: TypicalWeekPlannerProps) {
  const [openDay, setOpenDay] = useState<WeekdayIndex | null>(null);

  // Materialise the pattern as a 7-slot lookup, easier for rendering.
  const byDay = useMemo(() => {
    const map: Record<WeekdayIndex, PlannedSessionEntry[]> = {
      0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
    };
    for (const d of value) {
      if (d.weekday >= 0 && d.weekday < 7) map[d.weekday] = d.sessions;
    }
    return map;
  }, [value]);

  const placement = useMemo(() => checkStrengthPlacement(value), [value]);

  function updateDay(weekday: WeekdayIndex, nextSessions: PlannedSessionEntry[]) {
    const cleaned = value.filter((d) => d.weekday !== weekday);
    if (nextSessions.length > 0) cleaned.push({ weekday, sessions: nextSessions });
    cleaned.sort((a, b) => a.weekday - b.weekday);
    onChange(cleaned);
  }

  function toggleSession(weekday: WeekdayIndex, type: SessionType) {
    const current = byDay[weekday];
    const idx = current.findIndex((s) => s.type === type);
    if (idx >= 0) {
      // Remove
      updateDay(weekday, current.filter((_, i) => i !== idx));
    } else {
      // If adding any non-rest, drop any existing 'rest'.
      const filtered = type !== "rest" ? current.filter((s) => s.type !== "rest") : current;
      // If adding 'rest', drop everything else.
      if (type === "rest") {
        updateDay(weekday, [{ type: "rest" }]);
      } else {
        updateDay(weekday, [...filtered, { type }]);
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
        {Array.from({ length: 7 }, (_, w) => {
          const weekday = w as WeekdayIndex;
          const sessions = byDay[weekday];
          const hasWarning = placement.advisories.some(
            (a) => a.weekday === weekday && a.severity !== "info",
          );
          return (
            <HairlineCard
              key={weekday}
              emphasised={hasWarning}
              className="flex min-h-[120px] flex-col gap-2"
            >
              <p className="font-sans text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                <span className="hidden md:inline">{WEEKDAY_SHORT[weekday]}</span>
                <span className="md:hidden">{WEEKDAY_NAMES[weekday]}</span>
              </p>
              <div className="flex flex-wrap gap-1">
                {sessions.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => setOpenDay(weekday)}
                    className="rounded-sm border border-dashed border-[var(--border)] px-2 py-1 font-sans text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    + Add
                  </button>
                ) : (
                  <>
                    {sessions.map((s, i) => (
                      <SessionTypeChip
                        key={`${s.type}-${i}`}
                        type={s.type}
                        onRemove={() => toggleSession(weekday, s.type)}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => setOpenDay(weekday)}
                      className="rounded-sm border border-dashed border-[var(--border)] px-1.5 py-0.5 font-sans text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      +
                    </button>
                  </>
                )}
              </div>
            </HairlineCard>
          );
        })}
      </div>

      {openDay !== null && (
        <HairlineCard emphasised>
          <div className="flex items-center justify-between">
            <h3 className="font-sans text-[15px] font-semibold">
              {WEEKDAY_NAMES[openDay]}
            </h3>
            <button
              type="button"
              onClick={() => setOpenDay(null)}
              className="rounded-sm px-2 py-1 font-sans text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              aria-label="Close"
            >
              Done
            </button>
          </div>
          <p className="mt-1 font-sans text-[13px] text-[var(--text-secondary)]">
            Tap to add or remove. Multiple per day allowed.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ALL_TYPES.map((type) => {
              const selected = byDay[openDay].some((s) => s.type === type);
              return (
                <SessionTypeChip
                  key={type}
                  type={type}
                  selected={selected}
                  onClick={() => toggleSession(openDay, type)}
                />
              );
            })}
          </div>
          <p className="mt-3 font-sans text-[12px] text-[var(--text-muted)]">
            Selected: {byDay[openDay].map((s) => SESSION_TYPE_LABELS[s.type]).join(", ") || "none"}
          </p>
        </HairlineCard>
      )}

      {!hideAdvisories && placement.advisories.length > 0 && (
        <div className="space-y-2">
          {placement.advisories.map((a, i) => (
            <AdvisoryBlock key={i} tone={a.severity === "info" ? "info" : "warn"}>
              <p className="font-sans text-[13px] text-[var(--text-primary)]">{a.message}</p>
            </AdvisoryBlock>
          ))}
        </div>
      )}
    </div>
  );
}
