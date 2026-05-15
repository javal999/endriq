// @ts-nocheck
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isoMondayLocal } from "@/lib/report/date";
import { citationToLink } from "@/lib/data/citations";
import { ProfileCompletenessBanner } from "@/components/profile-completeness-banner";

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
  let missingProfileFields: string[] = [];
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

  return (
    <div className="mx-auto max-w-5xl px-5 py-12 md:px-12 md:py-16">
      {missingProfileFields.length > 0 && (
        <div className="mb-8">
          <ProfileCompletenessBanner missingFields={missingProfileFields} />
        </div>
      )}
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
