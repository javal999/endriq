import Link from "next/link";
import type { Exercise } from "@/lib/data/exercise-library";
import type { StrengthRecommendationModel } from "@/lib/analytics/strength-generator";

function uniqueExerciseCitations(exercises: Exercise[]): {
  label: string;
  href: string;
}[] {
  const seen = new Set<string>();
  const out: { label: string; href: string }[] = [];
  for (const e of exercises) {
    if (!e.evidenceDoi?.trim()) continue;
    const doi = e.evidenceDoi.trim();
    if (seen.has(doi)) continue;
    seen.add(doi);
    out.push({
      label: e.evidenceLabel ?? doi,
      href: `https://doi.org/${doi}`,
    });
  }
  return out;
}

export function StrengthRecommendation({
  recommendation,
}: {
  recommendation: StrengthRecommendationModel;
}) {
  const { template, schedulingSummary, whySession, schedulingReason } =
    recommendation;
  const citations = uniqueExerciseCitations(template.exercises);

  return (
    <section className="mt-14" aria-labelledby="strength-rec-heading">
      <h2
        id="strength-rec-heading"
        className="mb-4 font-sans text-[15px] font-semibold"
      >
        Strength recommendation
      </h2>
      <div
        className="rounded border border-[var(--border)] border-l-[3px] border-l-[var(--accent)] bg-[var(--surface)] p-6 md:p-8"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[rgba(46,125,91,0.12)] px-2.5 py-0.5 font-sans text-[11px] font-semibold uppercase tracking-wide text-[var(--accent)]">
            This week
          </span>
        </div>
        <h3 className="mt-3 font-sans text-[17px] font-semibold tracking-tight text-[var(--text-primary)]">
          Session {template.id} — {template.name}
        </h3>
        <p className="mt-1 font-sans text-[13px] text-[var(--text-muted)]">
          {template.duration}
        </p>

        <p className="mt-5 font-sans text-[14px] leading-relaxed text-[var(--text-secondary)]">
          {schedulingSummary}
        </p>

        <div className="mt-6 overflow-x-auto rounded border border-[var(--border)] bg-[var(--surface)]">
          <table className="w-full min-w-[480px] border-collapse text-left text-[14px]">
            <thead>
              <tr className="border-b border-[var(--border)] font-sans text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                <th scope="col" className="px-4 py-2">
                  Exercise
                </th>
                <th scope="col" className="px-4 py-2">
                  Sets × reps
                </th>
                <th scope="col" className="px-4 py-2">
                  Rest
                </th>
                <th scope="col" className="px-4 py-2">
                  RPE
                </th>
              </tr>
            </thead>
            <tbody className="text-[var(--text-secondary)]">
              {template.exercises.map((row) => (
                <tr
                  key={row.name}
                  className="border-b border-[var(--border)] last:border-b-0"
                >
                  <td className="px-4 py-2.5 font-medium text-[var(--text-primary)]">
                    {row.name}
                    <Link
                      href={row.demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 whitespace-nowrap font-normal text-[12px] text-[var(--accent)] underline underline-offset-2"
                    >
                      demo
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">{row.sets}</td>
                  <td className="px-4 py-2.5">{row.rest}</td>
                  <td className="px-4 py-2.5">{row.rpe}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 space-y-3 font-sans text-[14px] leading-relaxed text-[var(--text-secondary)]">
          <p>
            <span className="font-semibold text-[var(--text-primary)]">
              Why these exercises:{" "}
            </span>
            {whySession}{" "}
            {citations.length > 0 ? (
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
            ) : null}
          </p>
          <p className="text-[13px] text-[var(--text-muted)]">
            Not sure about form? Use the compact demo links beside each exercise:
            they run a YouTube search so you can compare cues across coaches.
          </p>
          <p className="text-[13px] text-[var(--text-muted)]">{schedulingReason}</p>
        </div>

        <p className="mt-6 border-t border-[var(--border)] pt-4 font-sans text-[12px] leading-relaxed text-[var(--text-muted)]">
          This is general fitness information, not medical advice.
        </p>
      </div>
    </section>
  );
}
