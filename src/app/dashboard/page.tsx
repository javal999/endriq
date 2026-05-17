import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isoMondayLocal } from "@/lib/report/date";
import { citationToLink } from "@/lib/data/citations";
import { ProfileCompletenessBanner } from "@/components/profile-completeness-banner";
import { RaceCountdownCard } from "@/components/domain/race-countdown-card";
import { PreSessionPreviewCard } from "@/components/domain/pre-session-preview-card";
import { TodaysPlanTile } from "@/components/domain/todays-plan-tile";
import { DailyJournalCard } from "@/components/domain/daily-journal-card";
import { AdvisoryBlock } from "@/components/ui/advisory-block";
import {
  getPlannedSession,
  getTypicalWeekPattern,
} from "@/lib/plan/getPlannedSession";
import {
  shouldRecommendRestDay,
  type Feeling,
} from "@/lib/analytics/recoveryOverride";
import { computeTodaysPlan } from "@/lib/analytics/todaysPlan";
import { currentPhase } from "@/lib/analytics/periodization";

export default async function DashboardPage() {
  const week = isoMondayLocal();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const liveReportHref = user
    ? `/report/${user.id}/${week}`
    : `/report/demo/${week}`;

  // Compute missing profile fields for the completeness banner
  const missingProfileFields: string[] = [];
  if (user) {
    const { data: athlete } = await supabase
      .from("athletes")
      .select("hr_rest, sex, goal_race_type, goal_race_date, goal_weekly_km, observed_max_hr")
      .eq("id", user.id)
      .maybeSingle();

    if (athlete) {
      if (athlete.hr_rest == null) missingProfileFields.push("hr_rest");
      if (!athlete.sex) missingProfileFields.push("sex");
      if (
        athlete.goal_race_type &&
        athlete.goal_race_type !== "general_fitness" &&
        !athlete.goal_race_date
      ) {
        missingProfileFields.push("goal_race_date");
      }
      if (!athlete.goal_weekly_km) missingProfileFields.push("goal_weekly_km");
      if (!athlete.observed_max_hr) missingProfileFields.push("observed_max_hr");
    }
  }

  const seilerLink = citationToLink("seiler_2010");
  const stogglLink = citationToLink("stoggl_sperlich_2014");
  const gabbettLink = citationToLink("gabbett_2016");
  const fyfeLink = citationToLink("fyfe_2014");

  // T10: primary race for countdown card. Admin client so RLS doesn't
  // interfere with the read (athlete_id scoping is explicit below).
  let primaryRace:
    | { name?: string; race_date: string; race_type: string | null }
    | null = null;
  if (user) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("races")
      .select("name, race_date, race_type")
      .eq("athlete_id", user.id)
      .eq("is_primary", true)
      .maybeSingle();
    if (data?.race_date) {
      primaryRace = {
        name: typeof data.name === "string" ? data.name : undefined,
        race_date: String(data.race_date),
        race_type: typeof data.race_type === "string" ? data.race_type : null,
      };
    }
  }

  // "Strength today" card — when the athlete's typical pattern OR today's
  // override schedules a strength session, surface a direct link to
  // /session/strength so they have a discoverable entry point.
  let hasStrengthToday = false;
  if (user) {
    const admin = createAdminClient();
    const today = new Date();
    const isoDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    try {
      const planned = await getPlannedSession(user.id, isoDate, admin);
      hasStrengthToday = planned.sessions.some((s) => s.type === "strength");
    } catch {
      // Non-fatal — fall back to not showing the card.
    }
  }

  // T02 — Today's Plan tile. Aggregates: latest recovery check-in (today,
  // or fallback to most-recent), most-recent load_ratio from
  // weekly_analyses, today's planned sessions, periodisation phase, and
  // whether a typical-week pattern exists. Pure compute downstream.
  let todaysPlan:
    | ReturnType<typeof computeTodaysPlan>
    | null = null;
  if (user) {
    const admin = createAdminClient();
    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    try {
      const [
        { data: recoveryRow },
        { data: latestAnalysis },
        plannedToday,
        pattern,
        { data: primaryRaceForPlan },
      ] = await Promise.all([
        admin
          .from("recovery_check_in")
          .select("feeling, check_in_date")
          .eq("athlete_id", user.id)
          .order("check_in_date", { ascending: false })
          .limit(1)
          .maybeSingle(),
        admin
          .from("weekly_analyses")
          .select("load_ratio")
          .eq("athlete_id", user.id)
          .order("week_start", { ascending: false })
          .limit(1)
          .maybeSingle(),
        getPlannedSession(user.id, todayIso, admin),
        getTypicalWeekPattern(user.id, admin),
        admin
          .from("races")
          .select("race_date, race_type")
          .eq("athlete_id", user.id)
          .eq("is_primary", true)
          .maybeSingle(),
      ]);
      const phase = currentPhase(
        primaryRaceForPlan
          ? {
              race_date: String(primaryRaceForPlan.race_date),
              race_type:
                typeof primaryRaceForPlan.race_type === "string"
                  ? primaryRaceForPlan.race_type
                  : null,
            }
          : null,
        today,
      );
      todaysPlan = computeTodaysPlan({
        latestRecoveryCheckIn:
          recoveryRow?.feeling === "sharp" ||
          recoveryRow?.feeling === "okay" ||
          recoveryRow?.feeling === "tired"
            ? (recoveryRow.feeling as Feeling)
            : null,
        loadRatio:
          typeof latestAnalysis?.load_ratio === "number"
            ? latestAnalysis.load_ratio
            : null,
        plannedSession: { sessions: plannedToday.sessions },
        phase,
        hasTypicalWeekPattern: Array.isArray(pattern) && pattern.length > 0,
      });
    } catch {
      // Non-fatal — tile silently absent if any read fails.
    }
  }

  // Audit followup #5: surface a "consider a rest day" banner after 3
  // consecutive "tired" check-ins (per F12 recovery-override spec). Read
  // is bounded by the trailing window the function needs.
  let restDayHint = false;
  if (user) {
    const admin = createAdminClient();
    const { data: trailing } = await admin
      .from("recovery_check_in")
      .select("check_in_date, feeling")
      .eq("athlete_id", user.id)
      .order("check_in_date", { ascending: false })
      .limit(3);
    if (trailing && trailing.length === 3) {
      // Reverse to chronological order to match shouldRecommendRestDay's contract.
      const chronological = [...trailing].reverse().map((r) => ({
        check_in_date: String(r.check_in_date),
        feeling: r.feeling as Feeling,
      }));
      restDayHint = shouldRecommendRestDay(chronological);
    }
  }

  // T12: F11 pre-session preview takes the dashboard top slot after 18:00
  // local on a day where tomorrow has a planned session. Otherwise the
  // F14 race countdown card keeps the slot.
  let preSession:
    | {
        tomorrowDate: string;
        tomorrowSessions: import("@/lib/plan/types").PlannedSessionEntry[];
        initialFeeling: Feeling | null;
      }
    | null = null;
  if (user) {
    const now = new Date();
    const isEvening = now.getHours() >= 18;
    if (isEvening) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
      const admin = createAdminClient();
      const tomorrowPlanned = await getPlannedSession(user.id, tomorrowDate, admin);
      const hasPlanned = tomorrowPlanned.sessions.some((s) => s.type !== "rest");
      if (hasPlanned) {
        // Existing check-in row, if any (so the picker shows the prior choice).
        const { data: existing } = await admin
          .from("recovery_check_in")
          .select("feeling")
          .eq("athlete_id", user.id)
          .eq("check_in_date", tomorrowDate)
          .maybeSingle();
        preSession = {
          tomorrowDate,
          tomorrowSessions: tomorrowPlanned.sessions,
          initialFeeling:
            existing?.feeling === "sharp" ||
            existing?.feeling === "okay" ||
            existing?.feeling === "tired"
              ? (existing.feeling as Feeling)
              : null,
        };
      }
    }
  }

  // T07: daily journal — show once per day. Hide if the dismissal cookie is
  // present OR if all three tags are already saved. Initial values seed the
  // toggle state.
  let journal:
    | {
        today: string;
        initial: {
          slept_well: boolean | null;
          travelling: boolean | null;
          stressed: boolean | null;
        };
      }
    | null = null;
  if (user) {
    const now = new Date();
    const isoDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const cookieStore = await cookies();
    const dismissed = cookieStore.get(`eiq_journal_dismissed_${isoDate}`)?.value === "1";
    if (!dismissed) {
      const admin = createAdminClient();
      const { data: row } = await admin
        .from("daily_journal_tags")
        .select("slept_well, travelling, stressed")
        .eq("athlete_id", user.id)
        .eq("check_in_date", isoDate)
        .maybeSingle();
      const allAnswered =
        row != null &&
        row.slept_well != null &&
        row.travelling != null &&
        row.stressed != null;
      if (!allAnswered) {
        journal = {
          today: isoDate,
          initial: {
            slept_well: (row?.slept_well as boolean | null | undefined) ?? null,
            travelling: (row?.travelling as boolean | null | undefined) ?? null,
            stressed: (row?.stressed as boolean | null | undefined) ?? null,
          },
        };
      }
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-12 md:px-12 md:py-16">
      {missingProfileFields.length > 0 && (
        <div className="mb-8">
          <ProfileCompletenessBanner missingFields={missingProfileFields} />
        </div>
      )}

      {journal && (
        <div className="mb-6">
          <DailyJournalCard today={journal.today} initial={journal.initial} />
        </div>
      )}

      {restDayHint && (
        <div className="mb-6">
          <AdvisoryBlock tone="warn">
            <p className="font-sans text-[14px] text-[var(--text-primary)]">
              You&apos;ve logged &quot;tired&quot; three nights in a row — consider
              taking a full rest day to recover before the next hard session.
            </p>
          </AdvisoryBlock>
        </div>
      )}

      {todaysPlan && todaysPlan.recommendation !== "no_session" && (
        <div className="mb-6">
          <TodaysPlanTile plan={todaysPlan} />
        </div>
      )}

      {hasStrengthToday && (
        <div className="mb-6 rounded-md border border-[var(--accent)] bg-[var(--accent-soft)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-sans text-[11px] font-medium uppercase tracking-wider text-[var(--accent-dark)]">
                Strength today
              </p>
              <p className="mt-1 font-sans text-[14px] text-[var(--text-primary)]">
                Open today&apos;s session — warmup, main work, cooldown, with
                tempo + cue for every exercise.
              </p>
            </div>
            <Link
              href="/session/strength"
              className="inline-flex min-h-10 items-center rounded-md bg-[var(--accent)] px-4 font-sans text-[13px] font-medium text-[var(--text-on-accent)] hover:opacity-90"
            >
              Open session →
            </Link>
          </div>
        </div>
      )}

      {/* T12 priority: F11 pre-session preview takes the top slot when
          available; F14 countdown takes it otherwise. */}
      {preSession ? (
        <div className="mb-10">
          <PreSessionPreviewCard
            tomorrowDate={preSession.tomorrowDate}
            tomorrowSessions={preSession.tomorrowSessions}
            initialFeeling={preSession.initialFeeling}
          />
        </div>
      ) : primaryRace ? (
        <div className="mb-10">
          <RaceCountdownCard race={primaryRace} />
        </div>
      ) : null}

      <p className="mb-2 font-sans text-[11px] font-medium tracking-[0.08em] text-[var(--text-muted)] [font-variant:small-caps]">
        This week&apos;s check · May 4–10, 2026
      </p>
      <h1 className="max-w-xl font-sans text-[26px] font-bold leading-snug tracking-tight md:text-[28px]">
        Your easy runs{" "}
        <span className="font-[family-name:var(--font-instrument)] text-[1.05em] font-normal italic">
          aren&apos;t
        </span>{" "}
        easy
      </h1>

      <div className="mt-10 grid gap-10 md:grid-cols-[200px_1fr] md:items-start md:gap-12">
        <aside className="flex flex-wrap gap-6 md:block md:space-y-7">
          <Stat label="km this week" value="41.3" />
          <Stat label="runs" value="4" />
          <Stat label="strength" value="2" />
          <div className="w-full border-t border-[var(--border)] pt-6 md:w-auto md:border-t-0 md:pt-0">
            <p className="font-sans text-[13px] font-medium text-[var(--text-secondary)]">
              Training load
            </p>
            <div className="mt-2 h-1 rounded-full bg-[var(--surface-raised)]">
              <div
                className="h-full w-[52%] rounded-full bg-[var(--status-good)]"
                aria-hidden
              />
            </div>
            <p className="mt-2 font-mono text-[12px] text-[var(--text-muted)]">
              Normal · +3% vs. 4 weeks
            </p>
          </div>
        </aside>

        <section
          className="rounded-[20px] border border-[rgba(213,216,224,0.45)] bg-[rgba(250,251,253,0.68)] p-8 shadow-[0_20px_40px_-16px_rgba(16,19,26,0.14)] backdrop-blur-xl backdrop-saturate-180 supports-[backdrop-filter]:bg-[rgba(250,251,253,0.68)]"
          aria-labelledby="finding-title"
        >
          <div className="mb-5 h-[3px] w-12 rounded bg-[var(--status-bad)]" aria-hidden />
          <h2 id="finding-title" className="font-sans text-xl font-semibold tracking-tight">
            0% of your running was in the easy zone this week
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--text-secondary)]">
            All 4 runs averaged{" "}
            <strong className="font-mono text-[14px] font-medium text-[var(--text-primary)]">
              157–174 bpm
            </strong>
            . Your estimated easy zone is{" "}
            <strong className="font-mono text-[14px] font-medium text-[var(--text-primary)]">
              130–145 bpm
            </strong>{" "}
            (based on observed max HR of{" "}
            <strong className="font-mono text-[14px] font-medium text-[var(--text-primary)]">
              194 bpm
            </strong>
            ).
          </p>
          <p className="mt-4 rounded border border-transparent bg-[rgba(46,94,78,0.09)] p-3 text-[14px] leading-relaxed text-[var(--text-primary)]">
            Slow easy runs to{" "}
            <strong className="font-mono text-[14px]">6:45–7:15/km</strong>,
            targeting{" "}
            <strong className="font-mono text-[14px]">130–145 bpm</strong>. If HR
            goes above 150 at any pace, walk until it drops below 140.
          </p>
          <p className="mt-6 font-[family-name:var(--font-instrument)] text-[13px] italic text-[var(--text-muted)]">
            <a
              href={seilerLink.href}
              className="underline decoration-[rgba(138,145,160,0.4)] underline-offset-2 hover:text-[var(--accent)]"
              target="_blank"
              rel="noopener noreferrer"
            >
              {seilerLink.label}
            </a>
            {"; "}
            <a
              href={stogglLink.href}
              className="underline decoration-[rgba(138,145,160,0.4)] underline-offset-2 hover:text-[var(--accent)]"
              target="_blank"
              rel="noopener noreferrer"
            >
              {stogglLink.label}
            </a>
          </p>
        </section>
      </div>

      <section
        id="methodology-teaser"
        className="mt-14 scroll-mt-24 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8"
        aria-labelledby="method-teaser-title"
      >
        <h2
          id="method-teaser-title"
          className="font-sans text-[17px] font-semibold tracking-tight text-[var(--text-primary)]"
        >
          How EnduranceIQ reads your week
        </h2>
        <p className="mt-3 font-sans text-[14px] leading-relaxed text-[var(--text-secondary)]">
          Zones derive from HR drift versus observed max HR; findings cite endurance physiology summaries (polarisation,
          interference timing). Narrative blocks run server-side on structured aggregates—never raw activity titles—and fall back to deterministic templates when validators trip.
        </p>
        <p className="mt-4 font-sans text-[14px] leading-relaxed text-[var(--text-secondary)]">
          Evidence-backed findings reference polarisation (
          <a
            href={seilerLink.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] underline"
          >
            Seiler, 2010
          </a>
          ), acute/chronic training load (
          <a
            href={gabbettLink.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] underline"
          >
            Gabbett, 2016
          </a>
          ), concurrent training interference (
          <a
            href={fyfeLink.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] underline"
          >
            Fyfe et al., 2014
          </a>
          ), and runner-focused strength programming summaries linked from Learn.
        </p>
        <p className="mt-4 font-sans text-[14px]">
          <Link href="/learn#methodology" className="text-[var(--accent)] underline">
            Read the methodology →
          </Link>
        </p>
      </section>

      <div className="mt-12 border-t border-[var(--border)] pt-8 flex items-center gap-4">
        <Link
          href={liveReportHref}
          className="inline-flex min-h-11 items-center justify-center rounded bg-[var(--accent)] px-5 font-sans text-[13px] font-medium text-white transition-colors hover:bg-[#245045]"
        >
          {user ? "Your weekly report →" : "View demo report →"}
        </Link>
        {!user && (
          <Link
            href="/auth/login"
            className="font-sans text-[13px] text-[var(--text-muted)] underline underline-offset-2 hover:text-[var(--accent)]"
          >
            Log in
          </Link>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-mono text-[26px] font-medium tracking-tight text-[var(--text-primary)] md:text-[28px]">
        {value}
      </span>
      <span className="mt-1 block font-sans text-[12px] font-medium text-[var(--text-secondary)]">
        {label}
      </span>
    </div>
  );
}
