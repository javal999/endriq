"use client";

/**
 * <PreSessionPreviewCard> — F11 night-before preview.
 *
 * Shows tomorrow's planned sessions + the three-button feeling picker.
 * Reports the choice to /api/recovery-check-in; if the athlete picks
 * "tired" AND tomorrow is heavy, prompts the RecoveryOverrideModal
 * (rendered as a sibling).
 *
 * Should be rendered by the parent (dashboard / /week) only after 18:00
 * local on a day that has a planned session for tomorrow.
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.4 F11 + §5.5 F12;
 *       PHASE-2.0-BUILD.md T12 steps 3-4 + 7.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/glass-card";
import { FeelingButtonRow } from "@/components/inputs/feeling-button-row";
import { SessionTypeChip } from "@/components/inputs/session-type-chip";
import { RecoveryOverrideModal } from "@/components/domain/recovery-override-modal";
import {
  planSwap,
  type Feeling,
} from "@/lib/analytics/recoveryOverride";
import type { PlannedSessionEntry } from "@/lib/plan/types";

export interface PreSessionPreviewCardProps {
  /** YYYY-MM-DD of tomorrow. */
  tomorrowDate: string;
  /** Tomorrow's planned sessions (typical-week + override merge result). */
  tomorrowSessions: PlannedSessionEntry[];
  /** Optional initial value if the athlete already checked in tonight. */
  initialFeeling?: Feeling | null;
  /** Locale for copy. */
  locale?: "en" | "id";
}

const HEADING_EN: Record<Feeling | "default", string> = {
  default: "How are you feeling tonight?",
  sharp: "Sharp — keep the plan.",
  okay: "Okay — keep the plan.",
  tired: "Tired — review tomorrow?",
};

export function PreSessionPreviewCard({
  tomorrowDate,
  tomorrowSessions,
  initialFeeling = null,
}: PreSessionPreviewCardProps) {
  const router = useRouter();
  const [feeling, setFeeling] = useState<Feeling | null>(initialFeeling);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const swap = feeling ? planSwap(feeling, tomorrowSessions) : null;

  async function recordFeeling(next: Feeling) {
    setError(null);
    setFeeling(next);
    try {
      const res = await fetch("/api/recovery-check-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          check_in_date: tomorrowDate,
          feeling: next,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Couldn't save.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
    }
    if (next === "tired" && swap?.isHeavyDay) {
      setModalOpen(true);
    }
    startTransition(() => router.refresh());
  }

  return (
    <>
      <GlassCard ariaLabel="Tomorrow's session preview">
        <div className="flex flex-col gap-3">
          <p className="font-sans text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
            Tomorrow · {tomorrowDate}
          </p>

          <h3 className="font-sans text-[18px] font-medium text-[var(--text-primary)] [font-family:var(--font-display),Inter,sans-serif]">
            {feeling ? HEADING_EN[feeling] : HEADING_EN.default}
          </h3>

          <div className="flex flex-wrap gap-1.5">
            {tomorrowSessions.length === 0 ? (
              <span className="font-sans text-[14px] italic text-[var(--text-muted)]">
                Rest day planned.
              </span>
            ) : (
              tomorrowSessions.map((s, i) => (
                <SessionTypeChip key={`${s.type}-${i}`} type={s.type} />
              ))
            )}
          </div>

          <div className="pt-2">
            <FeelingButtonRow
              value={feeling}
              onChange={(v) => void recordFeeling(v)}
              disabled={pending}
            />
          </div>

          {error && (
            <p className="font-sans text-[12px] text-[var(--status-bad)]">{error}</p>
          )}

          {feeling === "tired" && swap?.isHeavyDay && !modalOpen && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="self-start font-sans text-[13px] font-medium text-[var(--accent)] underline underline-offset-2"
            >
              Review swap options →
            </button>
          )}
        </div>
      </GlassCard>

      {modalOpen && swap && (
        <RecoveryOverrideModal
          tomorrowDate={tomorrowDate}
          originalSessions={tomorrowSessions}
          swap={swap}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
