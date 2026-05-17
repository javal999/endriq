import { createAdminClient } from "@/lib/supabase/admin";
import { getPlannedSession } from "@/lib/plan/getPlannedSession";
import {
  isoDateToWeekday,
  type PlannedSessionEntry,
} from "@/lib/plan/types";
import { HairlineCard } from "@/components/ui/hairline-card";
import { SessionTypeChip } from "@/components/inputs/session-type-chip";
import { addDaysIsoMonday } from "@/lib/report/date";

/**
 * Read-only 7-day strip of the planned week. Uses getPlannedSession (the
 * only legal read path for plan data — architecture A2) for each date so
 * the typical-week-pattern fallback + per-date override merge happens in
 * one place.
 *
 * Renders as a 7-column grid on desktop, vertical stack on mobile.
 * Each day card shows session-type chips; empty days show "Rest" hint.
 *
 * Refs: PHASE-2.0-BUILD.md T08; PHASE-2.0-ARCHITECTURE.md §5.2 (A2).
 */

const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAY_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export async function PlannedWeekStrip({
  athleteId,
  weekStart,
}: {
  athleteId: string;
  weekStart: string;
}) {
  // Admin client because we're reading the athlete's own data on their
  // own page; RLS context still applies via athleteId scoping in
  // getPlannedSession (it always filters by athlete_id). The user-session
  // client would also work; admin chosen for consistency with the rest
  // of the server page's data path.
  const db = createAdminClient();

  const dates = Array.from({ length: 7 }, (_, i) =>
    addDaysIsoMonday(weekStart, i),
  );

  const sessionsByDate = await Promise.all(
    dates.map((d) => getPlannedSession(athleteId, d, db)),
  );

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
      {dates.map((isoDate, i) => {
        const day = sessionsByDate[i];
        const weekday = isoDateToWeekday(isoDate);
        const isToday = isoDate === today;
        const hasSessions = day.sessions.length > 0;
        return (
          <HairlineCard
            key={isoDate}
            emphasised={isToday}
            className="flex min-h-[100px] flex-col gap-2"
          >
            <p className="flex items-center justify-between font-sans text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
              <span>
                <span className="hidden md:inline">{WEEKDAY_SHORT[weekday]}</span>
                <span className="md:hidden">{WEEKDAY_LONG[weekday]}</span>
              </span>
              <span className="font-mono normal-case tracking-normal text-[10px]">
                {isoDate.slice(5)}
              </span>
            </p>
            <div className="flex flex-wrap gap-1">
              {hasSessions ? (
                day.sessions.map((s: PlannedSessionEntry, j: number) => (
                  <SessionTypeChip
                    key={`${s.type}-${j}`}
                    type={s.type}
                    href={s.type === "strength" ? "/session/strength" : undefined}
                  />
                ))
              ) : (
                <span className="font-sans text-[12px] italic text-[var(--text-muted)]">
                  Rest
                </span>
              )}
            </div>
            {day.isOverride && (
              <p className="mt-auto font-sans text-[10px] uppercase tracking-wider text-[var(--accent)]">
                Override
              </p>
            )}
          </HairlineCard>
        );
      })}
    </div>
  );
}
