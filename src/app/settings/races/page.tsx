import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  RaceListEditor,
  type RaceRow,
} from "@/components/inputs/race-list-editor";

/**
 * Settings → Races (F14.0).
 *
 * Server component: gates auth, fetches the athlete's races, hands them to
 * the client editor. RLS scopes the SELECT to the user's own rows.
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.7 F14.0; PHASE-2.0-BUILD.md T03.
 */

export const metadata = {
  title: "Races — Settings — EnduranceIQ",
};

export default async function RacesSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/login?redirect=${encodeURIComponent("/settings/races")}`);
  }

  const { data, error } = await supabase
    .from("races")
    .select("id, name, race_type, race_date, is_primary, created_at")
    .order("is_primary", { ascending: false })
    .order("race_date", { ascending: true });

  const races: RaceRow[] = (data ?? []) as RaceRow[];

  return (
    <div className="mx-auto max-w-2xl px-5 py-12 md:px-8">
      <p className="font-sans text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
        <Link href="/settings" className="hover:text-[var(--text-secondary)]">
          ← Settings
        </Link>
      </p>
      <h1 className="mt-2 font-sans text-xl font-bold tracking-tight">Races</h1>
      <p className="mt-2 font-sans text-[14px] text-[var(--text-secondary)]">
        Manage every race on your calendar. One race is your <em>primary</em> — that&apos;s
        the race the countdown and predicted finish anchor to. Switch any time.
      </p>

      {error && (
        <p className="mt-4 rounded-md border border-[var(--status-bad)] bg-[var(--status-bad-bg)] p-3 font-sans text-[13px] text-[var(--status-bad)]">
          Could not load races: {error.message}
        </p>
      )}

      <div className="mt-6">
        <RaceListEditor initialRaces={races} />
      </div>

      <p className="mt-8 font-sans text-[13px] italic text-[var(--text-muted)]">
        Past races are still listed here for reference. The countdown only
        considers races in the future.
      </p>
    </div>
  );
}
