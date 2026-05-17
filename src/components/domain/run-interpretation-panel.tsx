"use client";

/**
 * <RunInterpretationPanel> — F8 hero surface.
 *
 * Renders the live interpretation (pace, HR, RPE, cue) for a coach
 * instruction. Glass treatment per UI design §4.1 — uses the single GlassCard
 * allowed on the page and a stack of inline rows for the three readouts.
 *
 * State management is owned by the parent: the parent runs
 * parseCoachInstruction + interpretRun and hands us the InterpretedRun
 * (or an error). This keeps the component pure-render and dep-injected.
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.1; PHASE-2.0-UI-DESIGN.md §4.1.
 */

import type { InterpretedRun } from "@/lib/analytics/interpretRun";
import type { ConflictNote } from "@/lib/analytics/parseCoachInstruction";
import type { CitationId } from "@/lib/data/citations";
import { GlassCard } from "@/components/ui/glass-card";
import { AdvisoryBlock } from "@/components/ui/advisory-block";
import { ConfidencePill } from "@/components/data/confidence-pill";
import { EvidenceCitation } from "@/components/data/evidence-citation";

export interface RunInterpretationPanelProps {
  /** The interpretation engine output, or null when no input yet, or an error. */
  interpretation:
    | InterpretedRun
    | { error: string; raw: string }
    | null;
  /** Locale for confidence pill labels. */
  locale?: "en" | "id";
  /** Optional session label heading ("Tuesday — Easy run"). */
  sessionHeading?: string;
}

export function RunInterpretationPanel({
  interpretation,
  locale = "en",
  sessionHeading,
}: RunInterpretationPanelProps) {
  if (interpretation == null) {
    return null;
  }

  if ("error" in interpretation) {
    return (
      <AdvisoryBlock tone="warn">
        <p className="font-sans text-[14px] text-[var(--text-primary)]">
          {interpretation.error}
        </p>
      </AdvisoryBlock>
    );
  }

  const { paceRange, hrRange, rpeAnchor, conversationalCue, confidence, methodologyCitationIds, conflicts } =
    interpretation;

  return (
    <GlassCard ariaLabel="Run interpretation">
      <div className="eiq-interpretation-fade flex flex-col gap-4">
        {sessionHeading && (
          <h3 className="font-sans text-[18px] font-medium leading-6 text-[var(--text-primary)] [font-family:var(--font-display),Inter,sans-serif]">
            {sessionHeading}
          </h3>
        )}

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ReadoutRow label="Pace" value={formatPaceRange(paceRange)} />
          <ReadoutRow label="HR" value={formatHrRange(hrRange)} />
          <ReadoutRow label="RPE" value={`${formatRpe(rpeAnchor)} / 10`} />
        </dl>

        <p className="italic [font-family:var(--font-serif),Georgia,serif] text-[15px] leading-[22px] text-[var(--text-secondary)]">
          {conversationalCue}
        </p>

        <AdvisoryBlock tone="accent">
          <p className="font-sans text-[13px] text-[var(--text-secondary)]">
            If it feels harder than this, ease off. Ranges are a guide, not a target.
          </p>
        </AdvisoryBlock>

        {conflicts.length > 0 && (
          <div className="flex flex-col gap-1">
            {conflicts.map((c: ConflictNote, i: number) => (
              <p
                key={i}
                className="font-sans text-[12px] text-[var(--status-warn)]"
              >
                {c.message}
              </p>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <ConfidencePill level={confidence} locale={locale} />
          <p className="font-sans text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
            Methodology:{" "}
            {methodologyCitationIds.map((id: CitationId, i: number) => (
              <span key={id}>
                {i > 0 && "; "}
                <EvidenceCitation id={id} />
              </span>
            ))}
          </p>
        </div>
      </div>
    </GlassCard>
  );
}

function ReadoutRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-sans text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </dt>
      <dd className="mt-0.5 font-mono text-[20px] leading-[24px] font-medium text-[var(--text-primary)]">
        {value}
      </dd>
    </div>
  );
}

function formatPaceRange(p: [number, number] | null): string {
  if (!p) return "—";
  return `${secToPace(p[0])}–${secToPace(p[1])}/km`;
}

function formatHrRange(p: [number, number] | null): string {
  if (!p) return "—";
  return `${p[0]}–${p[1]} bpm`;
}

function formatRpe(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function secToPace(secPerKm: number): string {
  const min = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm - min * 60)
    .toString()
    .padStart(2, "0");
  return `${min}:${s}`;
}

