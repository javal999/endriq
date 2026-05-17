"use client";

/**
 * <StrengthSessionDetail> — F10 hero surface.
 *
 * Renders a single strength session as five blocks (rationale, warmup,
 * main work, cooldown, post-session) with per-exercise detail (name,
 * sets × reps, RPE, tempo, rest, cue, demo URL).
 *
 * Owns minimal local state: Travel Mode toggle and the Mark-Complete
 * request lifecycle.
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.3; PHASE-2.0-UI-DESIGN.md §4.2;
 *       PHASE-2.0-BUILD.md T09.
 */

import { useMemo, useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { HairlineCard } from "@/components/ui/hairline-card";
import { AdvisoryBlock } from "@/components/ui/advisory-block";
import { EvidenceCitation } from "@/components/data/evidence-citation";
import { ExerciseSetLogger } from "@/components/domain/exercise-set-logger";
import {
  PostSessionSurveyModal,
  type PostSessionFeel,
} from "@/components/domain/post-session-survey-modal";
import type {
  SessionBlock,
  StrengthSessionDetail as StrengthSessionDetailModel,
} from "@/lib/analytics/strength-session-detail";

export interface StrengthSessionDetailProps {
  session: StrengthSessionDetailModel;
  /** Allows parent to wire up persistence; defaults to fetch('/api/strength-completion'). */
  onMarkComplete?: (sessionId: string) => Promise<void>;
  /** Optional callback when Travel Mode is toggled (parent may want to re-fetch with new menu). */
  onTravelModeChange?: (enabled: boolean) => void;
}

const REVIEW_BADGE_TEXT: Record<
  StrengthSessionDetailModel["reviewState"],
  string
> = {
  evidence_only: "Evidence-based · Pending coach review",
  community_reviewed: "Evidence-based · Community-reviewed",
  coach_reviewed: "Coach-reviewed",
};

export function StrengthSessionDetail({
  session,
  onMarkComplete,
  onTravelModeChange,
}: StrengthSessionDetailProps) {
  const [travelMode, setTravelMode] = useState(session.travelMode);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // T09: opt-in per-set logging mode. "all" = legacy mark-complete only.
  const [loggingMode, setLoggingMode] = useState<"all" | "per_set">("all");
  // T08: completion id used to PATCH the post_session_feel after Mark Complete.
  const [completionId, setCompletionId] = useState<string | null>(null);
  const [surveyOpen, setSurveyOpen] = useState(false);

  const expandedDuration = useMemo(() => {
    const h = Math.floor(session.totalDurationMin / 60);
    const m = session.totalDurationMin % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }, [session.totalDurationMin]);

  async function markComplete() {
    setError(null);
    setCompleting(true);
    try {
      if (onMarkComplete) {
        await onMarkComplete(session.sessionId);
      } else {
        const res = await fetch("/api/strength-completion", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ session_id: session.sessionId }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Couldn't save. We'll retry.");
        }
        const j = (await res.json()) as {
          completion?: { id?: string };
        };
        if (j.completion?.id) setCompletionId(j.completion.id);
      }
      setCompleted(true);
      // T08: open the survey if we have a completion id to PATCH onto.
      // When the parent owns onMarkComplete, it can render its own survey.
      if (!onMarkComplete) setSurveyOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save. We'll retry.");
    } finally {
      setCompleting(false);
    }
  }

  function handleSurveySaved(_feel: PostSessionFeel) {
    // No-op — survey modal closes itself; computeTodaysPlan will pick it
    // up on the next /dashboard render.
    void _feel;
  }

  function toggleTravel() {
    const next = !travelMode;
    setTravelMode(next);
    onTravelModeChange?.(next);
  }

  return (
    <div className="space-y-5">
      {/* Header card — glass treatment */}
      <GlassCard ariaLabel="Strength session header">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-sans text-[20px] font-medium leading-7 text-[var(--text-primary)] [font-family:var(--font-display),Inter,sans-serif]">
              Strength session
            </h2>
            <span className="rounded-sm bg-[var(--surface-raised)] px-2 py-0.5 font-sans text-[11px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
              {expandedDuration}
            </span>
          </div>

          <p className="italic [font-family:var(--font-serif),Georgia,serif] text-[15px] leading-[22px] text-[var(--text-secondary)]">
            {session.rationale}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-sm bg-[var(--accent-soft)] px-2 py-0.5 font-sans text-[11px] font-medium uppercase tracking-wider text-[var(--accent-dark)]">
              {REVIEW_BADGE_TEXT[session.reviewState]}
            </span>
            <button
              type="button"
              onClick={toggleTravel}
              aria-pressed={travelMode}
              className={
                "rounded-sm border px-2.5 py-1 font-sans text-[12px] " +
                (travelMode
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-dark)]"
                  : "border-[var(--border)] bg-transparent text-[var(--text-secondary)] hover:border-[var(--border-strong)]")
              }
            >
              Travel mode {travelMode ? "on" : "off"}
            </button>
            <button
              type="button"
              onClick={() =>
                setLoggingMode((m) => (m === "all" ? "per_set" : "all"))
              }
              aria-pressed={loggingMode === "per_set"}
              className={
                "rounded-sm border px-2.5 py-1 font-sans text-[12px] " +
                (loggingMode === "per_set"
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-dark)]"
                  : "border-[var(--border)] bg-transparent text-[var(--text-secondary)] hover:border-[var(--border-strong)]")
              }
            >
              Log per-set {loggingMode === "per_set" ? "on" : "off"}
            </button>
          </div>
        </div>
      </GlassCard>

      {session.raceWeekLocked && (
        <AdvisoryBlock tone="bad">
          <p className="font-sans text-[14px] text-[var(--text-primary)]">
            {session.lockedMessage}
          </p>
        </AdvisoryBlock>
      )}

      {!session.raceWeekLocked && session.excludedForTravel.length > 0 && (
        <AdvisoryBlock tone="info">
          <p className="font-sans text-[13px] text-[var(--text-secondary)]">
            {session.excludedForTravel.length} exercise
            {session.excludedForTravel.length === 1 ? "" : "s"} filtered for travel mode:{" "}
            {session.excludedForTravel.join(", ")}
          </p>
        </AdvisoryBlock>
      )}

      {/* Blocks */}
      {session.blocks.map((block) => (
        <BlockSection
          key={block.kind}
          block={block}
          loggingMode={loggingMode}
          completionId={completionId}
        />
      ))}

      {/* Mark complete */}
      <div className="space-y-2">
        {error && (
          <AdvisoryBlock tone="warn">
            <p className="font-sans text-[13px] text-[var(--status-bad)]">{error}</p>
          </AdvisoryBlock>
        )}
        <button
          type="button"
          onClick={markComplete}
          disabled={completing || completed || session.raceWeekLocked}
          className={
            "w-full rounded-md px-5 py-3 font-sans text-[14px] font-medium " +
            (completed
              ? "bg-[var(--status-good-bg)] text-[var(--status-good)]"
              : "bg-[var(--accent)] text-[var(--text-on-accent)] hover:opacity-90 disabled:opacity-50")
          }
        >
          {completed
            ? "✓ Completed"
            : completing
              ? "Saving…"
              : "Mark complete"}
        </button>
        {session.raceWeekLocked && (
          <p className="text-center font-sans text-[12px] italic text-[var(--text-muted)]">
            No completions logged during race-week lockdown.
          </p>
        )}
      </div>

      <p className="font-sans text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
        Methodology:{" "}
        {session.methodologyCitationIds.map((id, i) => (
          <span key={id}>
            {i > 0 && "; "}
            <EvidenceCitation id={id} />
          </span>
        ))}
      </p>

      {completionId ? (
        <PostSessionSurveyModal
          open={surveyOpen}
          completionId={completionId}
          onDismiss={() => setSurveyOpen(false)}
          onSaved={handleSurveySaved}
        />
      ) : null}
    </div>
  );
}

function BlockSection({
  block,
  loggingMode,
  completionId,
}: {
  block: SessionBlock;
  loggingMode: "all" | "per_set";
  completionId: string | null;
}) {
  if (block.exercises.length === 0) {
    if (block.kind === "main") {
      // Hidden when race-week-locked — the AdvisoryBlock above explains it.
      return null;
    }
    if (block.kind === "post_session") {
      return (
        <section>
          <h3 className="font-sans text-[13px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
            {block.heading}
          </h3>
          <p className="mt-2 font-sans text-[14px] text-[var(--text-secondary)]">
            {block.blurb}
          </p>
        </section>
      );
    }
    return null;
  }
  return (
    <section>
      <h3 className="font-sans text-[13px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
        {block.heading}
      </h3>
      <p className="mt-2 font-sans text-[14px] text-[var(--text-secondary)]">
        {block.blurb}
      </p>
      <ul className="mt-3 space-y-2">
        {block.exercises.map((ex, i) => (
          <li key={`${ex.id}-${i}`}>
            <HairlineCard className="flex flex-col gap-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-sans text-[15px] font-medium text-[var(--text-primary)]">
                  {i + 1}. {ex.name}
                </span>
                <span className="font-mono text-[13px] text-[var(--text-secondary)]">
                  {ex.sets_reps} · RPE {ex.rpe_target} · {ex.rest_seconds}s rest
                </span>
              </div>
              <div className="flex flex-wrap gap-3 font-sans text-[12px] text-[var(--text-muted)]">
                <span>
                  Tempo: <span className="font-mono">{ex.tempo}</span>
                </span>
                <a
                  href={ex.demo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent)] underline underline-offset-2"
                >
                  Watch demo ↗
                </a>
              </div>
              {ex.cue && (
                <p className="italic [font-family:var(--font-serif),Georgia,serif] text-[13px] text-[var(--text-secondary)]">
                  Cue: {ex.cue}
                </p>
              )}
              {loggingMode === "per_set" && block.kind === "main" ? (
                <ExerciseSetLogger
                  exerciseId={ex.id}
                  completionId={completionId}
                  setsCount={parseSetsCount(ex.sets_reps)}
                  restSeconds={ex.rest_seconds}
                  prescribedRpe={ex.rpe_target}
                />
              ) : null}
            </HairlineCard>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Parse the leading number from "4×8", "5x5", "3 x 10" — defaults to 3 if unparseable. */
function parseSetsCount(setsReps: string): number {
  const m = /^\s*(\d+)\s*[x×]/i.exec(setsReps);
  if (m) {
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n) && n >= 1 && n <= 20) return n;
  }
  return 3;
}
