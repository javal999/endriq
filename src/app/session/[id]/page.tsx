import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SessionInterpretView } from "./session-interpret-view";
import { HrPerKmChart } from "@/components/data/hr-per-km-chart";
import type { AthleteHistorySlice } from "@/lib/analytics/types";

/**
 * /session/[id] — F8 run interpretation surface (T06).
 *
 * Server component: gates auth, builds an AthleteHistorySlice from the
 * athlete profile + a 35-day workout window. Hands it to the client view
 * that owns the live input / interpretation loop.
 *
 * The `planned_sessions` table arrives in T07. Until then this page is
 * fixture-mode: the input is empty by default and the athlete can type
 * coach instructions to see live interpretation. Saved planned sessions
 * will replace the seed in T07.
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.1; PHASE-2.0-BUILD.md T06 step 5.
 */

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SessionPage({ params, searchParams }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/login?redirect=${encodeURIComponent(`/session/${id}`)}`);
  }

  const { data: athlete } = await supabase
    .from("athletes")
    .select(
      "observed_max_hr, hr_rest, sex, goal_race_type, goal_race_date, preferred_locale",
    )
    .eq("id", user.id)
    .maybeSingle();

  // 35-day workout window for personal-calibration history.
  const since = new Date();
  since.setDate(since.getDate() - 35);
  const { data: workouts } = await supabase
    .from("workouts")
    .select(
      "id, source, sport_type, session_label, started_at, duration_seconds, distance_meters, avg_hr, max_hr, avg_cadence, training_stress",
    )
    .eq("athlete_id", user.id)
    .gte("started_at", since.toISOString())
    .order("started_at", { ascending: true });

  const slice: AthleteHistorySlice = {
    athleteId: user.id,
    observedMaxHr:
      typeof athlete?.observed_max_hr === "number" ? athlete.observed_max_hr : null,
    hrRest: typeof athlete?.hr_rest === "number" ? athlete.hr_rest : null,
    sex: athlete?.sex === "female" ? "female" : "male",
    recentRacePr: undefined, // surfaced in T11; not part of profile yet
    recentWorkouts: ((workouts ?? []) as Array<Record<string, unknown>>).map(toWorkout),
    recentWeeklyAnalyses: [],
  };

  const sp = await searchParams;
  const initialInput =
    typeof sp.input === "string" ? sp.input : "";

  const locale: "en" | "id" =
    athlete?.preferred_locale === "id" ? "id" : "en";

  // T10: if `id` is a UUID and the workout has per-km HR streams, surface them.
  let perKmChart: {
    buckets: import("@/components/data/hr-per-km-chart").HrPerKmBucket[];
    maxHr: number;
  } | null = null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    const { data: workout } = await supabase
      .from("workouts")
      .select("hr_per_km, sport_type")
      .eq("id", id)
      .eq("athlete_id", user.id)
      .maybeSingle();
    const km = (workout?.hr_per_km as { km?: unknown } | null)?.km;
    if (workout?.sport_type === "run" && Array.isArray(km) && km.length > 0) {
      perKmChart = {
        buckets: km as import("@/components/data/hr-per-km-chart").HrPerKmBucket[],
        maxHr: slice.observedMaxHr ?? 200,
      };
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 md:px-8">
      <p className="font-sans text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
        Session {id === "demo" ? "(demo)" : `#${id.slice(0, 8)}`}
      </p>
      <h1 className="mt-2 font-sans text-xl font-bold tracking-tight text-[var(--text-primary)] [font-family:var(--font-display),Inter,sans-serif]">
        Run interpretation
      </h1>
      <p className="mt-2 font-sans text-[14px] text-[var(--text-secondary)]">
        Type what your coach said. The panel below updates live with pace, HR, and RPE ranges calibrated to your profile.
      </p>

      <SessionInterpretView slice={slice} locale={locale} initialInput={initialInput} />

      {perKmChart && (
        <div className="mt-8">
          <HrPerKmChart
            buckets={perKmChart.buckets}
            observedMaxHr={perKmChart.maxHr}
          />
        </div>
      )}

      <p className="mt-8 font-sans text-[12px] italic text-[var(--text-muted)]">
        Saved sessions land in your weekly plan when planned-session storage ships next.
      </p>
    </div>
  );
}

function toWorkout(w: Record<string, unknown>): AthleteHistorySlice["recentWorkouts"][number] {
  return {
    id: String(w.id ?? ""),
    source: String(w.source ?? "strava"),
    sport_type:
      (w.sport_type as "run" | "strength" | "swim" | "bike" | "other") ?? "other",
    session_label: typeof w.session_label === "string" ? w.session_label : null,
    started_at: String(w.started_at ?? ""),
    duration_seconds: Number(w.duration_seconds ?? 0),
    distance_meters: typeof w.distance_meters === "number" ? w.distance_meters : null,
    avg_hr: typeof w.avg_hr === "number" ? w.avg_hr : null,
    max_hr: typeof w.max_hr === "number" ? w.max_hr : null,
    avg_cadence: typeof w.avg_cadence === "number" ? w.avg_cadence : null,
    training_stress: typeof w.training_stress === "number" ? w.training_stress : null,
  };
}
