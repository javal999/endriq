import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TrainingPatternEditor } from "./training-pattern-editor";
import type { TypicalWeekPattern } from "@/lib/plan/types";

/**
 * /settings/training-pattern — post-onboarding editor for the typical-week
 * pattern (audit followup #4 / PRD §5.2 deferred surface).
 *
 * Phase 2.0 shipped the planner inside /onboarding only. Athletes whose
 * onboarding_complete = true (i.e. everyone who signed up in Phase 1.x)
 * had no way to set or edit their typical week post-ship. This page fills
 * that gap with the same TypicalWeekPlanner component, scoped to a single
 * "edit + save" workflow.
 */

export const metadata = { title: "Training pattern — Settings — EnduranceIQ" };

export default async function TrainingPatternPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/auth/login?redirect=${encodeURIComponent("/settings/training-pattern")}`,
    );
  }

  const { data: athlete } = await supabase
    .from("athletes")
    .select("typical_week_pattern")
    .eq("id", user.id)
    .maybeSingle();

  const initial: TypicalWeekPattern = Array.isArray(athlete?.typical_week_pattern)
    ? (athlete!.typical_week_pattern as TypicalWeekPattern)
    : [];

  return (
    <div className="mx-auto max-w-2xl px-5 py-12 md:px-8">
      <p className="font-sans text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
        <Link href="/settings" className="hover:text-[var(--text-secondary)]">
          ← Settings
        </Link>
      </p>
      <h1 className="mt-2 font-sans text-xl font-bold tracking-tight">
        Training pattern
      </h1>
      <p className="mt-2 font-sans text-[14px] text-[var(--text-secondary)]">
        Your typical week. Tap each day to add session chips. Strength
        placement, the 22-week race arc, and the night-before preview all
        read from this pattern.
      </p>

      <div className="mt-8">
        <TrainingPatternEditor initial={initial} />
      </div>

      <p className="mt-8 font-sans text-[12px] italic text-[var(--text-muted)]">
        This is the typical week. Day-specific edits (e.g. a one-off long
        run) are saved separately when you tap a day in /week or /plan
        — those overrides don&apos;t modify the pattern.
      </p>
    </div>
  );
}
