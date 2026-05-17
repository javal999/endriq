"use client";

/**
 * <DailyJournalCard> — T07 WHOOP-inspired 3-tag daily check-in.
 *
 * Three Yes/No tags, each persisted independently to /api/daily-journal.
 * Card hides after dismissal (cookie `eiq_journal_dismissed_<YYYY-MM-DD>`)
 * or once all three are answered. Parent decides whether to render this at
 * all — when the cookie is already set on the server, just pass `dismissed`.
 *
 * Refs: PHASE-2.1-BUILD.md §6 T07 step 2.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/glass-card";

export interface DailyJournalCardProps {
  /** YYYY-MM-DD today (local). */
  today: string;
  initial?: {
    slept_well: boolean | null;
    travelling: boolean | null;
    stressed: boolean | null;
  };
}

type TagKey = "slept_well" | "travelling" | "stressed";

const QUESTIONS: Array<{ key: TagKey; label: string }> = [
  { key: "slept_well", label: "Slept well last night?" },
  { key: "travelling", label: "Travelling today?" },
  { key: "stressed", label: "Feeling stressed?" },
];

export function DailyJournalCard({ today, initial }: DailyJournalCardProps) {
  const router = useRouter();
  const [values, setValues] = useState<Record<TagKey, boolean | null>>({
    slept_well: initial?.slept_well ?? null,
    travelling: initial?.travelling ?? null,
    stressed: initial?.stressed ?? null,
  });
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  async function setValue(key: TagKey, next: boolean) {
    setError(null);
    setValues((v) => ({ ...v, [key]: next }));
    try {
      const res = await fetch("/api/daily-journal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          check_in_date: today,
          [key]: next,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Couldn't save.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
      setValues((v) => ({ ...v, [key]: initial?.[key] ?? null }));
    }
    startTransition(() => router.refresh());
  }

  function dismiss() {
    document.cookie = `eiq_journal_dismissed_${today}=1; path=/; max-age=86400; samesite=lax`;
    setDismissed(true);
  }

  if (dismissed) return null;
  const allAnswered =
    values.slept_well !== null &&
    values.travelling !== null &&
    values.stressed !== null;

  return (
    <GlassCard ariaLabel="Daily journal tags">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-sans text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
              Quick check-in · {today}
            </p>
            <h3 className="font-sans text-[16px] font-medium text-[var(--text-primary)] [font-family:var(--font-display),Inter,sans-serif]">
              How are you today?
            </h3>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-sm border border-[var(--border)] px-2 py-1 font-sans text-[11px] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text-secondary)]"
            aria-label="Dismiss daily check-in"
          >
            Dismiss
          </button>
        </div>

        <ul className="flex flex-col gap-2">
          {QUESTIONS.map((q) => {
            const v = values[q.key];
            return (
              <li
                key={q.key}
                className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-2 last:border-b-0 last:pb-0"
              >
                <span className="font-sans text-[14px] text-[var(--text-secondary)]">
                  {q.label}
                </span>
                <div role="group" aria-label={q.label} className="flex gap-1.5">
                  <YesNoButton
                    selected={v === true}
                    disabled={pending}
                    onClick={() => setValue(q.key, true)}
                    label="Yes"
                  />
                  <YesNoButton
                    selected={v === false}
                    disabled={pending}
                    onClick={() => setValue(q.key, false)}
                    label="No"
                  />
                </div>
              </li>
            );
          })}
        </ul>

        {error ? (
          <p className="font-sans text-[12px] text-[var(--status-bad)]">{error}</p>
        ) : null}
        {allAnswered ? (
          <p className="font-sans text-[12px] text-[var(--text-muted)]">
            Saved — thanks. Future trend insights will use this data.
          </p>
        ) : (
          <p className="font-sans text-[11px] text-[var(--text-muted)]">
            30 seconds, no streaks, no shame.
          </p>
        )}
      </div>
    </GlassCard>
  );
}

function YesNoButton({
  selected,
  disabled,
  onClick,
  label,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={
        selected
          ? "rounded-sm border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1.5 font-sans text-[12px] font-medium text-[var(--accent-dark)]"
          : "rounded-sm border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 font-sans text-[12px] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
      }
    >
      {label}
    </button>
  );
}
