import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildWeeklyReport } from "@/lib/report/buildWeeklyReport";
import { isoMondayLocal } from "@/lib/report/date";
import { currentPhase } from "@/lib/analytics/periodization";
import { buildStrengthSessionDetails } from "@/lib/analytics/strength-session-detail";
import { StrengthSessionDetail } from "@/components/domain/strength-session-detail";
import { AdvisoryBlock } from "@/components/ui/advisory-block";

/**
 * /session/strength — F10 strength session detail.
 *
 * Builds today's recommended strength session from the athlete's current
 * weekly state and renders it via <StrengthSessionDetail>. Phase context
 * comes from currentPhase(); race-week + Wednesday-or-later triggers the
 * lockdown view per PRD §5.3.
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.3 F10; PHASE-2.0-BUILD.md T09 step 8.
 */

export const metadata = {
  title: "Strength session — EnduranceIQ",
};

export default async function StrengthSessionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/login?redirect=${encodeURIComponent("/session/strength")}`);
  }

  const admin = createAdminClient();
  const weekStart = isoMondayLocal();

  // Reuse the existing buildWeeklyReport pipeline so we get the same
  // strength menu the /week page would have surfaced.
  let report: Awaited<ReturnType<typeof buildWeeklyReport>> | undefined;
  let buildError: string | null = null;
  try {
    report = await buildWeeklyReport(user.id, weekStart, supabase);
  } catch (e) {
    buildError = e instanceof Error ? e.message : "Could not load strength session.";
  }

  if (buildError || !report) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10 md:px-8">
        <h1 className="font-sans text-xl font-bold tracking-tight">Strength session</h1>
        <AdvisoryBlock tone="warn">
          <p className="font-sans text-[14px] text-[var(--text-primary)]">
            {buildError ?? "No data available yet."}
          </p>
        </AdvisoryBlock>
      </div>
    );
  }

  const strengthMenu = report.strength;
  if (!strengthMenu) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10 md:px-8">
        <h1 className="font-sans text-xl font-bold tracking-tight">Strength session</h1>
        <AdvisoryBlock tone="info">
          <p className="font-sans text-[14px] text-[var(--text-primary)]">
            No strength recommendation for this week yet. Run a sync to populate this week&apos;s workouts.
          </p>
        </AdvisoryBlock>
        <p className="mt-4 font-sans text-[13px] text-[var(--text-muted)]">
          <Link href="/week" className="text-[var(--accent)] underline">
            ← Back to week
          </Link>
        </p>
      </div>
    );
  }

  // Look up the primary race for periodisation phase.
  const { data: primaryRace } = await admin
    .from("races")
    .select("race_date, race_type")
    .eq("athlete_id", user.id)
    .eq("is_primary", true)
    .maybeSingle();

  const phase = currentPhase(
    primaryRace
      ? {
          race_date: String(primaryRace.race_date),
          race_type: typeof primaryRace.race_type === "string" ? primaryRace.race_type : null,
        }
      : null,
    new Date(),
  );

  const todayWeekday = (((new Date().getDay() + 6) % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6);

  const sessions = buildStrengthSessionDetails(strengthMenu, phase, {
    travelMode: false,
    todayWeekday,
    reviewState: "evidence_only",
    athleteId: user.id,
  });

  // Pick today's session if scheduled, else the first scheduled day.
  const todaySession = sessions.find((s) => {
    const wd = Number(s.sessionId.split(":wd")[1]);
    return wd === todayWeekday;
  }) ?? sessions[0];

  if (!todaySession) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10 md:px-8">
        <h1 className="font-sans text-xl font-bold tracking-tight">Strength session</h1>
        <AdvisoryBlock tone="info">
          <p className="font-sans text-[14px] text-[var(--text-primary)]">
            No strength day scheduled this week. Check the typical-week pattern in onboarding or `/settings`.
          </p>
        </AdvisoryBlock>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 md:px-8">
      <p className="font-sans text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
        <Link href="/week" className="hover:text-[var(--text-secondary)]">
          ← Week
        </Link>
      </p>
      <div className="mt-6">
        <StrengthSessionDetail session={todaySession} />
      </div>
    </div>
  );
}
