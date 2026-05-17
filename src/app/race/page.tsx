import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDaysIsoMonday, isoMondayLocal } from "@/lib/report/date";
import { currentPhase } from "@/lib/analytics/periodization";
import { RaceCountdownCard } from "@/components/domain/race-countdown-card";
import { RaceArc, type RaceArcWeek } from "@/components/domain/race-arc";
import { AdvisoryBlock } from "@/components/ui/advisory-block";
import { HairlineCard } from "@/components/ui/hairline-card";
import { getPlannedSession } from "@/lib/plan/getPlannedSession";
import type { PlannedSessionEntry } from "@/lib/plan/types";

/**
 * /race — F14.A 22-week race arc + countdown.
 *
 * Reads the athlete's primary race (T03) and renders:
 *   - <RaceCountdownCard> at the top
 *   - <RaceArc> below — 22-week strip ending at race week
 *
 * Each week's planned volume is computed from the typical-week pattern
 * for that calendar week (5km / 8km / 12km estimates per session type).
 * Past weeks read actual volume from weekly_analyses. Phase is computed
 * via currentPhase() with that week's Monday as "today" so the colour
 * progression mirrors the season.
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.7 F14.A; PHASE-2.0-BUILD.md T10.
 */

export const metadata = { title: "Race countdown — EnduranceIQ" };

const SESSION_KM_ESTIMATE: Record<string, number> = {
  easy_run: 8,
  long_run: 18,
  tempo: 10,
  interval: 8,
  drill: 4,
  strides: 5,
  recovery: 5,
  swim: 0, // running km only
  bike: 0,
  cross_training: 0,
  strength: 0,
  rest: 0,
};

function estimateWeekKm(sessions: PlannedSessionEntry[]): number {
  let total = 0;
  for (const s of sessions) total += SESSION_KM_ESTIMATE[s.type] ?? 0;
  return total;
}

export default async function RacePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/login?redirect=${encodeURIComponent("/race")}`);
  }

  const admin = createAdminClient();

  const { data: primaryRaceRow } = await admin
    .from("races")
    .select("id, name, race_date, race_type")
    .eq("athlete_id", user.id)
    .eq("is_primary", true)
    .maybeSingle();

  if (!primaryRaceRow) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10 md:px-8">
        <p className="font-sans text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
          <Link href="/dashboard" className="hover:text-[var(--text-secondary)]">
            ← Dashboard
          </Link>
        </p>
        <h1 className="mt-2 font-sans text-xl font-bold tracking-tight">Race countdown</h1>
        <div className="mt-6">
          <AdvisoryBlock tone="info">
            <p className="font-sans text-[14px] text-[var(--text-primary)]">
              No primary race set. Add one in{" "}
              <Link href="/settings/races" className="underline">
                Settings → Races
              </Link>{" "}
              to see the countdown and 22-week arc.
            </p>
          </AdvisoryBlock>
        </div>
      </div>
    );
  }

  const race = {
    name: typeof primaryRaceRow.name === "string" ? primaryRaceRow.name : undefined,
    race_date: String(primaryRaceRow.race_date),
    race_type:
      typeof primaryRaceRow.race_type === "string" ? primaryRaceRow.race_type : null,
  };

  // Compute the 22-week arc: race week is the last column, current week's
  // Monday sits inside it. We anchor on race_date's containing Monday and
  // walk back 21 weeks.
  const raceMondayMs = Date.UTC(
    Number(race.race_date.slice(0, 4)),
    Number(race.race_date.slice(5, 7)) - 1,
    Number(race.race_date.slice(8, 10)),
  );
  const raceMondayDate = new Date(raceMondayMs);
  const raceMondayJsDay = raceMondayDate.getUTCDay();
  const raceMondayShift = raceMondayJsDay === 0 ? -6 : 1 - raceMondayJsDay;
  const raceWeekStart = new Date(raceMondayMs + raceMondayShift * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const arcStartWeek = addDaysIsoMonday(raceWeekStart, -21 * 7);

  // Past weekly_analyses for actual volume.
  const { data: weeklyAnalysesRows } = await admin
    .from("weekly_analyses")
    .select("week_start, total_distance_meters")
    .eq("athlete_id", user.id)
    .gte("week_start", arcStartWeek)
    .lte("week_start", raceWeekStart)
    .order("week_start", { ascending: true });

  const completedByWeek: Map<string, number> = new Map();
  for (const r of weeklyAnalysesRows ?? []) {
    if (typeof r.week_start === "string" && typeof r.total_distance_meters === "number") {
      completedByWeek.set(r.week_start, r.total_distance_meters / 1000);
    }
  }

  // Planned volume per week — derive from typical-week pattern by reading
  // each Monday via getPlannedSession (handles overrides).
  const today = new Date();
  const todayMonday = isoMondayLocal(today);

  const weeks: RaceArcWeek[] = [];
  for (let i = 0; i < 22; i++) {
    const weekStart = addDaysIsoMonday(arcStartWeek, i * 7);

    // Planned km: sum sessions across the week.
    let plannedKm = 0;
    for (let d = 0; d < 7; d++) {
      const dayIso = addDaysIsoMonday(weekStart, d);
      const day = await getPlannedSession(user.id, dayIso, admin);
      plannedKm += estimateWeekKm(day.sessions);
    }

    // Phase as of this week's Monday.
    const phase = currentPhase(race, new Date(`${weekStart}T00:00:00Z`));

    weeks.push({
      weekStart,
      plannedKm,
      completedKm: completedByWeek.get(weekStart),
      phase,
      isCurrent: weekStart === todayMonday,
      isRaceWeek: weekStart === raceWeekStart,
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 md:px-8">
      <p className="font-sans text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
        <Link href="/dashboard" className="hover:text-[var(--text-secondary)]">
          ← Dashboard
        </Link>
      </p>
      <h1 className="mt-2 font-sans text-xl font-bold tracking-tight">Race countdown</h1>

      <div className="mt-6">
        <RaceCountdownCard race={race} today={today} />
      </div>

      <section aria-labelledby="arc-heading" className="mt-10">
        <h2
          id="arc-heading"
          className="font-sans text-[13px] font-medium uppercase tracking-wider text-[var(--text-muted)]"
        >
          22-week arc
        </h2>
        <HairlineCard className="mt-3">
          <RaceArc weeks={weeks} />
          <p className="mt-3 font-sans text-[11px] italic text-[var(--text-muted)]">
            Faded bar = planned weekly volume. Solid bar = actual (past
            weeks only). Today&apos;s column is highlighted. Hover a column
            for week details.
          </p>
        </HairlineCard>
      </section>
    </div>
  );
}
