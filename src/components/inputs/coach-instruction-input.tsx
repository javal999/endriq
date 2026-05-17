"use client";

/**
 * <CoachInstructionInput> — textarea + 250ms debounced live interpretation.
 *
 * Calls the supplied `onInterpret` after each idle window so the panel
 * upstream can re-render with the new parsed/interpreted output. Designed
 * to feel like the input is being read in real time without burning CPU on
 * every keystroke.
 *
 * Refs: PHASE-2.0-UI-DESIGN.md §3.3 + §4.1.
 */

import { useEffect, useRef, useState } from "react";

export interface CoachInstructionInputProps {
  /** Initial value (e.g. when editing a saved planned session). */
  initialValue?: string;
  /** Fires after the debounce window with the latest text. */
  onInterpret: (text: string) => void;
  /** Placeholder copy; localise upstream. */
  placeholder?: string;
  /** Debounce window in ms. Default 250 per PRD §5.1 latency target. */
  debounceMs?: number;
  /** ARIA label for the textarea. */
  ariaLabel?: string;
}

export function CoachInstructionInput({
  initialValue = "",
  onInterpret,
  placeholder = "What did your coach say? e.g. '60% RPE easy 10km' or '8x800 @ 3:30 / 90s'",
  debounceMs = 250,
  ariaLabel = "Coach instruction",
}: CoachInstructionInputProps) {
  const [value, setValue] = useState(initialValue);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onInterpret(value), debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, debounceMs, onInterpret]);

  return (
    <label className="block">
      <span className="sr-only">{ariaLabel}</span>
      <textarea
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className={
          "block w-full resize-y rounded-md " +
          "border border-[var(--border)] bg-[var(--canvas)] " +
          "px-3 py-2 font-sans text-[14px] text-[var(--text-primary)] " +
          "placeholder:text-[var(--text-muted)] " +
          "focus:border-[var(--accent)] focus:outline-none"
        }
      />
    </label>
  );
}
