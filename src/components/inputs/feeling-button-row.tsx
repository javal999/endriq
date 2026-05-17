"use client";

/**
 * <FeelingButtonRow> — three-button picker for F11.
 *
 * Used by PreSessionPreviewCard. Controlled component; parent owns state.
 *
 * Refs: PHASE-2.0-UI-DESIGN.md §3.3.
 */

import type { Feeling } from "@/lib/analytics/recoveryOverride";

const LABELS: Record<Feeling, { label: string; description: string }> = {
  sharp: { label: "Sharp", description: "Fresh, ready to push" },
  okay: { label: "Okay", description: "A normal day" },
  tired: { label: "Tired", description: "Heavy legs / poor sleep" },
};

const ORDER: Feeling[] = ["sharp", "okay", "tired"];

export interface FeelingButtonRowProps {
  value: Feeling | null;
  onChange: (next: Feeling) => void;
  disabled?: boolean;
}

export function FeelingButtonRow({ value, onChange, disabled }: FeelingButtonRowProps) {
  return (
    <div role="radiogroup" aria-label="How are you feeling tonight?" className="grid grid-cols-3 gap-2">
      {ORDER.map((feeling) => {
        const selected = value === feeling;
        return (
          <button
            key={feeling}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(feeling)}
            className={
              "flex min-h-[3rem] flex-col items-center justify-center rounded-md border px-3 py-2 transition-colors " +
              (selected
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-dark)]"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--border-strong)]") +
              " disabled:opacity-50"
            }
          >
            <span className="font-sans text-[14px] font-medium">
              {LABELS[feeling].label}
            </span>
            <span className="font-sans text-[11px] text-[var(--text-muted)]">
              {LABELS[feeling].description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
