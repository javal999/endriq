/**
 * <TodaysPlanTile> — Phase 2.1 §T02 dashboard hero.
 *
 * Renders the computeTodaysPlan output: a status pill + serif-italic
 * summary sentence + a 3-row contributors panel (Recovery / Load / Planned).
 * Warn-tone left border when the recommendation overrides the planned
 * default (ease_back / consider_rest) — council fix #10.
 *
 * NO <AISparkle> — this is deterministic compute, not LLM.
 */

import type {
  TodaysPlanOutput,
  TodaysPlanContributor,
} from "@/lib/analytics/todaysPlan";

const RECOMMENDATION_LABEL: Record<TodaysPlanOutput["recommendation"], string> = {
  train_as_planned: "Train as planned",
  ease_back: "Ease back",
  consider_rest: "Consider rest",
  no_session: "Nothing planned",
};

const RECOMMENDATION_TONE: Record<
  TodaysPlanOutput["recommendation"],
  { bg: string; fg: string }
> = {
  train_as_planned: {
    bg: "var(--status-good-bg)",
    fg: "var(--status-good)",
  },
  ease_back: {
    bg: "var(--status-warn-bg)",
    fg: "var(--status-warn)",
  },
  consider_rest: {
    bg: "var(--status-bad-bg)",
    fg: "var(--status-bad)",
  },
  no_session: {
    bg: "var(--surface-raised)",
    fg: "var(--text-secondary)",
  },
};

const CONTRIBUTOR_TONE: Record<
  TodaysPlanContributor["tone"],
  string
> = {
  good: "var(--status-good)",
  warn: "var(--status-warn)",
  bad: "var(--status-bad)",
  neutral: "var(--text-secondary)",
};

export interface TodaysPlanTileProps {
  plan: TodaysPlanOutput;
}

export function TodaysPlanTile({ plan }: TodaysPlanTileProps) {
  const tone = RECOMMENDATION_TONE[plan.recommendation];
  return (
    <section
      aria-label="Today's plan"
      style={{
        background: "var(--surface)",
        border: "var(--card-border)",
        borderRadius: "var(--radius-card)",
        borderLeft: plan.isOverride
          ? "1.5px solid var(--status-warn)"
          : undefined,
      }}
      className="p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-sans text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Today&apos;s plan
        </p>
        <span
          style={{ background: tone.bg, color: tone.fg }}
          className="inline-flex rounded-sm px-2 py-0.5 font-sans text-[11px] font-medium"
        >
          {RECOMMENDATION_LABEL[plan.recommendation]}
        </span>
      </div>

      <p className="mt-3 italic [font-family:var(--font-serif),Georgia,serif] text-[15px] leading-[22px] text-[var(--text-primary)]">
        {plan.summarySentence}
      </p>

      <dl className="mt-4 grid grid-cols-1 gap-2 rounded-md bg-[var(--surface-raised)] p-3 md:grid-cols-3">
        {plan.contributors.map((c) => (
          <div key={c.label} className="flex items-baseline justify-between gap-2 md:flex-col md:items-start">
            <dt className="font-sans text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
              {c.label}
            </dt>
            <dd
              style={{ color: CONTRIBUTOR_TONE[c.tone] }}
              className="font-mono text-[13px] font-medium"
            >
              {c.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
