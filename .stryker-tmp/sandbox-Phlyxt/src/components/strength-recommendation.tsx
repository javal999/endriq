// @ts-nocheck
import Link from "next/link";
import { CITATIONS } from "@/lib/data/citations";
import type { StrengthMenuModel } from "@/lib/analytics/strength-generator";
import { WEEKDAY_NAMES_MON0 } from "@/lib/analytics/strength-generator";

const PATTERN_LABELS: Record<string, string> = {
  interference_safe: "Recovery mobility",
  taper_or_high_load: "Maintenance",
  low_cadence_intervals: "Plyometric + single-leg economy",
  long_run_drift: "Posterior chain + core",
  low_easy_load_share: "Single-leg economy",
  default: "General lower-body strength",
};

export function StrengthRecommendation({
  recommendation,
  raceDateMissing,
}: {
  recommendation: StrengthMenuModel;
  raceDateMissing?: boolean;
}) {
  const { pattern, days, rationale, schedulingSummary, citations } = recommendation;
  const patternLabel = PATTERN_LABELS[pattern] ?? pattern;

  return (
    <section className="mt-14" aria-labelledby="strength-rec-heading">
      <div className="mb-4 flex items-start gap-3">
        <h2
          id="strength-rec-heading"
          className="font-sans text-[15px] font-semibold"
        >
          Strength recommendation
        </h2>
        <span className="mt-0.5 shrink-0 rounded border border-[rgba(184,122,10,0.25)] bg-[rgba(184,122,10,0.07)] px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wide text-[rgba(160,100,0,0.85)]">
          Experimental
        </span>
      </div>
      <div className="rounded border border-[var(--border)] border-l-[3px] border-l-[var(--accent)] bg-[var(--surface)] p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[rgba(46,125,91,0.12)] px-2.5 py-0.5 font-sans text-[11px] font-semibold uppercase tracking-wide text-[var(--accent)]">
            This week&apos;s focus
          </span>
          <span className="font-sans text-[14px] font-medium text-[var(--text-primary)]">
            {patternLabel}
          </span>
        </div>

        <p className="mt-4 font-sans text-[14px] leading-relaxed text-[var(--text-secondary)]">
          {schedulingSummary}
        </p>

        {days.map((day, dayIdx) => (
          <div key={dayIdx} className="mt-6">
            {days.length > 1 && (
              <p className="mb-2 font-sans text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Day {dayIdx + 1} — {WEEKDAY_NAMES_MON0[day.weekday]} · ~{day.duration_min} min
              </p>
            )}
            {days.length === 1 && (
              <p className="mb-2 font-sans text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                {WEEKDAY_NAMES_MON0[day.weekday]} · ~{day.duration_min} min
              </p>
            )}
            <div className="overflow-x-auto rounded border border-[var(--border)] bg-[var(--surface)]">
              <table className="w-full min-w-[480px] border-collapse text-left text-[14px]">
                <thead>
                  <tr className="border-b border-[var(--border)] font-sans text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                    <th scope="col" className="px-4 py-2">Exercise</th>
                    <th scope="col" className="px-4 py-2">Sets × reps</th>
                    <th scope="col" className="px-4 py-2">Rest</th>
                    <th scope="col" className="px-4 py-2">RPE</th>
                  </tr>
                </thead>
                <tbody className="text-[var(--text-secondary)]">
                  {day.exercises.map((ex) => (
                    <tr
                      key={ex.id}
                      className="border-b border-[var(--border)] last:border-b-0"
                    >
                      <td className="px-4 py-2.5 font-medium text-[var(--text-primary)]">
                        {ex.name}
                        <Link
                          href={ex.demo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 whitespace-nowrap font-normal text-[12px] text-[var(--accent)] underline underline-offset-2"
                        >
                          demo
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">{ex.sets_reps}</td>
                      <td className="px-4 py-2.5">
                        {ex.rest_seconds >= 60
                          ? `${ex.rest_seconds / 60} min`
                          : `${ex.rest_seconds}s`}
                      </td>
                      <td className="px-4 py-2.5">{ex.rpe_target}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        <div className="mt-6 space-y-3 font-sans text-[14px] leading-relaxed text-[var(--text-secondary)]">
          <p>
            <span className="font-semibold text-[var(--text-primary)]">
              Why these exercises:{" "}
            </span>
            {rationale}{" "}
            {citations.length > 0 && (
              <>
                Evidence:{" "}
                {citations.map((c, i) => (
                  <span key={c.href}>
                    {i > 0 ? "; " : null}
                    <Link
                      href={c.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="italic text-[var(--accent)] underline underline-offset-2"
                    >
                      {c.label}
                    </Link>
                  </span>
                ))}
                .
              </>
            )}
          </p>
          <p className="text-[13px] text-[var(--text-muted)]">
            Not sure about form? Use the compact demo links beside each exercise:
            they run a YouTube search so you can compare cues across coaches.
          </p>
          {raceDateMissing && (
            <p className="text-[13px] text-[var(--text-muted)]">
              Add your race date in{" "}
              <Link href="/settings#profile" className="text-[var(--accent)] underline underline-offset-2">
                Settings
              </Link>{" "}
              to enable taper-specific recommendations.
            </p>
          )}
        </div>

        <p className="mt-6 border-t border-[var(--border)] pt-4 font-sans text-[12px] leading-relaxed text-[var(--text-muted)]">
          This is general fitness information, not medical advice. Strength
          recommendations are evidence-informed but have not yet been reviewed
          by a qualified S&amp;C coach.{" "}
          <Link href="/learn#strength-methodology" className="text-[var(--accent)] underline underline-offset-2">
            See the research →
          </Link>
        </p>
      </div>
    </section>
  );
}
