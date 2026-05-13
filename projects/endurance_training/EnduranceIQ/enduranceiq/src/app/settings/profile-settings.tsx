"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ProfileSettings({
  athleteId,
  initialMaxHr,
  initialHrRest,
}: {
  athleteId: string;
  initialMaxHr: number | null;
  initialHrRest: number | null;
}) {
  const [maxHr, setMaxHr] = useState(initialMaxHr?.toString() ?? "");
  const [hrRest, setHrRest] = useState(initialHrRest?.toString() ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save() {
    const maxVal = maxHr.trim() === "" ? null : Number(maxHr);
    const restVal = hrRest.trim() === "" ? null : Number(hrRest);

    if (maxVal !== null && (Number.isNaN(maxVal) || maxVal < 100 || maxVal > 230)) {
      setStatus("error");
      return;
    }
    if (restVal !== null && (Number.isNaN(restVal) || restVal < 30 || restVal > 90)) {
      setStatus("error");
      return;
    }

    setStatus("saving");
    const supabase = createClient();
    const { error } = await supabase
      .from("athletes")
      .update({ observed_max_hr: maxVal, hr_rest: restVal })
      .eq("id", athleteId);
    setStatus(error ? "error" : "saved");
    if (!error) setTimeout(() => setStatus("idle"), 2500);
  }

  return (
    <div id="profile" className="mt-4 rounded border border-[var(--border)] bg-[var(--surface)] p-6">
      <h3 className="font-sans text-[14px] font-medium text-[var(--text-primary)]">
        Profile
      </h3>
      <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-secondary)]">
        Your max HR is used to calculate HR zones. Resting HR improves training load
        accuracy (Banister TRIMP formula).
      </p>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="max-hr"
            className="block font-sans text-[12px] font-medium text-[var(--text-secondary)]"
          >
            Max HR (bpm)
          </label>
          <p className="mt-0.5 font-sans text-[11px] text-[var(--text-muted)]">
            Highest HR seen on your watch (100–230).
          </p>
          <div className="mt-2 flex items-center gap-2">
            <input
              id="max-hr"
              type="number"
              min={100}
              max={230}
              placeholder="e.g. 192"
              value={maxHr}
              onChange={(e) => { setMaxHr(e.target.value); setStatus("idle"); }}
              className="w-28 rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-[14px] text-[var(--text-primary)]"
            />
            <span className="font-sans text-[12px] text-[var(--text-muted)]">bpm</span>
          </div>
        </div>

        <div>
          <label
            htmlFor="hr-rest-settings"
            className="block font-sans text-[12px] font-medium text-[var(--text-secondary)]"
          >
            Resting HR (bpm) — optional
          </label>
          <p className="mt-0.5 font-sans text-[11px] text-[var(--text-muted)]">
            Measure first thing in the morning, lying still (30–90).
          </p>
          <div className="mt-2 flex items-center gap-2">
            <input
              id="hr-rest-settings"
              type="number"
              min={30}
              max={90}
              placeholder="e.g. 52"
              value={hrRest}
              onChange={(e) => { setHrRest(e.target.value); setStatus("idle"); }}
              className="w-28 rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-[14px] text-[var(--text-primary)]"
            />
            <span className="font-sans text-[12px] text-[var(--text-muted)]">bpm</span>
          </div>
        </div>
      </div>

      <button
        onClick={() => void save()}
        disabled={status === "saving"}
        className="mt-5 inline-flex min-h-9 items-center justify-center rounded bg-[var(--accent)] px-4 font-sans text-[13px] font-medium text-white hover:bg-[#245045] disabled:opacity-50"
      >
        {status === "saving" ? "Saving…" : "Save"}
      </button>

      {status === "saved" && (
        <p className="mt-3 font-sans text-[13px] text-[var(--status-good)]">
          Saved. Your zones will update on the next report load.
        </p>
      )}
      {status === "error" && (
        <p className="mt-3 font-sans text-[13px] text-[var(--status-bad)]">
          Max HR: 100–230 bpm. Resting HR: 30–90 bpm.
        </p>
      )}

      <p className="mt-4 font-sans text-[12px] leading-relaxed text-[var(--text-muted)]">
        If you don&apos;t know your max HR, a field test (all-out 400 m sprint or hill repeat)
        gives the most accurate reading. Age-predicted formulas (220 − age) are a rough
        starting point only.
      </p>
    </div>
  );
}
