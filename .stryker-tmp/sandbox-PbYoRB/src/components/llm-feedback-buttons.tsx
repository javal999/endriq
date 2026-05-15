// @ts-nocheck
"use client";

import { useState } from "react";

type Rating = 1 | -1 | null;

export function LlmFeedbackButtons({
  weekStart,
  promptType,
}: {
  weekStart: string;
  promptType: "weekly_analysis" | "intensity_explanation" | "session_statuses";
}) {
  const [rating, setRating] = useState<Rating>(null);
  const [pending, setPending] = useState(false);

  async function vote(value: 1 | -1) {
    if (pending) return;
    setPending(true);
    try {
      const res = await fetch("/api/llm-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week_start: weekStart, prompt_type: promptType, rating: value }),
      });
      if (res.ok) setRating(value);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      <span className="font-sans text-[11px] text-[var(--text-muted)]">
        Was this helpful?
      </span>
      <button
        onClick={() => vote(1)}
        disabled={pending}
        aria-label="Helpful"
        aria-pressed={rating === 1}
        className={`rounded px-2 py-1 font-sans text-[12px] transition-colors ${
          rating === 1
            ? "bg-[rgba(46,125,91,0.12)] text-[var(--status-good)]"
            : "text-[var(--text-muted)] hover:text-[var(--status-good)]"
        }`}
      >
        ↑
      </button>
      <button
        onClick={() => vote(-1)}
        disabled={pending}
        aria-label="Not helpful"
        aria-pressed={rating === -1}
        className={`rounded px-2 py-1 font-sans text-[12px] transition-colors ${
          rating === -1
            ? "bg-[rgba(196,75,63,0.08)] text-[var(--status-bad)]"
            : "text-[var(--text-muted)] hover:text-[var(--status-bad)]"
        }`}
      >
        ↓
      </button>
    </div>
  );
}
