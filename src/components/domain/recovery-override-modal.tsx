"use client";

/**
 * <RecoveryOverrideModal> — F12 swap prompt.
 *
 * Three options:
 *   1. Swap to easier — applies the SwapPlan, upserts planned_sessions.
 *   2. Take rest — replaces tomorrow's sessions with a single rest entry.
 *   3. Keep plan — closes the modal, no DB write.
 *
 * Plain dialog with a backdrop. Doesn't depend on a portal/Headless UI
 * to keep the surface minimal.
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.5 F12; PHASE-2.0-BUILD.md T12 step 4.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SessionTypeChip } from "@/components/inputs/session-type-chip";
import { HairlineCard } from "@/components/ui/hairline-card";
import type { SwapPlan } from "@/lib/analytics/recoveryOverride";
import type { PlannedSessionEntry } from "@/lib/plan/types";

export interface RecoveryOverrideModalProps {
  tomorrowDate: string;
  originalSessions: PlannedSessionEntry[];
  swap: SwapPlan;
  onClose: () => void;
}

export function RecoveryOverrideModal({
  tomorrowDate,
  originalSessions,
  swap,
  onClose,
}: RecoveryOverrideModalProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submittingAction, setSubmittingAction] = useState<null | "swap" | "rest">(null);
  const [error, setError] = useState<string | null>(null);

  async function persistOverride(nextSessions: PlannedSessionEntry[], action: "swap" | "rest") {
    setError(null);
    setSubmittingAction(action);
    try {
      const res = await fetch("/api/planned-session", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          planned_date: tomorrowDate,
          sessions: nextSessions,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Couldn't save.");
      }
      onClose();
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setSubmittingAction(null);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal
      aria-labelledby="recovery-override-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-[var(--surface)] p-5 shadow-xl">
        <h2
          id="recovery-override-title"
          className="font-sans text-[17px] font-semibold text-[var(--text-primary)] [font-family:var(--font-display),Inter,sans-serif]"
        >
          Tired tonight? Three options for tomorrow.
        </h2>

        <div className="mt-4 space-y-3">
          <HairlineCard>
            <p className="font-sans text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
              Planned
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {originalSessions.map((s, i) => (
                <SessionTypeChip key={`p-${i}`} type={s.type} />
              ))}
            </div>
          </HairlineCard>

          <HairlineCard emphasised>
            <p className="font-sans text-[12px] font-medium uppercase tracking-wider text-[var(--accent-dark)]">
              Suggested swap
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {swap.swappedSessions.map((s, i) => (
                <SessionTypeChip key={`s-${i}`} type={s.type} />
              ))}
            </div>
            <p className="mt-2 font-sans text-[13px] text-[var(--text-secondary)]">
              {swap.summary}
            </p>
          </HairlineCard>
        </div>

        {error && (
          <p className="mt-3 font-sans text-[13px] text-[var(--status-bad)]">{error}</p>
        )}

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => void persistOverride(swap.swappedSessions, "swap")}
            className="w-full rounded-md bg-[var(--accent)] px-4 py-2.5 font-sans text-[14px] font-medium text-[var(--text-on-accent)] hover:opacity-90 disabled:opacity-50"
          >
            {submittingAction === "swap" ? "Saving…" : "Swap to easier"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void persistOverride([{ type: "rest" }], "rest")}
            className="w-full rounded-md border border-[var(--border)] bg-transparent px-4 py-2.5 font-sans text-[14px] text-[var(--text-primary)] hover:border-[var(--border-strong)] disabled:opacity-50"
          >
            {submittingAction === "rest" ? "Saving…" : "Take rest"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="w-full rounded-md bg-transparent px-4 py-2.5 font-sans text-[14px] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            Keep plan
          </button>
        </div>
      </div>
    </div>
  );
}
