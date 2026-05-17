import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDaysIsoMonday, isoMondayLocal } from "@/lib/report/date";
import { currentPhase } from "@/lib/analytics/periodization";
import { RaceCountdownCard } from "@/components/domain/race-countdown-card";
import { RaceArc, type RaceArcWeek } from "@/components/domain/race-arc";
import { PredictedFinishCard } from "@/components/domain/predicted-finish-card";
import { AdvisoryBlock } from "@/components/ui/advisory-block";
import { HairlineCard } from "@/components/ui/hairline-card";
import { getPlannedSession } from "@/lib/plan/getPlannedSession";
import type { PlannedSessionEntry } from "@/lib/plan/types";
import type {
  AthleteHistorySlice,
  WorkoutForAnalysis,
} from "@/lib/analytics/types";
import { predictedFinish } from "@/lib/analytics/predictedFinish";
import { inferRecentRacePr } from "@/lib/analytics/inferRecentRacePr";
import { flags } from "@/lib/featureFlags";

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

/**
 * Compute and render the predicted-finish card. Returns null when the
 * prediction is ineligible — PRD §5.7 F14.B mandates silence.
 */
async function renderPredictedFinish(
  athleteId: string,
  race: { race_date: string; race_type: string | null },
  admin: ReturnType<typeof createAdminClient>,
  today: Date,
) {
  // Trailing 84-day workout window — enough to count 12 consistent weeks.
  const since = new Date(today.getTime() - 84 * 24 * 60 * 60 * 1000).toISOString();
  const { data: workoutsRaw } = await admin
    .from("workouts")
    .select(
      "id, source, sport_type, session_label, started_at, duration_seconds, distance_meters, avg_hr, max_hr, avg_cadence, training_stress",
    )
    .eq("athlete_id", athleteId)
    .gte("started_at", since)
    .order("started_at", { ascending: true });

  const recentWorkouts: WorkoutForAnalysis[] = ((workoutsRaw ?? []) as Array<
    Record<string, unknown>
  >).map((w) => ({
    id: String(w.id ?? ""),
    source: String(w.source ?? "strava"),
    sport_type: (w.sport_type as WorkoutForAnalysis["sport_type"]) ?? "other",
    session_label: typeof w.session_label === "string" ? w.session_label : null,
    started_at: String(w.started_at ?? ""),
    duration_seconds: Number(w.duration_seconds ?? 0),
    distance_meters: typeof w.distance_meters === "number" ? w.distance_meters : null,
    avg_hr: typeof w.avg_hr === "number" ? w.avg_hr : null,
    max_hr: typeof w.max_hr === "number" ? w.max_hr : null,
    avg_cadence: typeof w.avg_cadence === "number" ? w.avg_cadence : null,
    training_stress: typeof w.training_stress === "number" ? w.training_stress : null,
  }));

  // Pull a 365-day window for PR inference (separate from the 84-day
  // training-consistency window).
  const sinceYear = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
  const { data: yearRaw } = await admin
    .from("workouts")
    .select(
      "id, source, sport_type, session_label, started_at, duration_seconds, distance_meters",
    )
    .eq("athlete_id", athleteId)
    .gte("started_at", sinceYear)
    .order("started_at", { ascending: false })
    .limit(400);

  const yearWorkouts: WorkoutForAnalysis[] = ((yearRaw ?? []) as Array<
    Record<string, unknown>
  >).map((w) => ({
    id: String(w.id ?? ""),
    source: String(w.source ?? "strava"),
    sport_type: (w.sport_type as WorkoutForAnalysis["sport_type"]) ?? "other",
    session_label: typeof w.session_label === "string" ? w.session_label : null,
    started_at: String(w.started_at ?? ""),
    duration_seconds: Number(w.duration_seconds ?? 0),
    distance_meters: typeof w.distance_meters === "number" ? w.distance_meters : null,
    avg_hr: null,
    max_hr: null,
    avg_cadence: null,
    training_stress: null,
  }));

  const pr = inferRecentRacePr(yearWorkouts, today);

  const slice: AthleteHistorySlice = {
    athleteId,
    observedMaxHr: null,
    hrRest: null,
    sex: "male",
    recentRacePr: pr,
    recentWorkouts,
    recentWeeklyAnalyses: [],
  };

  const prediction = predictedFinish(
    { race_date: race.race_date, race_type: race.race_type },
    slice,
    { today },
  );

  if (!prediction.eligible) return null;

  return (
    <div className="mt-6">
      <PredictedFinishCard prediction={prediction} />
    </div>
  );
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

  const predictedFinishNode = flags.PREDICTED_FINISH
    ? await renderPredictedFinish(user.id, race, admin, today)
    : null;

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 md:px-8">
      <p className="font-sans text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
        <Link href="/dashboard" className="hover:text-[var(--text-secondary)]">
          ← Dashboard
        </Link>
      </p>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-sans text-xl font-bold tracking-tight">Race countdown</h1>
        <Link
          href="/race/fitness"
          className="rounded-sm border border-[var(--border)] px-2 py-1 font-sans text-[12px] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
        >
          Fitness trend →
        </Link>
      </div>

      <div className="mt-6">
        <RaceCountdownCard race={race} today={today} />
      </div>

      {predictedFinishNode}

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
