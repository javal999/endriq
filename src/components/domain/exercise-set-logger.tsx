"use client";

/**
 * <ExerciseSetLogger> — T09 Hevy-inspired per-set logging UI.
 *
 * For each prescribed set of an exercise, three small numeric inputs
 * (weight, reps, RPE) and a "Done" button. Hitting Done saves to
 * /api/strength-set-log and starts a RestTimer for the prescribed
 * rest interval. Stays inline inside the existing exercise card.
 *
 * Refs: PHASE-2.1-BUILD.md §6 T09 step 2.
 */

import { useState } from "react";
import { RestTimer } from "@/components/data/rest-timer";

export interface ExerciseSetLoggerProps {
  /** Stable id (matches one we'll store in DB). */
  exerciseId: string;
  /** Optional FK to the strength_completion row. Null until Mark Complete runs. */
  completionId: string | null;
  /** How many sets the prescription calls for. */
  setsCount: number;
  /** Rest interval in seconds (prescribed). */
  restSeconds: number;
  /** Optional prescribed RPE label — shown as the RPE input placeholder. */
  prescribedRpe?: string | number;
}

interface SetState {
  weight: string;
  reps: string;
  rpe: string;
  saved: boolean;
  saving: boolean;
  error: string | null;
}

function blankSet(): SetState {
  return { weight: "", reps: "", rpe: "", saved: false, saving: false, error: null };
}

export function ExerciseSetLogger({
  exerciseId,
  completionId,
  setsCount,
  restSeconds,
  prescribedRpe,
}: ExerciseSetLoggerProps) {
  const [sets, setSets] = useState<SetState[]>(() =>
    Array.from({ length: Math.max(1, setsCount) }, blankSet),
  );
  const [activeRest, setActiveRest] = useState<number | null>(null);

  function patch(index: number, patch: Partial<SetState>) {
    setSets((s) => s.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function saveSet(index: number) {
    const row = sets[index];
    patch(index, { saving: true, error: null });
    try {
      const res = await fetch("/api/strength-set-log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          completion_id: completionId,
          exercise_id: exerciseId,
          set_number: index + 1,
          weight_kg: row.weight === "" ? null : Number(row.weight),
          reps: row.reps === "" ? null : Number(row.reps),
          rpe: row.rpe === "" ? null : Number(row.rpe),
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Couldn't save set.");
      }
      patch(index, { saving: false, saved: true, error: null });
      setActiveRest(index);
    } catch (e) {
      patch(index, {
        saving: false,
        error: e instanceof Error ? e.message : "Couldn't save set.",
      });
    }
  }

  return (
    <ul className="mt-2 flex flex-col gap-1.5">
      {sets.map((row, i) => {
        const isActive = activeRest === i;
        return (
          <li
            key={i}
            className={
              "flex flex-wrap items-center gap-2 rounded-sm border px-2 py-1.5 " +
              (row.saved
                ? "border-[var(--status-good)]/30 bg-[var(--status-good-bg,transparent)]"
                : "border-[var(--border)] bg-[var(--surface)]")
            }
          >
            <span className="w-8 shrink-0 font-mono text-[12px] text-[var(--text-muted)]">
              #{i + 1}
            </span>
            <NumInput
              ariaLabel={`Set ${i + 1} weight in kg`}
              placeholder="kg"
              step="0.5"
              value={row.weight}
              disabled={row.saved}
              onChange={(v) => patch(i, { weight: v })}
            />
            <NumInput
              ariaLabel={`Set ${i + 1} reps`}
              placeholder="reps"
              step="1"
              value={row.reps}
              disabled={row.saved}
              onChange={(v) => patch(i, { reps: v })}
            />
            <NumInput
              ariaLabel={`Set ${i + 1} RPE`}
              placeholder={prescribedRpe ? `RPE ${prescribedRpe}` : "RPE"}
              step="0.5"
              value={row.rpe}
              disabled={row.saved}
              onChange={(v) => patch(i, { rpe: v })}
            />
            {row.saved ? (
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => patch(i, { saved: false })}
                  className="font-sans text-[11px] text-[var(--accent)] underline underline-offset-2"
                >
                  Edit
                </button>
                {isActive ? (
                  <RestTimer
                    seconds={restSeconds}
                    resetKey={`${exerciseId}-${i}`}
                    onComplete={() => setActiveRest(null)}
                  />
                ) : (
                  <span className="font-sans text-[11px] text-[var(--text-muted)]">
                    Saved
                  </span>
                )}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => saveSet(i)}
                disabled={row.saving}
                className="ml-auto rounded-sm bg-[var(--accent)] px-3 py-1 font-sans text-[12px] font-medium text-[var(--text-on-accent,white)] hover:opacity-90 disabled:opacity-50"
              >
                {row.saving ? "Saving…" : "Done"}
              </button>
            )}
            {row.error ? (
              <p className="basis-full font-sans text-[11px] text-[var(--status-bad)]">
                {row.error}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function NumInput({
  ariaLabel,
  placeholder,
  step,
  value,
  disabled,
  onChange,
}: {
  ariaLabel: string;
  placeholder: string;
  step: string;
  value: string;
  disabled?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <input
      aria-label={ariaLabel}
      type="number"
      inputMode="decimal"
      step={step}
      placeholder={placeholder}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="w-16 rounded-sm border border-[var(--border)] bg-[var(--surface)] px-1.5 py-1 font-mono text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none disabled:opacity-60"
    />
  );
}
