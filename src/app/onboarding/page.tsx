"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Toast, useToast } from "@/components/toast";
import { TypicalWeekPlanner } from "@/components/domain/typical-week-planner";
import type { TypicalWeekPattern } from "@/lib/plan/types";

type Persona = "coached" | "self_coached" | "hybrid";

const PERSONA_OPTIONS: { value: Persona; label: string; description: string }[] = [
  {
    value: "coached",
    label: "Coached",
    description: "I work with a running or tri coach who gives me my plan.",
  },
  {
    value: "self_coached",
    label: "Self-coached",
    description: "I plan my own training using research and experience.",
  },
  {
    value: "hybrid",
    label: "Hybrid",
    description: "Mostly self-directed; I check in with a coach occasionally.",
  },
];

const RACE_TYPE_OPTIONS = [
  { value: "marathon", label: "Marathon" },
  { value: "half_marathon", label: "Half marathon" },
  { value: "10k", label: "10K" },
  { value: "5k", label: "5K" },
  { value: "ultramarathon", label: "Ultra marathon" },
  { value: "general_fitness", label: "General fitness (no specific race)" },
];

const SEX_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other / prefer not to say" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [persona, setPersona] = useState<Persona>("self_coached");
  const [goalRaceType, setGoalRaceType] = useState("marathon");
  const [goalRaceDate, setGoalRaceDate] = useState("");
  const [goalWeeklyKm, setGoalWeeklyKm] = useState("");
  const [sex, setSex] = useState("");
  const [observedMaxHr, setObservedMaxHr] = useState("");
  const [hrRest, setHrRest] = useState("");
  const [typicalWeek, setTypicalWeek] = useState<TypicalWeekPattern>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const raceDateRequired = goalRaceType !== "general_fitness";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth/login");
        return;
      }

      const maxHrNum = observedMaxHr ? Number(observedMaxHr) : null;
      const hrRestNum = hrRest ? Number(hrRest) : null;

      const { error: upsertErr } = await supabase
        .from("athletes")
        .update({
          persona,
          goal_race_type: goalRaceType,
          goal_race_date: raceDateRequired && goalRaceDate ? goalRaceDate : null,
          goal_weekly_km: goalWeeklyKm ? Number(goalWeeklyKm) : null,
          sex: sex || null,
          observed_max_hr: maxHrNum && maxHrNum >= 120 && maxHrNum <= 220 ? maxHrNum : null,
          hr_rest: hrRestNum && hrRestNum >= 30 && hrRestNum <= 90 ? hrRestNum : null,
          typical_week_pattern: typicalWeek,
          onboarding_complete: true,
        })
        .eq("id", user.id);

      if (upsertErr) {
        setError(upsertErr.message);
        return;
      }

      // Seed a primary race row from the onboarding fields (F14.0). Skipped
      // silently for general_fitness or when no date was provided. The legacy
      // athletes.goal_race_* columns above remain populated as a compatibility
      // shim per PRD §5.7 ("dropped in Phase 2.1").
      const KNOWN_RACE_TYPES = new Set([
        "marathon", "half_marathon", "10k", "5k",
        "ultramarathon", "ironman_70_3", "ironman_full",
      ]);
      if (raceDateRequired && goalRaceDate && goalRaceType && goalRaceType !== "general_fitness") {
        const raceType = KNOWN_RACE_TYPES.has(goalRaceType) ? goalRaceType : "other_endurance";
        const label = raceType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        await fetch("/api/race", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: `${label} ${goalRaceDate}`,
            race_type: raceType,
            race_date: goalRaceDate,
            is_primary: true,
          }),
        }).catch(() => {
          // Non-fatal — the athletes.goal_race_* columns still capture the
          // intent, and the next migration replay (or manual /settings/races
          // visit) can promote them. Don't block onboarding completion.
        });
      }

      toast.show("Saved — now connect Strava to start receiving reports.");
      router.replace("/settings");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
    {toast.message && <Toast message={toast.message} onDismiss={toast.dismiss} />}
    <div className="mx-auto max-w-2xl px-5 py-16 md:px-8">
      <p className="font-sans text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
        Step 1 of 2
      </p>
      <h1 className="mt-2 font-sans text-[22px] font-bold tracking-tight text-[var(--text-primary)]">
        Tell us about your training
      </h1>
      <p className="mt-3 font-sans text-[14px] leading-relaxed text-[var(--text-secondary)]">
        These six fields improve the accuracy of intensity zones, training load,
        and strength recommendations. HR fields are optional — we&apos;ll estimate
        from your data if you skip them.
      </p>

      <form onSubmit={(e) => void onSubmit(e)} className="mt-10 space-y-6">

        {/* Persona */}
        <fieldset>
          <legend className="block font-sans text-[13px] font-medium text-[var(--text-primary)]">
            How do you train?
            <span className="ml-1 text-[var(--status-bad)]">*</span>
          </legend>
          <p className="mt-0.5 font-sans text-[12px] text-[var(--text-muted)]">
            Helps us emphasise the surfaces you&apos;ll actually use. Changeable later in Settings.
          </p>
          <div className="mt-2 space-y-2">
            {PERSONA_OPTIONS.map((o) => (
              <label
                key={o.value}
                className={`flex cursor-pointer items-start gap-3 rounded border px-3 py-2 transition-colors ${
                  persona === o.value
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]"
                }`}
              >
                <input
                  type="radio"
                  name="persona"
                  value={o.value}
                  checked={persona === o.value}
                  onChange={() => setPersona(o.value)}
                  className="mt-1"
                />
                <div>
                  <span className="block font-sans text-[14px] font-medium text-[var(--text-primary)]">
                    {o.label}
                  </span>
                  <span className="mt-0.5 block font-sans text-[12px] text-[var(--text-secondary)]">
                    {o.description}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Goal race type */}
        <div>
          <label htmlFor="race-type" className="block font-sans text-[13px] font-medium text-[var(--text-primary)]">
            What are you training for?
            <span className="ml-1 text-[var(--status-bad)]">*</span>
          </label>
          <select
            id="race-type"
            required
            value={goalRaceType}
            onChange={(e) => setGoalRaceType(e.target.value)}
            className="mt-2 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-sans text-[14px] text-[var(--text-primary)]"
          >
            {RACE_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Goal race date (conditional) */}
        {raceDateRequired && (
          <div>
            <label htmlFor="race-date" className="block font-sans text-[13px] font-medium text-[var(--text-primary)]">
              Race date
              <span className="ml-1 text-[var(--text-muted)] font-normal">(optional)</span>
            </label>
            <p className="mt-0.5 font-sans text-[12px] text-[var(--text-muted)]">
              We use this for taper recommendations in the final 3 weeks.
            </p>
            <input
              id="race-date"
              type="date"
              value={goalRaceDate}
              onChange={(e) => setGoalRaceDate(e.target.value)}
              className="mt-2 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-sans text-[14px] text-[var(--text-primary)]"
            />
          </div>
        )}

        {/* Weekly km */}
        <div>
          <label htmlFor="weekly-km" className="block font-sans text-[13px] font-medium text-[var(--text-primary)]">
            Roughly how many km per week do you currently run?
            <span className="ml-1 text-[var(--status-bad)]">*</span>
          </label>
          <div className="relative mt-2">
            <input
              id="weekly-km"
              type="number"
              min={1}
              max={300}
              required
              value={goalWeeklyKm}
              onChange={(e) => setGoalWeeklyKm(e.target.value)}
              placeholder="e.g. 40"
              className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-sans text-[14px] text-[var(--text-primary)] pr-10"
            />
            <span className="absolute right-3 top-2.5 font-sans text-[13px] text-[var(--text-muted)]">km</span>
          </div>
        </div>

        {/* Sex */}
        <div>
          <fieldset>
            <legend className="block font-sans text-[13px] font-medium text-[var(--text-primary)]">
              Sex
              <span className="ml-1 text-[var(--status-bad)]">*</span>
            </legend>
            <p className="mt-0.5 font-sans text-[12px] text-[var(--text-muted)]">
              Used in the training load formula (Banister TRIMP). Affects calculation, not display.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {SEX_OPTIONS.map((o) => (
                <label key={o.value} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="sex"
                    value={o.value}
                    required
                    checked={sex === o.value}
                    onChange={() => setSex(o.value)}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                  <span className="font-sans text-[14px] text-[var(--text-primary)]">{o.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {/* Optional HR fields */}
        <div className="rounded border border-[var(--border)] bg-[var(--surface)] p-5 space-y-5">
          <p className="font-sans text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Optional — improves accuracy
          </p>

          <div>
            <label htmlFor="max-hr" className="block font-sans text-[13px] font-medium text-[var(--text-primary)]">
              Max heart rate
              <span className="ml-1 font-normal text-[var(--text-muted)]">(bpm, 120–220)</span>
            </label>
            <p className="mt-0.5 font-sans text-[12px] text-[var(--text-muted)]">
              Highest HR you&apos;ve seen on your watch. If you don&apos;t know, we&apos;ll estimate from your data.
            </p>
            <div className="relative mt-2">
              <input
                id="max-hr"
                type="number"
                min={120}
                max={220}
                value={observedMaxHr}
                onChange={(e) => setObservedMaxHr(e.target.value)}
                placeholder="e.g. 192"
                className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-sans text-[14px] text-[var(--text-primary)] pr-14"
              />
              <span className="absolute right-3 top-2.5 font-sans text-[13px] text-[var(--text-muted)]">bpm</span>
            </div>
          </div>

          <div>
            <label htmlFor="hr-rest" className="block font-sans text-[13px] font-medium text-[var(--text-primary)]">
              Resting heart rate
              <span className="ml-1 font-normal text-[var(--text-muted)]">(bpm, 30–90)</span>
            </label>
            <p className="mt-0.5 font-sans text-[12px] text-[var(--text-muted)]">
              Measure first thing in the morning before getting out of bed. Improves load accuracy.
            </p>
            <div className="relative mt-2">
              <input
                id="hr-rest"
                type="number"
                min={30}
                max={90}
                value={hrRest}
                onChange={(e) => setHrRest(e.target.value)}
                placeholder="e.g. 52"
                className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-sans text-[14px] text-[var(--text-primary)] pr-14"
              />
              <span className="absolute right-3 top-2.5 font-sans text-[13px] text-[var(--text-muted)]">bpm</span>
            </div>
          </div>
        </div>

        {/* Typical-week grid (F9) */}
        <fieldset>
          <legend className="block font-sans text-[13px] font-medium text-[var(--text-primary)]">
            Your typical training week
          </legend>
          <p className="mt-0.5 font-sans text-[12px] text-[var(--text-muted)]">
            Tap each day to add session chips. We use this to plan strength
            placement and check 48-hour buffers around heavy sessions.
          </p>
          <div className="mt-3">
            <TypicalWeekPlanner value={typicalWeek} onChange={setTypicalWeek} />
          </div>
        </fieldset>

        {error ? (
          <p className="rounded border border-[var(--border)] bg-[rgba(196,75,63,0.06)] px-3 py-2 font-sans text-[13px] text-[var(--status-bad)]">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-11 w-full items-center justify-center rounded bg-[var(--accent)] px-5 font-sans text-[13px] font-medium text-white hover:bg-[#245045] disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save and continue →"}
        </button>
      </form>

      <p className="mt-8 font-sans text-[12px] leading-relaxed text-[var(--text-muted)]">
        This is general fitness information, not medical advice. You can update these fields
        any time in{" "}
        <Link href="/settings#profile" className="text-[var(--accent)] underline underline-offset-2">
          Settings
        </Link>
        .
      </p>
    </div>
    </>
  );
}
