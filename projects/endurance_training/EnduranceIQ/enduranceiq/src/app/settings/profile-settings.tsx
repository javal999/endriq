"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Toast, useToast } from "@/components/toast";

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

export function ProfileSettings({
  athleteId,
  initialMaxHr,
  initialHrRest,
  initialSex,
  initialRaceType,
  initialRaceDate,
  initialWeeklyKm,
}: {
  athleteId: string;
  initialMaxHr: number | null;
  initialHrRest: number | null;
  initialSex: string | null;
  initialRaceType: string | null;
  initialRaceDate: string | null;
  initialWeeklyKm: number | null;
}) {
  const [maxHr, setMaxHr] = useState(initialMaxHr?.toString() ?? "");
  const [hrRest, setHrRest] = useState(initialHrRest?.toString() ?? "");
  const [sex, setSex] = useState(initialSex ?? "");
  const [raceType, setRaceType] = useState(initialRaceType ?? "general_fitness");
  const [raceDate, setRaceDate] = useState(initialRaceDate ?? "");
  const [weeklyKm, setWeeklyKm] = useState(initialWeeklyKm?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const raceDateRequired = raceType !== "general_fitness";

  async function save() {
    const maxVal = maxHr.trim() === "" ? null : Number(maxHr);
    const restVal = hrRest.trim() === "" ? null : Number(hrRest);
    const kmVal = weeklyKm.trim() === "" ? null : Number(weeklyKm);

    if (maxVal !== null && (Number.isNaN(maxVal) || maxVal < 100 || maxVal > 230)) {
      setError("Max HR must be 100–230 bpm.");
      return;
    }
    if (restVal !== null && (Number.isNaN(restVal) || restVal < 30 || restVal > 90)) {
      setError("Resting HR must be 30–90 bpm.");
      return;
    }
    if (kmVal !== null && (Number.isNaN(kmVal) || kmVal < 1)) {
      setError("Weekly km must be a positive number.");
      return;
    }

    setError(null);
    setSaving(true);
    const supabase = createClient();
    const { error: dbErr } = await supabase
      .from("athletes")
      .update({
        observed_max_hr: maxVal,
        hr_rest: restVal,
        sex: sex || null,
        goal_race_type: raceType || null,
        goal_race_date: raceDateRequired && raceDate ? raceDate : null,
        goal_weekly_km: kmVal,
      })
      .eq("id", athleteId);
    setSaving(false);
    if (dbErr) {
      setError(dbErr.message);
    } else {
      toast.show("Saved");
    }
  }

  return (
    <>
      {toast.message && <Toast message={toast.message} onDismiss={toast.dismiss} />}
      <div id="profile" className="mt-4 rounded border border-[var(--border)] bg-[var(--surface)] p-6">
        <h3 className="font-sans text-[14px] font-medium text-[var(--text-primary)]">
          Profile
        </h3>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-secondary)]">
          These fields improve zone accuracy, training load calculations, and strength recommendations.
        </p>

        <div className="mt-5 space-y-5">
          <div>
            <label htmlFor="settings-race-type" className="block font-sans text-[12px] font-medium text-[var(--text-secondary)]">
              What are you training for?
            </label>
            <select
              id="settings-race-type"
              value={raceType}
              onChange={(e) => setRaceType(e.target.value)}
              className="mt-2 w-full max-w-xs rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-sans text-[14px] text-[var(--text-primary)]"
            >
              {RACE_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {raceDateRequired && (
            <div>
              <label htmlFor="settings-race-date" className="block font-sans text-[12px] font-medium text-[var(--text-secondary)]">
                Race date
                <span className="ml-1 font-normal text-[var(--text-muted)]">(optional — used for taper recommendations)</span>
              </label>
              <input
                id="settings-race-date"
                type="date"
                value={raceDate}
                onChange={(e) => setRaceDate(e.target.value)}
                className="mt-2 w-full max-w-xs rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-sans text-[14px] text-[var(--text-primary)]"
              />
            </div>
          )}

          <div>
            <label htmlFor="settings-weekly-km" className="block font-sans text-[12px] font-medium text-[var(--text-secondary)]">
              Typical weekly km
            </label>
            <div className="mt-2 flex items-center gap-2">
              <input
                id="settings-weekly-km"
                type="number"
                min={1}
                max={300}
                placeholder="e.g. 40"
                value={weeklyKm}
                onChange={(e) => { setWeeklyKm(e.target.value); setError(null); }}
                className="w-28 rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-[14px] text-[var(--text-primary)]"
              />
              <span className="font-sans text-[12px] text-[var(--text-muted)]">km</span>
            </div>
          </div>

          <div>
            <fieldset>
              <legend className="block font-sans text-[12px] font-medium text-[var(--text-secondary)]">
                Sex
                <span className="ml-1 font-normal text-[var(--text-muted)]">(used in training load formula)</span>
              </legend>
              <div className="mt-2 flex flex-wrap gap-4">
                {SEX_OPTIONS.map((o) => (
                  <label key={o.value} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="settings-sex"
                      value={o.value}
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

          <div className="grid gap-5 sm:grid-cols-2 border-t border-[var(--border)] pt-5">
            <div>
              <label htmlFor="max-hr" className="block font-sans text-[12px] font-medium text-[var(--text-secondary)]">
                Max HR <span className="font-normal text-[var(--text-muted)]">(bpm, optional)</span>
              </label>
              <p className="mt-0.5 font-sans text-[11px] text-[var(--text-muted)]">100–230. We estimate from your data if not set.</p>
              <div className="mt-2 flex items-center gap-2">
                <input id="max-hr" type="number" min={100} max={230} placeholder="e.g. 192"
                  value={maxHr} onChange={(e) => { setMaxHr(e.target.value); setError(null); }}
                  className="w-28 rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-[14px] text-[var(--text-primary)]"
                />
                <span className="font-sans text-[12px] text-[var(--text-muted)]">bpm</span>
              </div>
            </div>
            <div>
              <label htmlFor="hr-rest-settings" className="block font-sans text-[12px] font-medium text-[var(--text-secondary)]">
                Resting HR <span className="font-normal text-[var(--text-muted)]">(bpm, optional)</span>
              </label>
              <p className="mt-0.5 font-sans text-[11px] text-[var(--text-muted)]">30–90. Measure first thing in the morning.</p>
              <div className="mt-2 flex items-center gap-2">
                <input id="hr-rest-settings" type="number" min={30} max={90} placeholder="e.g. 52"
                  value={hrRest} onChange={(e) => { setHrRest(e.target.value); setError(null); }}
                  className="w-28 rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-[14px] text-[var(--text-primary)]"
                />
                <span className="font-sans text-[12px] text-[var(--text-muted)]">bpm</span>
              </div>
            </div>
          </div>
        </div>

        <button onClick={() => void save()} disabled={saving}
          className="mt-6 inline-flex min-h-9 items-center justify-center rounded bg-[var(--accent)] px-5 font-sans text-[13px] font-medium text-white hover:bg-[#245045] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>

        {error && <p className="mt-3 font-sans text-[13px] text-[var(--status-bad)]">{error}</p>}
      </div>
    </>
  );
}
