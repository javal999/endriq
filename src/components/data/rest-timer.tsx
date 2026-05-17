"use client";

/**
 * <RestTimer> — T09 inline countdown for between-set rest.
 *
 * mm:ss countdown. Haptic vibration on mobile when timer hits zero (uses
 * navigator.vibrate; gracefully no-ops on unsupported browsers).
 *
 * Refs: PHASE-2.1-BUILD.md §6 T09 step 3.
 */

import { useEffect, useRef, useState } from "react";

export interface RestTimerProps {
  /** Initial countdown in seconds. */
  seconds: number;
  /** Resets the countdown when this value changes. Useful when a new set starts. */
  resetKey?: string | number;
  onComplete?: () => void;
}

function format(s: number): string {
  const safe = Math.max(0, s);
  const m = Math.floor(safe / 60);
  const r = safe % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function RestTimer({ seconds, resetKey, onComplete }: RestTimerProps) {
  const [remaining, setRemaining] = useState(seconds);
  const completed = useRef(false);

  useEffect(() => {
    setRemaining(seconds);
    completed.current = false;
  }, [seconds, resetKey]);

  useEffect(() => {
    if (remaining <= 0) {
      if (!completed.current) {
        completed.current = true;
        if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
          try {
            navigator.vibrate(100);
          } catch {
            // ignore — browser may forbid in iframe / first interaction
          }
        }
        onComplete?.();
      }
      return;
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining, onComplete]);

  const done = remaining <= 0;
  return (
    <span
      role="timer"
      aria-live="polite"
      className={
        "inline-flex items-center gap-1 font-mono text-[13px] tabular-nums " +
        (done ? "text-[var(--status-good)]" : "text-[var(--text-secondary)]")
      }
    >
      <span aria-hidden>{done ? "●" : "○"}</span>
      <span>{done ? "Rest done" : format(remaining)}</span>
    </span>
  );
}
