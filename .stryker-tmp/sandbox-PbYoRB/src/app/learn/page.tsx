// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import { CitationLink } from "@/components/citation-link";

export const metadata: Metadata = {
  title: "Learn — EnduranceIQ methodology",
  description:
    "Methods behind intensity zones, training load, interference cues, and session classification—with peer-reviewed sources.",
};

const toc = [
  { href: "#methodology", label: "Overview & narratives" },
  { href: "#intensity-distribution", label: "Intensity distribution" },
  { href: "#training-load-acwr", label: "Training load (acute/chronic)" },
  { href: "#intensity-measurement", label: "Why we measure both time and load" },
  { href: "#heart-rate-zones", label: "Heart rate zones" },
  { href: "#concurrent-training", label: "Concurrent training" },
  { href: "#strength-for-runners", label: "Strength for runners" },
  { href: "#strength-methodology", label: "Strength: methodology + research" },
  { href: "#session-classification", label: "Session classification" },
];

import type { CitationId } from "@/lib/data/citations";

function RefItem({ children }: { children: import("react").ReactNode }) {
  return <li className="mt-1">{children}</li>;
}

function StrengthPattern({
  pattern,
  emphasis,
  why,
  evidence,
  citationId,
  secondaryCitationId,
}: {
  pattern: string;
  emphasis: string;
  why: string;
  evidence: string;
  citationId: CitationId;
  secondaryCitationId?: CitationId;
}) {
  return (
    <div className="rounded border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="font-sans text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Pattern</p>
      <p className="mt-1 font-sans text-[14px] font-medium text-[var(--text-primary)]" dangerouslySetInnerHTML={{ __html: pattern }} />
      <p className="mt-3 font-sans text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Emphasis</p>
      <p className="mt-1 font-sans text-[14px] text-[var(--text-secondary)]">{emphasis}</p>
      <p className="mt-3 font-sans text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Why</p>
      <p className="mt-1 font-sans text-[14px] leading-relaxed text-[var(--text-secondary)]">{why}</p>
      <p className="mt-3 font-sans text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Evidence</p>
      <p className="mt-1 font-sans text-[14px] leading-relaxed text-[var(--text-secondary)]">
        {evidence}{" "}
        <CitationLink id={citationId} />
        {secondaryCitationId && (
          <>
            {"; "}
            <CitationLink id={secondaryCitationId} />
          </>
        )}
      </p>
    </div>
  );
}

export default function LearnPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-20 pt-10 md:px-12 md:pt-14">
      <p className="font-sans text-[11px] font-medium tracking-[0.08em] text-[var(--text-muted)] [font-variant:small-caps]">
        EnduranceIQ
      </p>
      <h1 className="mt-2 font-sans text-[26px] font-bold tracking-tight">
        How EnduranceIQ works
      </h1>
      <p className="mt-4 font-sans text-[15px] leading-relaxed text-[var(--text-secondary)]">
        A reference guide to the methods embedded in your weekly report—structured metrics first,
        evidence-linked findings second. Nothing here substitutes clinical assessment or coach-written programming.
      </p>

      <nav
        aria-label="On this page"
        className="mt-10 rounded border border-[var(--border)] bg-[var(--surface)] p-5 font-sans text-[14px]"
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          On this page
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {toc.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="text-[var(--accent)] hover:underline">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section id="methodology" className="mt-14 scroll-mt-24 border-t border-[var(--border)] pt-12">
        <h2 className="font-sans text-[17px] font-semibold">Overview & narrative summaries</h2>
        <p className="mt-3 font-sans text-[15px] leading-relaxed text-[var(--text-secondary)]">
          The weekly surface merges deterministic rule-engine findings with optional Claude Haiku prose generated{" "}
          <strong className="font-medium text-[var(--text-primary)]">only on the server</strong> from numeric aggregates:
          HR summaries by workout, intensity percentages, load indices, and rules-output snippets—never free-form athlete notes or Strava titles.
          Outputs pass validator gates before persistence so blocked prose falls back to template paragraphs grounded in the same findings JSON.
        </p>
      </section>

      <section id="intensity-distribution" className="mt-14 scroll-mt-24 border-t border-[var(--border)] pt-12">
        <h2 className="font-sans text-[17px] font-semibold">Intensity distribution</h2>
        <p className="mt-3 font-sans text-[15px] leading-relaxed text-[var(--text-secondary)]">
          Each timed running interval contributes classified HR buckets grouped into easy (zones 1–2), moderate (zone 3),
          and hard (zones 4–5) using athlete-relative thresholds anchored on observed max HR or configured ceilings from onboarding data.
          Benchmark heuristic aligns loosely with polarised prescriptions—a directional compass rather than laboratory-derived physiology labels.
        </p>
        <ul className="mt-4 list-none font-sans text-[14px] text-[var(--text-secondary)]">
          <RefItem><CitationLink id="seiler_2010" /></RefItem>
          <RefItem><CitationLink id="stoggl_sperlich_2014" /></RefItem>
        </ul>
      </section>

      <section id="training-load-acwr" className="mt-14 scroll-mt-24 border-t border-[var(--border)] pt-12">
        <h2 className="font-sans text-[17px] font-semibold">Training load (acute vs chronic)</h2>
        <p className="mt-3 font-sans text-[15px] leading-relaxed text-[var(--text-secondary)]">
          Acute stress aggregates roughly trailing-seven-day totals versus chronic rolling averages derived from synced endurance workloads with measurable strain proxies (runs contributing HR-derived strain estimates).
          Elevated ratios flag spikes needing pacing restraint relative to historical norms—not Garmin readiness scores.
        </p>
        <ul className="mt-4 list-none font-sans text-[14px] text-[var(--text-secondary)]">
          <RefItem><CitationLink id="gabbett_2016" /></RefItem>
          <RefItem><CitationLink id="windt_2017" /></RefItem>
        </ul>
      </section>

      <section id="intensity-measurement" className="mt-14 scroll-mt-24 border-t border-[var(--border)] pt-12">
        <h2 className="font-sans text-[17px] font-semibold">Why we measure both time and load</h2>
        <p className="mt-3 font-sans text-[15px] leading-relaxed text-[var(--text-secondary)]">
          Time-in-zone and TRIMP-weighted load share tell different stories. Two athletes can both spend 80% of
          their running time in Zone 1–2, yet if one athlete&apos;s hard sessions are much harder, their
          load share from Zone 4–5 will be significantly higher than their time share suggests. Looking at
          both metrics together catches this hidden polarization gap.
        </p>
        <p className="mt-4 font-sans text-[15px] leading-relaxed text-[var(--text-secondary)]">
          EnduranceIQ computes training impulse (TRIMP) per session using the Banister formula — either
          the full Karvonen heart-rate-reserve version when resting HR is provided, or an HR-max-only
          approximation otherwise. The sex-specific exponential weighting (Banister 1991) reflects
          physiological differences in cardiovascular response to exercise intensity.
          Sessions are bucketed using r-value thresholds: easy (r &lt; 0.74), moderate (0.74–0.84),
          hard (≥ 0.84).
        </p>
        <p className="mt-4 font-sans text-[13px] italic text-[var(--text-muted)]">
          These load-share metrics are currently computed in the background (shadow mode). They will
          replace the time-based display after threshold tuning in Phase 1.4.
        </p>
        <ul className="mt-4 list-none font-sans text-[14px] text-[var(--text-secondary)]">
          <RefItem><CitationLink id="banister_1991" /></RefItem>
          <RefItem><CitationLink id="seiler_kjerland_2006" /></RefItem>
          <RefItem><CitationLink id="treff_2019" /></RefItem>
          <RefItem><CitationLink id="stoggl_sperlich_2014" /></RefItem>
          <RefItem><CitationLink id="casado_2022" /></RefItem>
        </ul>
      </section>

      <section id="heart-rate-zones" className="mt-14 scroll-mt-24 border-t border-[var(--border)] pt-12">
        <h2 className="font-sans text-[17px] font-semibold">Heart rate zones</h2>
        <p className="mt-3 font-sans text-[15px] leading-relaxed text-[var(--text-secondary)]">
          Zones approximate Daniels-style proportional anchors scaled against empirical maximum HR captured across uploads plus validated onboarding overrides where athletes capture lactate-threshold estimates elsewhere.
          Field zones tolerate noisy telemetry—prefer drift-aware pacing cues paired with perceived exertion rather than rigid BPM policing alone.
        </p>
        <p className="mt-4 font-sans text-[13px] italic text-[var(--text-muted)]">
          Canonical physiological thresholds demand metabolic lab testing; EnduranceIQ flags deviations versus heuristic envelopes rather than diagnosing physiology.
        </p>
      </section>

      <section id="concurrent-training" className="mt-14 scroll-mt-24 border-t border-[var(--border)] pt-12">
        <h2 className="font-sans text-[17px] font-semibold">Concurrent training & interference windows</h2>
        <p className="mt-3 font-sans text-[15px] leading-relaxed text-[var(--text-secondary)]">
          Heavy neuromuscular sessions overlapping endurance stimuli inside acute physiological recovery arcs elevate cumulative fatigue risk;
          EnduranceIQ highlights narrowly spaced resistance-plus-interval stacking scenarios surfaced via deterministic timestamps rather than subjective readiness guesses.
        </p>
        <ul className="mt-4 list-none font-sans text-[14px] text-[var(--text-secondary)]">
          <RefItem><CitationLink id="fyfe_2014" /></RefItem>
          <RefItem><CitationLink id="wilson_2012" /></RefItem>
        </ul>
      </section>

      <section id="strength-for-runners" className="mt-14 scroll-mt-24 border-t border-[var(--border)] pt-12">
        <h2 className="font-sans text-[17px] font-semibold">Strength for runners</h2>
        <p className="mt-3 font-sans text-[15px] leading-relaxed text-[var(--text-secondary)]">
          Programmable lifting prescriptions referencing plyometrics, heavy compounds, and injury-prevention circuits arrive alongside roadmap integrations tying biomechanical weaknesses to prescription tweaks—planned downstream phases populate richer workout widgets referencing citations similar to running insights below.
        </p>
        <ul className="mt-4 list-none font-sans text-[14px] text-[var(--text-secondary)]">
          <RefItem><CitationLink id="blagrove_2018" /></RefItem>
          <RefItem><CitationLink id="beattie_2017" /></RefItem>
        </ul>
      </section>

      <section id="strength-methodology" className="mt-14 scroll-mt-24 border-t border-[var(--border)] pt-12">
        <h2 className="font-sans text-[17px] font-semibold">Strength recommendations: methodology and research</h2>
        <p className="mt-3 font-sans text-[15px] leading-relaxed text-[var(--text-secondary)]">
          Each running pattern maps to a specific strength emphasis. The table below documents every pattern,
          its prescribed emphasis, the training rationale, and the supporting research. This section is intended
          for coach review before the feature goes wide.
        </p>

        <div className="mt-6 space-y-8">
          <StrengthPattern
            pattern="Low easy-zone load share (&lt;60% TRIMP in Z1–2)"
            emphasis="Single-leg economy + posterior chain"
            why="Better running economy makes Zone 2 pace easier to sustain at lower HR, gradually shifting load share toward easy zones without dropping volume."
            evidence="2–4% running economy improvement after 8 weeks of heavy/explosive strength."
            citationId="beattie_2017"
            secondaryCitationId="blagrove_2018"
          />
          <StrengthPattern
            pattern="Low cadence on intervals (&lt;168 spm)"
            emphasis="Plyometric + single-leg economy"
            why="Ground-contact time determines cadence ceiling. Plyometric training shortens ground contact and improves the stretch-shortening cycle."
            evidence="Plyometric training improves running economy and ground contact mechanics."
            citationId="saunders_2006"
          />
          <StrengthPattern
            pattern="Long run HR drift (final third vs first third)"
            emphasis="Posterior chain + core stability"
            why="Late-race HR drift with pace decline indicates fatigue in the posterior chain and trunk stabilisers — key muscles for maintaining form when tired."
            evidence="Posterior chain strength reduces hamstring injury risk and maintains running mechanics under fatigue."
            citationId="bourne_2017"
            secondaryCitationId="blagrove_2018"
          />
          <StrengthPattern
            pattern="Interference window (High severity)"
            emphasis="Mobility only"
            why="A high-severity interference finding means strength work preceded a quality run within the acute neuromuscular recovery window. Adding more load would compound the problem."
            evidence="Strength performed before quality running reduces neuromuscular quality of the run."
            citationId="fyfe_2014"
            secondaryCitationId="wilson_2012"
          />
          <StrengthPattern
            pattern="Taper or high load ratio (&gt;1.3)"
            emphasis="Maintenance (25–30 min)"
            why="During a taper or elevated-load week, the goal is to maintain neuromuscular readiness without adding new fatigue. A short maintenance block achieves this."
            evidence="Taper strategies that maintain stimulus while reducing volume preserve or improve performance."
            citationId="mujika_2010"
          />
          <StrengthPattern
            pattern="Default (no specific pattern detected)"
            emphasis="Single-leg economy + posterior chain + core stability"
            why="In a normal training week with no detected running weaknesses, a well-rounded lower-body session addresses the most common injury-risk areas for runners."
            evidence="Strength training reduces running injury rates and improves economy in recreational marathon runners."
            citationId="beattie_2017"
            secondaryCitationId="blagrove_2018"
          />
        </div>
      </section>

      <section id="session-classification" className="mt-14 scroll-mt-24 border-t border-[var(--border)] pt-12">
        <h2 className="font-sans text-[17px] font-semibold">Session classification</h2>
        <p className="mt-3 font-sans text-[15px] leading-relaxed text-[var(--text-secondary)]">
          Strava-derived session taxonomy mixes importer-normalised labels (`easy_run`, `long_run`, `interval`, …) with sport modality inference plus HR-relative adherence badges summarising drift versus endurance envelopes described earlier—classification informs downstream UX colouring rather than autonomous scheduling prescriptions yet.
        </p>
      </section>

      <p className="mt-14 border-t border-[var(--border)] pt-10 font-sans text-[14px]">
        <Link href="/" className="text-[var(--accent)] underline">
          ← Home
        </Link>
      </p>
    </div>
  );
}
