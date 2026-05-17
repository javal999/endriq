"use client";

/**
 * <PostSessionSurveyModal> — T08 TrainerRoad-style post-session feel.
 *
 * Pops after Mark Complete saves successfully (parent controls open state).
 * Three buttons; selection PATCHes `/api/strength-completion` with
 * `{ id, post_session_feel }`. Auto-dismisses on selection.
 *
 * Modal is full-screen on mobile, centered card on desktop. Backdrop
 * click and Escape both call onDismiss without saving.
 *
 * Refs: PHASE-2.1-BUILD.md §6 T08 step 2.
 */

import { useEffect, useState } from "react";

export type PostSessionFeel =
  | "easier_than_expected"
  | "right"
  | "harder_than_expected";

export interface PostSessionSurveyModalProps {
  open: boolean;
  completionId: string;
  onDismiss: () => void;
  onSaved?: (feel: PostSessionFeel) => void;
}

const CHOICES: Array<{ feel: PostSessionFeel; label: string; sub: string }> = [
  {
    feel: "easier_than_expected",
    label: "Easier than expected",
    sub: "Could have done more",
  },
  {
    feel: "right",
    label: "About right",
    sub: "Felt on point",
  },
  {
    feel: "harder_than_expected",
    label: "Harder than expected",
    sub: "Took everything I had",
  },
];

export function PostSessionSurveyModal({
  open,
  completionId,
  onDismiss,
  onSaved,
}: PostSessionSurveyModalProps) {
  const [submitting, setSubmitting] = useState<PostSessionFeel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onDismiss]);

  if (!open) return null;

  async function submit(feel: PostSessionFeel) {
    setSubmitting(feel);
    setError(null);
    try {
      const res = await fetch("/api/strength-completion", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: completionId, post_session_feel: feel }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Couldn't save.");
      }
      onSaved?.(feel);
      onDismiss();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-session-survey-heading"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm md:items-center md:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss();
      }}
    >
      <div className="w-full max-w-md rounded-t-[16px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl md:rounded-[16px]">
        <h2
          id="post-session-survey-heading"
          className="font-sans text-[18px] font-medium text-[var(--text-primary)] [font-family:var(--font-display),Inter,sans-serif]"
        >
          How did that feel?
        </h2>
        <p className="mt-1 font-sans text-[12px] text-[var(--text-muted)]">
          One tap — informs your next session.
        </p>

        <ul className="mt-4 flex flex-col gap-2">
          {CHOICES.map((c) => (
            <li key={c.feel}>
              <button
                type="button"
                onClick={() => submit(c.feel)}
                disabled={submitting !== null}
                className="flex w-full items-start justify-between gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] disabled:opacity-50"
              >
                <span>
                  <span className="block font-sans text-[14px] font-medium text-[var(--text-primary)]">
                    {c.label}
                  </span>
                  <span className="block font-sans text-[12px] text-[var(--text-muted)]">
                    {c.sub}
                  </span>
                </span>
                {submitting === c.feel ? (
                  <span className="font-sans text-[12px] text-[var(--text-muted)]">
                    Saving…
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>

        {error ? (
          <p className="mt-3 font-sans text-[12px] text-[var(--status-bad)]">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onDismiss}
            className="font-sans text-[12px] text-[var(--text-muted)] underline underline-offset-2 hover:text-[var(--text-secondary)]"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
