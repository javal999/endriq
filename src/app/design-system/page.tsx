import { notFound } from "next/navigation";
import { ActivityRings } from "@/components/data/activity-rings";
import { AISparkle } from "@/components/data/ai-sparkle";
import { MetricCard } from "@/components/data/metric-card";
import { PhasePill } from "@/components/data/phase-pill";
import { ConfidencePill } from "@/components/data/confidence-pill";
import { EvidenceCitation } from "@/components/data/evidence-citation";
import { GlassCard } from "@/components/ui/glass-card";
import { HairlineCard } from "@/components/ui/hairline-card";
import { AdvisoryBlock } from "@/components/ui/advisory-block";
import { SessionTypeChip } from "@/components/inputs/session-type-chip";

/**
 * /design-system — Storybook-lite gallery for visual QA.
 *
 * Dev-only: returns 404 in production. Walk every primitive in the
 * design system here so a single page surfaces visual regressions.
 *
 * Phase 2.1 T01.
 */

export const metadata = { title: "Design system — EnduranceIQ (dev)" };

export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div className="mx-auto max-w-5xl px-5 py-12 md:px-12">
      <h1 className="font-sans text-[24px] font-bold tracking-tight">Design system</h1>
      <p className="mt-1 font-sans text-[13px] text-[var(--text-muted)]">
        Dev-only gallery. Walk every primitive so visual regressions show on
        one page.
      </p>

      <Section title="Activity rings (T01)">
        <div className="flex flex-wrap items-end gap-8">
          <ActivityRings
            rings={[
              { id: "easy", label: "Easy minutes", current: 180, target: 240 },
              { id: "volume", label: "Weekly volume", current: 42, target: 50, unit: "km" },
              { id: "strength", label: "Strength sessions", current: 1, target: 2 },
            ]}
          />
          <ActivityRings
            rings={[
              { id: "easy", label: "Easy minutes", current: 260, target: 240 },
              { id: "volume", label: "Weekly volume", current: 55, target: 50, unit: "km" },
              { id: "strength", label: "Strength sessions", current: 2, target: 2 },
            ]}
          />
        </div>
        <p className="mt-3 font-sans text-[12px] italic text-[var(--text-muted)]">
          Right ring set demonstrates `capAtTarget=true` (default): all
          three rings sit at one full circle even though current &gt; target.
        </p>
      </Section>

      <Section title="AI sparkle pill (T01)">
        <div className="flex flex-wrap items-center gap-3">
          <AISparkle />
          <AISparkle label="AI · Roast" />
          <AISparkle size="md" label="AI · Coach narrative" />
        </div>
        <p className="mt-3 font-sans text-[12px] italic text-[var(--text-muted)]">
          Pill attaches only to LLM-authored prose. Deterministic outputs
          (pace ranges, predicted finish, phase) MUST NOT carry it.
        </p>
      </Section>

      <Section title="Metric card (T01 refresh)">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <MetricCard
            label="Distance"
            value="42.0 km"
            delta="+4 km vs last week"
            status={{ label: "On plan", tone: "good" }}
          />
          <MetricCard
            label="Load ratio"
            value="1.09"
            status={{ label: "In range", tone: "good" }}
          />
          <MetricCard
            label="Easy %"
            value="78%"
            status={{ label: "Below target", tone: "warn" }}
          />
        </div>
      </Section>

      <Section title="Phase pill (T02 / F15)">
        <div className="flex flex-wrap items-center gap-2">
          <PhasePill phase="transition" />
          <PhasePill phase="general_prep" />
          <PhasePill phase="specific_prep" />
          <PhasePill phase="pre_competition" />
          <PhasePill phase="taper" />
          <PhasePill phase="race_week" />
          <PhasePill phase="recovery" />
        </div>
      </Section>

      <Section title="Confidence pill (F8)">
        <div className="flex flex-wrap items-center gap-2">
          <ConfidencePill level="high" />
          <ConfidencePill level="moderate" />
          <ConfidencePill level="low" />
          <ConfidencePill level="calibrating" />
        </div>
      </Section>

      <Section title="Session-type chips (F9)">
        <div className="flex flex-wrap items-center gap-2">
          <SessionTypeChip type="easy_run" />
          <SessionTypeChip type="long_run" />
          <SessionTypeChip type="tempo" />
          <SessionTypeChip type="interval" />
          <SessionTypeChip type="strides" />
          <SessionTypeChip type="strength" />
          <SessionTypeChip type="rest" />
        </div>
      </Section>

      <Section title="Surfaces — Glass / Hairline / Advisory">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <GlassCard>
            <p className="font-sans text-[14px]">
              Glass card — single hero element per view.
            </p>
          </GlassCard>
          <HairlineCard>
            <p className="font-sans text-[14px]">
              Hairline card — the default container after T01.
            </p>
          </HairlineCard>
          <HairlineCard emphasised>
            <p className="font-sans text-[14px]">
              Hairline emphasised — for interactive containers.
            </p>
          </HairlineCard>
        </div>
        <div className="mt-3 space-y-2">
          <AdvisoryBlock tone="accent">
            <p className="font-sans text-[14px]">Accent advisory (rationale, default).</p>
          </AdvisoryBlock>
          <AdvisoryBlock tone="warn">
            <p className="font-sans text-[14px]">Warn advisory.</p>
          </AdvisoryBlock>
          <AdvisoryBlock tone="bad">
            <p className="font-sans text-[14px]">Bad advisory (race-week lockdown, hard block).</p>
          </AdvisoryBlock>
        </div>
      </Section>

      <Section title="Evidence citation">
        <p className="font-sans text-[14px] text-[var(--text-secondary)]">
          Body sentence with a citation: <EvidenceCitation id="bosquet_2007" />{" "}
          establishes the taper window.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 border-t border-[var(--border)] pt-8">
      <h2 className="font-sans text-[16px] font-semibold text-[var(--text-primary)]">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
