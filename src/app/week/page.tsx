import Link from "next/link";
import { redirect } from "next/navigation";
import { isAthleteUuid } from "@/lib/enduranceiq/isAthleteUuid";
import { buildWeeklyReport } from "@/lib/report/buildWeeklyReport";
import { createClient } from "@/lib/supabase/server";
import { addDaysIsoMonday, isoMondayLocal } from "@/lib/report/date";
import { WeeklyReportView } from "@/app/report/[athleteId]/[weekStart]/weekly-report-view";
import { PlannedWeekStrip } from "./planned-week-strip";

/**
 * /week — Phase 2.0 consolidated weekly surface (T08).
 *
 * Default: current week's Monday. Override via ?w=YYYY-MM-DD.
 *
 * Structure:
 *   - PlannedWeekStrip — read-only 7-day view of the planned week
 *     (typical-week pattern + per-date overrides via getPlannedSession)
 *   - WeeklyReportView — the existing report content (intensity, load,
 *     findings, strength recommendation, LLM narrative, sparklines)
 *
 * The legacy /report/[athleteId]/[weekStart] URL permanent-redirects to
 * /week?w= for real user paths; demo paths keep the legacy URL.
 *
 * Refs: PHASE-2.0-PRD-FINAL.md (council fix 7.3); PHASE-2.0-BUILD.md T08.
 */

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function isIsoMonday(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  // Allow any date but normalise to its containing Monday; the caller
  // formatWeekRangeLabel handles the display.
  return true;
}

export default async function WeekPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/login?redirect=${encodeURIComponent("/week")}`);
  }
  if (!isAthleteUuid(user.id)) {
    return (
      <div className="mx-auto max-w-5xl px-5 pb-16 pt-10 md:px-12 md:pt-12">
        <p className="rounded border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-secondary)]">
          Unknown athlete id on session. Try signing out and back in.
        </p>
      </div>
    );
  }

  const sp = await searchParams;
  const rawWeek = typeof sp.w === "string" ? sp.w : undefined;
  const weekStart =
    rawWeek && isIsoMonday(rawWeek) ? rawWeek : isoMondayLocal();
  const prevWeek = addDaysIsoMonday(weekStart, -7);
  const nextWeek = addDaysIsoMonday(weekStart, 7);

  let report: Awaited<ReturnType<typeof buildWeeklyReport>> | undefined;
  let loadError:
    | { message: string; missingEnv: boolean }
    | undefined;

  try {
    report = await buildWeeklyReport(user.id, weekStart, supabase);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not load report.";
    const missingEnv =
      message.includes("NEXT_PUBLIC_SUPABASE_URL") ||
      message.includes("SUPABASE_SERVICE_ROLE_KEY");
    loadError = { message, missingEnv };
  }

  return (
    <div className="mx-auto max-w-5xl px-5 pb-16 pt-10 md:px-12 md:pt-12">
      {/* Week navigation strip */}
      <nav
        aria-label="Week navigation"
        className="flex items-center justify-between gap-3 pb-4"
      >
        <Link
          href={`/week?w=${prevWeek}`}
          prefetch={false}
          className="rounded-sm border border-[var(--border)] px-3 py-1.5 font-sans text-[12px] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
        >
          ← Previous week
        </Link>
        <p className="font-sans text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Week of <span className="font-mono">{weekStart}</span>
        </p>
        <Link
          href={`/week?w=${nextWeek}`}
          prefetch={false}
          className="rounded-sm border border-[var(--border)] px-3 py-1.5 font-sans text-[12px] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
        >
          Next week →
        </Link>
      </nav>

      {/* Planned strip (F9) */}
      <section aria-labelledby="planned-week-heading" className="mb-8">
        <h2
          id="planned-week-heading"
          className="font-sans text-[13px] font-medium uppercase tracking-wider text-[var(--text-muted)]"
        >
          Planned
        </h2>
        <div className="mt-3">
          <PlannedWeekStrip athleteId={user.id} weekStart={weekStart} />
        </div>
      </section>

      {/* Report (existing content) */}
      <section aria-labelledby="actual-week-heading">
        <h2
          id="actual-week-heading"
          className="font-sans text-[13px] font-medium uppercase tracking-wider text-[var(--text-muted)]"
        >
          Actual
        </h2>

        {loadError ? (
          <div className="mt-3">
            <p className="rounded border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-secondary)]">
              {loadError.missingEnv
                ? "Supabase admin env is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server."
                : loadError.message}
            </p>
          </div>
        ) : (
          <div className="mt-3">
            <WeeklyReportView
              model={report!}
              athleteId={user.id}
              weekStart={weekStart}
            />
          </div>
        )}
      </section>
    </div>
  );
}
