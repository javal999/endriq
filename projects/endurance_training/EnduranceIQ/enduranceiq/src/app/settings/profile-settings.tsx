"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ProfileSettings({
  athleteId,
  initialMaxHr,
}: {
  athleteId: string;
  initialMaxHr: number | null;
}) {
  const [maxHr, setMaxHr] = useState(initialMaxHr?.toString() ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save() {
    const val = maxHr.trim() === "" ? null : Number(maxHr);
    if (val !== null && (Number.isNaN(val) || val < 100 || val > 230)) {
      setStatus("error");
      return;
    }
    setStatus("saving");
    const supabase = createClient();
    const { error } = await supabase
      .from("athletes")
      .update({ observed_max_hr: val })
      .eq("id", athleteId);
    setStatus(error ? "error" : "saved");
    if (!error) setTimeout(() => setStatus("idle"), 2500);
  }

  return (
    <div className="mt-4 rounded border border-[var(--border)] bg-[var(--surface)] p-6">
      <h3 className="font-sans text-[14px] font-medium text-[var(--text-primary)]">
        Profile
      </h3>
      <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-secondary)]">
        Your max HR is used to calculate HR zones. If not set, the system estimates
        it from your highest recorded HR — which can be too low and push all sessions
        into hard zones.
      </p>

      <div className="mt-5 flex items-end gap-3">
        <div>
          <label
            htmlFor="max-hr"
            className="block font-sans text-[12px] font-medium text-[var(--text-secondary)]"
          >
            Max HR (bpm)
          </label>
          <div className="mt-1 flex items-center gap-2">
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
        <button
          onClick={() => void save()}
          disabled={status === "saving"}
          className="inline-flex min-h-9 items-center justify-center rounded bg-[var(--accent)] px-4 font-sans text-[13px] font-medium text-white hover:bg-[#245045] disabled:opacity-50"
        >
          {status === "saving" ? "Saving…" : "Save"}
        </button>
      </div>

      {status === "saved" && (
        <p className="mt-3 font-sans text-[13px] text-[var(--status-good)]">
          Saved. Your zones will update on the next report load.
        </p>
      )}
      {status === "error" && (
        <p className="mt-3 font-sans text-[13px] text-[var(--status-bad)]">
          Enter a value between 100 and 230 bpm.
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
