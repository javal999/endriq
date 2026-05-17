/**
 * /race/fitness — T06 Performance Management Chart page.
 *
 * Reads ~12 months of workouts, computes daily training-stress totals,
 * runs the CTL/ATL/TSB EWA, and renders <PmcChart>.
 *
 * Refs: PHASE-2.1-BUILD.md §6 T06 step 4.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computePmc, densifyDailyLoads } from "@/lib/analytics/pmc";
import { citationToLink } from "@/lib/data/citations";
import { PmcChartClient } from "./pmc-chart-client";

const HISTORY_DAYS = 400;

export const dynamic = "force-dynamic";

export default async function FitnessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login?redirect=/race/fitness");
  }

  const today = new Date();
  const todayIso = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;
  const startMs = Date.now() - HISTORY_DAYS * 86400000;
  const startDate = new Date(startMs);
  const startIso = `${startDate.getUTCFullYear()}-${String(startDate.getUTCMonth() + 1).padStart(2, "0")}-${String(startDate.getUTCDate()).padStart(2, "0")}`;

  const { data: rows } = await supabase
    .from("workouts")
    .select("started_at, training_stress")
    .eq("athlete_id", user.id)
    .gte("started_at", `${startIso}T00:00:00Z`)
    .order("started_at", { ascending: true });

  const workouts = (rows ?? []).map((r) => ({
    started_at: String(r.started_at),
    load: Number(r.training_stress) || 0,
  }));

  const dense = densifyDailyLoads(workouts, startIso, todayIso);
  const series = computePmc(dense, { windowDays: 365 });

  const banister = citationToLink("banister_1991");
  const coggan = citationToLink("coggan_allen_2010");

  return (
    <div className="mx-auto max-w-4xl px-5 pb-16 pt-10 md:px-12 md:pt-12">
      <nav className="mb-6 flex items-center gap-3 font-sans text-[12px] text-[var(--text-secondary)]">
        <Link
          href="/race"
          className="rounded-sm border border-[var(--border)] px-2 py-1 hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
        >
          ← Race
        </Link>
        <span className="text-[var(--text-muted)]">/ Fitness</span>
      </nav>

      <header className="mb-6">
        <h1 className="font-sans text-[22px] font-bold tracking-tight text-[var(--text-primary)]">
          Fitness trend
        </h1>
        <p className="mt-1 font-sans text-[13px] text-[var(--text-muted)]">
          How fit you are (CTL), how fatigued (ATL), and how fresh you feel
          (TSB = CTL − ATL).
        </p>
      </header>

      <PmcChartClient series={series} />

      <section className="mt-8 space-y-2">
        <h2 className="font-sans text-[13px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Methodology
        </h2>
        <p className="font-sans text-[13px] leading-relaxed text-[var(--text-secondary)]">
          <strong className="text-[var(--text-primary)]">CTL</strong> is a 42-day exponentially weighted average of your daily training stress.
          It proxies your underlying fitness: it rises slowly with consistent training and decays slowly when you rest.{" "}
          <strong className="text-[var(--text-primary)]">ATL</strong> is a 7-day average — it spikes during a hard block and clears in a week of easy training.{" "}
          <strong className="text-[var(--text-primary)]">TSB</strong> (CTL − ATL) shows whether your acute fatigue is currently below your fitness (positive, fresh)
          or above it (negative, fatigued). A common race-day target is TSB ≈ +15 to +25.
        </p>
        <p className="font-sans text-[12px] italic text-[var(--text-muted)]">
          The exponential-load model originates with{" "}
          <a
            href={banister.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] underline underline-offset-2"
          >
            {banister.label}
          </a>{" "}
          and was popularised for endurance athletes by{" "}
          <a
            href={coggan.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] underline underline-offset-2"
          >
            {coggan.label}
          </a>
          . The numbers are not absolute — interpret your trend, not the daily values.
        </p>
      </section>
    </div>
  );
}
