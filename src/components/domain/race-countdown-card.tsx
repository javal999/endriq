/**
 * <RaceCountdownCard> — F14.A surface.
 *
 * Single glass card that anchors to the athlete's primary race:
 *   - Race name + date
 *   - Days / weeks remaining (large display in mono)
 *   - Current periodisation phase pill
 *   - This week's focus blurb (from PHASE_FOCUS_COPY)
 *   - Link to /race for the full arc view
 *
 * Renders on /dashboard when a primary race exists. PRD §5.7 F14.A.
 */

import Link from "next/link";
import { GlassCard } from "@/components/ui/glass-card";
import {
  PHASE_FOCUS_COPY_EN,
  PHASE_FOCUS_COPY_ID,
  PhasePill,
} from "@/components/data/phase-pill";
import {
  currentPhase,
  daysToRace,
  type PrimaryRaceLike,
} from "@/lib/analytics/periodization";

const RACE_TYPE_LABELS: Record<string, string> = {
  marathon: "Marathon",
  half_marathon: "Half marathon",
  "10k": "10K",
  "5k": "5K",
  ultramarathon: "Ultramarathon",
  ironman_70_3: "Ironman 70.3",
  ironman_full: "Ironman (full)",
  other_endurance: "Race",
};

export interface RaceCountdownCardProps {
  race: PrimaryRaceLike & { name?: string };
  locale?: "en" | "id";
  /** Override "today" for testing. */
  today?: Date;
}

export function RaceCountdownCard({
  race,
  locale = "en",
  today,
}: RaceCountdownCardProps) {
  const t = today ?? new Date();
  const phase = currentPhase(race, t);
  const dtr = daysToRace(race, t);
  const focusCopy = locale === "id" ? PHASE_FOCUS_COPY_ID : PHASE_FOCUS_COPY_EN;

  const heading = race.name ?? (race.race_type ? RACE_TYPE_LABELS[race.race_type] ?? "Race" : "Race");

  return (
    <GlassCard ariaLabel="Race countdown">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-sans text-[18px] font-medium text-[var(--text-primary)] [font-family:var(--font-display),Inter,sans-serif]">
            {heading}
          </h2>
          <span className="font-mono text-[12px] text-[var(--text-secondary)]">
            {race.race_date}
          </span>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {dtr == null ? (
            <span className="font-sans text-[14px] text-[var(--text-muted)]">
              No race date set
            </span>
          ) : dtr < 0 ? (
            <p className="font-sans text-[14px] text-[var(--text-secondary)]">
              {Math.abs(dtr)} day{Math.abs(dtr) === 1 ? "" : "s"} ago
            </p>
          ) : (
            <>
              <span className="font-mono text-[28px] leading-[32px] font-medium text-[var(--text-primary)]">
                {dtr}
              </span>
              <span className="font-sans text-[14px] text-[var(--text-secondary)]">
                day{dtr === 1 ? "" : "s"} to go
                {dtr >= 7 && (
                  <span className="ml-1 text-[var(--text-muted)]">
                    ({Math.floor(dtr / 7)} week{Math.floor(dtr / 7) === 1 ? "" : "s"} {dtr % 7 > 0 ? `+ ${dtr % 7}d` : ""})
                  </span>
                )}
              </span>
            </>
          )}
        </div>

        <div>
          <PhasePill phase={phase} locale={locale} />
          <p className="mt-2 italic [font-family:var(--font-serif),Georgia,serif] text-[14px] leading-[22px] text-[var(--text-secondary)]">
            {focusCopy[phase]}
          </p>
        </div>

        <div className="pt-1">
          <Link
            href="/race"
            className="inline-flex items-center font-sans text-[13px] font-medium text-[var(--accent)] underline underline-offset-2"
          >
            View full plan →
          </Link>
        </div>
      </div>
    </GlassCard>
  );
}
