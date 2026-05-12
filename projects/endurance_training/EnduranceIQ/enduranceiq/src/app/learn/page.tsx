import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learn — EnduranceIQ methodology",
  description:
    "Methods behind intensity zones, training load, interference cues, and session classification—with peer-reviewed sources.",
};

const toc = [
  { href: "#methodology", label: "Overview & narratives" },
  { href: "#intensity-distribution", label: "Intensity distribution" },
  { href: "#training-load-acwr", label: "Training load (acute/chronic)" },
  { href: "#heart-rate-zones", label: "Heart rate zones" },
  { href: "#concurrent-training", label: "Concurrent training" },
  { href: "#strength-for-runners", label: "Strength for runners" },
  { href: "#session-classification", label: "Session classification" },
];

function Ref({
  label,
  doi,
}: {
  label: string;
  doi: string;
}) {
  return (
    <li className="mt-1">
      <a
        href={`https://doi.org/${doi}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--accent)] underline underline-offset-2"
      >
        {label}
      </a>
    </li>
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
          <Ref label="Seiler (2010)" doi="10.2165/11530080-000000000-00000" />
          <Ref label="Stöggl & Sperlich (2014)" doi="10.3389/fphys.2014.00033" />
        </ul>
      </section>

      <section id="training-load-acwr" className="mt-14 scroll-mt-24 border-t border-[var(--border)] pt-12">
        <h2 className="font-sans text-[17px] font-semibold">Training load (acute vs chronic)</h2>
        <p className="mt-3 font-sans text-[15px] leading-relaxed text-[var(--text-secondary)]">
          Acute stress aggregates roughly trailing-seven-day totals versus chronic rolling averages derived from synced endurance workloads with measurable strain proxies (runs contributing HR-derived strain estimates).
          Elevated ratios flag spikes needing pacing restraint relative to historical norms—not Garmin readiness scores.
        </p>
        <ul className="mt-4 list-none font-sans text-[14px] text-[var(--text-secondary)]">
          <Ref label="Gabbett (2016)" doi="10.1136/bjsports-2015-095878" />
          <Ref label="Windt et al. (2017)" doi="10.1136/bjsports-2016-097269" />
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
          <Ref label="Fyfe et al. (2014)" doi="10.1007/s40279-013-0131-5" />
          <Ref label="Wilson et al. (2012)" doi="10.1519/JSC.0b013e3182429f27" />
        </ul>
      </section>

      <section id="strength-for-runners" className="mt-14 scroll-mt-24 border-t border-[var(--border)] pt-12">
        <h2 className="font-sans text-[17px] font-semibold">Strength for runners</h2>
        <p className="mt-3 font-sans text-[15px] leading-relaxed text-[var(--text-secondary)]">
          Programmable lifting prescriptions referencing plyometrics, heavy compounds, and injury-prevention circuits arrive alongside roadmap integrations tying biomechanical weaknesses to prescription tweaks—planned downstream phases populate richer workout widgets referencing citations similar to running insights below.
        </p>
        <ul className="mt-4 list-none font-sans text-[14px] text-[var(--text-secondary)]">
          <Ref label="Blagrove et al. (2018)" doi="10.3389/fphys.2018.00971" />
          <Ref label="Beattie et al. (2017)" doi="10.1519/JSC.0000000000001949" />
        </ul>
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
