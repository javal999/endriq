/**
 * <CoachReadOnlyReport> — F13 public surface.
 *
 * Mobile-first, print-friendly. Solid surfaces only (no glass — coaches
 * read this on phones during meetings; the visual budget is professional,
 * not editorial). 4 metric cards + intensity bar + 8-week trend.
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.6 F13; PHASE-2.0-UI-DESIGN.md §4.5.
 */

export interface CoachWeekRow {
  athlete_first_name: string;
  week_start: string;
  total_distance_meters: number | null;
  total_duration_seconds: number | null;
  pct_zone1_2: number | null;
  pct_zone3: number | null;
  pct_zone4_5: number | null;
  acute_load: number | null;
  chronic_load: number | null;
  load_ratio: number | null;
  llm_weekly_analysis: string | null;
}

export interface CoachReadOnlyReportProps {
  firstName: string;
  /** Rows ordered most-recent first (current week is rows[0]). */
  weeks: CoachWeekRow[];
}

function formatDuration(sec: number | null): string {
  if (sec == null) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec - h * 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatKm(meters: number | null): string {
  if (meters == null) return "—";
  return `${(meters / 1000).toFixed(1)} km`;
}

function pct(v: number | null): number {
  return v == null ? 0 : Math.max(0, Math.min(100, v * 100));
}

export function CoachReadOnlyReport({ firstName, weeks }: CoachReadOnlyReportProps) {
  const current = weeks[0];
  const trend = [...weeks].reverse(); // chronological for charts

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 md:px-8">
      <header className="mb-6">
        <p className="font-sans text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Coach view · read-only
        </p>
        <h1 className="mt-1 font-sans text-[22px] font-semibold tracking-tight text-[var(--text-primary)] [font-family:var(--font-display),Inter,sans-serif]">
          {firstName}&apos;s training
        </h1>
        <p className="mt-1 font-sans text-[13px] text-[var(--text-secondary)]">
          Week of <span className="font-mono">{current.week_start}</span>
        </p>
      </header>

      {/* 4 metric cards — 2x2 on mobile, 1x4 on desktop */}
      <section
        aria-labelledby="weekly-summary"
        className="grid grid-cols-2 gap-3 md:grid-cols-4"
      >
        <h2 id="weekly-summary" className="sr-only">
          Weekly summary
        </h2>
        <MetricCard label="Distance" value={formatKm(current.total_distance_meters)} />
        <MetricCard label="Time" value={formatDuration(current.total_duration_seconds)} />
        <MetricCard
          label="Load ratio"
          value={current.load_ratio != null ? current.load_ratio.toFixed(2) : "—"}
        />
        <MetricCard
          label="Chronic load"
          value={
            current.chronic_load != null
              ? current.chronic_load.toFixed(0)
              : "—"
          }
        />
      </section>

      {/* Intensity bar */}
      <section aria-labelledby="intensity-heading" className="mt-8">
        <h2
          id="intensity-heading"
          className="font-sans text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)]"
        >
          Intensity distribution
        </h2>
        <div
          className="mt-3 flex h-7 w-full overflow-hidden rounded-sm"
          role="img"
          aria-label={`Intensity: ${Math.round(pct(current.pct_zone1_2))}% easy, ${Math.round(pct(current.pct_zone3))}% moderate, ${Math.round(pct(current.pct_zone4_5))}% hard`}
        >
          <div
            style={{
              width: `${pct(current.pct_zone1_2)}%`,
              background: "var(--session-easy)",
            }}
            className="flex items-center justify-center font-mono text-[11px] text-[var(--text-primary)]"
          >
            {Math.round(pct(current.pct_zone1_2))}%
          </div>
          <div
            style={{
              width: `${pct(current.pct_zone3)}%`,
              background: "var(--session-moderate)",
            }}
            className="flex items-center justify-center font-mono text-[11px] text-[var(--text-primary)]"
          >
            {Math.round(pct(current.pct_zone3))}%
          </div>
          <div
            style={{
              width: `${pct(current.pct_zone4_5)}%`,
              background: "var(--session-hard)",
            }}
            className="flex items-center justify-center font-mono text-[11px] text-[var(--text-primary)]"
          >
            {Math.round(pct(current.pct_zone4_5))}%
          </div>
        </div>
        <div className="mt-2 flex justify-between font-sans text-[11px] text-[var(--text-muted)]">
          <span>Easy (Z1-2)</span>
          <span>Moderate (Z3)</span>
          <span>Hard (Z4-5)</span>
        </div>
      </section>

      {/* LLM weekly narrative (if present) */}
      {current.llm_weekly_analysis && (
        <section aria-labelledby="narrative-heading" className="mt-8">
          <h2
            id="narrative-heading"
            className="font-sans text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)]"
          >
            Coach&apos;s summary
          </h2>
          <p className="mt-3 whitespace-pre-line font-sans text-[14px] leading-[22px] text-[var(--text-secondary)]">
            {current.llm_weekly_analysis}
          </p>
        </section>
      )}

      {/* 8-week trend mini-table */}
      {trend.length > 1 && (
        <section aria-labelledby="trend-heading" className="mt-8">
          <h2
            id="trend-heading"
            className="font-sans text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)]"
          >
            8-week trend
          </h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse font-sans text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[var(--text-secondary)]">
                  <th className="py-2 pr-3 font-medium">Week</th>
                  <th className="py-2 pr-3 font-medium">Distance</th>
                  <th className="py-2 pr-3 font-medium">Load ratio</th>
                  <th className="py-2 font-medium">Easy %</th>
                </tr>
              </thead>
              <tbody>
                {trend.map((w) => (
                  <tr
                    key={w.week_start}
                    className="border-b border-[var(--border-hairline)] align-top"
                  >
                    <td className="py-2 pr-3 font-mono text-[var(--text-primary)]">
                      {w.week_start}
                    </td>
                    <td className="py-2 pr-3 font-mono text-[var(--text-primary)]">
                      {formatKm(w.total_distance_meters)}
                    </td>
                    <td className="py-2 pr-3 font-mono text-[var(--text-primary)]">
                      {w.load_ratio != null ? w.load_ratio.toFixed(2) : "—"}
                    </td>
                    <td className="py-2 font-mono text-[var(--text-primary)]">
                      {Math.round(pct(w.pct_zone1_2))}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <footer className="mt-12 border-t border-[var(--border)] pt-4 print:hidden">
        <p className="font-sans text-[11px] text-[var(--text-muted)]">
          Shared via EnduranceIQ · This link may expire or be revoked at any time.
        </p>
      </footer>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[var(--surface-raised)] p-3">
      <p className="font-sans text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 font-mono text-[18px] font-medium text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}
