// @ts-nocheck
import Link from "next/link";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { LlmFeedbackButtons } from "@/components/llm-feedback-buttons";
import { ProfileCompletenessBanner } from "@/components/profile-completeness-banner";
import { TrendSparklines } from "@/components/trend-sparklines";
import { ShareWeeklyButton } from "@/components/share-weekly-button";
import { SessionsTableWithHints } from "@/components/sessions-table-with-hints";
import { StrengthRecommendation } from "@/components/strength-recommendation";
import { WeekNavLinks } from "@/components/week-nav-links";
import { WeeklyAnalysisCard } from "@/components/weekly-analysis-card";
import type { WeeklyReportModel } from "@/lib/report/model";
import { methodologyHrefForFinding } from "@/lib/report/methodologyLink";

function IntensityExplanationParagraph({ text }: { text: string }) {
  const dot = text.indexOf(". ");
  const rich =
    dot > 12 ? (
      <>
        <span className="font-[family-name:var(--font-instrument)] italic">
          {text.slice(0, dot + 1)}
        </span>{" "}
        {text.slice(dot + 2)}
      </>
    ) : (
      text
    );
  return (
    <p className="mt-4 font-sans text-[14px] leading-relaxed text-[var(--text-secondary)]">
      {rich}
    </p>
  );
}

export async function WeeklyReportView({
  model,
  athleteId,
  weekStart,
}: {
  model: WeeklyReportModel;
  athleteId: string;
  weekStart: string;
}) {
  const t = await getTranslations("report");

  const intensityBadge =
    model.intensity.verdict === "good"
      ? { text: t("intensity.verdict.good"), className: "bg-[rgba(46,125,91,0.08)] text-[var(--status-good)]" }
      : model.intensity.verdict === "warn"
        ? {
            text: t("intensity.verdict.warn"),
            className: "bg-[rgba(184,122,10,0.08)] text-[var(--status-warn)]",
          }
        : {
            text:
              model.intensity.pctEasy < 30 && model.intensity.pctHard > 50
                ? t("intensity.verdict.missingEasy")
                : t("intensity.verdict.bad"),
            className: "bg-[rgba(196,75,63,0.06)] text-[var(--status-bad)]",
          };

  const loadValueColor =
    model.summary.loadTone === "bad"
      ? "text-[var(--status-bad)]"
      : model.summary.loadTone === "warn"
        ? "text-[var(--status-warn)]"
        : "text-[var(--status-good)]";

  const intensityCopy =
    model.llm?.intensityExplanation ??
    `Zones estimated from observed max HR of ${model.intensity.observedMaxHr} bpm. A lactate threshold test would provide more accurate zones.`;

  const sessionHints = model.llm?.sessionExplanations ?? {};
  const sessionStructured = model.llm?.sessionStructured ?? {};

  return (
    <div className="mx-auto max-w-5xl px-5 pb-16 pt-10 md:px-12 md:pt-12">
      {athleteId !== "demo" && (model.missingProfileFields?.length ?? 0) > 0 && (
        <div className="mb-6">
          <ProfileCompletenessBanner missingFields={model.missingProfileFields!} />
        </div>
      )}
      {model.emptyWeek ? (
        <p className="mb-6 rounded border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-secondary)]">
          {t("empty")}{" "}
          <Link href="/settings" className="text-[var(--accent)] underline">
            Connect Strava and sync
          </Link>{" "}
          to populate sessions.
        </p>
      ) : null}

      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="font-sans text-[22px] font-bold tracking-tight">
            {t("title")}
          </h1>
          <p className="font-sans text-[13px] font-medium text-[var(--text-muted)]">
            {model.weekRangeLabel}
          </p>
        </div>
        {athleteId !== "demo" ? (
          <WeekNavLinks athleteId={athleteId} weekStart={weekStart} />
        ) : (
          <p className="font-sans text-[12px] text-[var(--text-muted)]">
            {t("demo")}
          </p>
        )}
      </header>

      <section
        className="mt-4 flex flex-wrap gap-y-4 border-b border-[var(--border)] pb-6"
        aria-label="Weekly summary"
      >
        <SummaryItem
          label="Distance"
          value={
            model.summary.distanceKm === "—" ? (
              "—"
            ) : (
              <span>
                {model.summary.distanceKm}{" "}
                <span className="font-mono text-[15px] font-medium">km</span>
              </span>
            )
          }
          meta={model.summary.distanceMeta}
        />
        <SummaryItem
          label="Sessions"
          value={String(model.summary.sessions)}
          meta={model.summary.sessionsMeta}
        />
        <SummaryItem
          label="Total time"
          value={model.summary.totalTimeLabel}
          meta={model.summary.totalTimeMeta}
        />
        <SummaryItem
          label="Training load"
          value={
            <span className="flex items-baseline gap-2">
              <span
                className={`font-sans text-[15px] font-semibold ${loadValueColor}`}
              >
                {model.summary.loadWord}
              </span>
              {model.summary.loadRatio ? (
                <span className="font-mono text-[13px] text-[var(--text-muted)]">
                  {model.summary.loadRatio}
                </span>
              ) : null}
            </span>
          }
          meta={model.summary.loadMeta}
        />
      </section>

      {model.trend && (
        <TrendSparklines trend={model.trend} currentWeekStart={weekStart} />
      )}

      <WeeklyAnalysisCard model={model} hrRestMissing={model.hrRestMissing} />
      {model.llm?.weeklyNarrativeFromApi && (
        <LlmFeedbackButtons weekStart={weekStart} promptType="weekly_analysis" />
      )}

      <section className="mt-12" aria-labelledby="intensity-heading">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 id="intensity-heading" className="font-sans text-[15px] font-semibold">
              {t("intensity.title")}
            </h2>
            <p className="mt-0.5 font-sans text-[12px] text-[var(--text-muted)]">
              {t("intensity.subtitle")}
            </p>
          </div>
          <span
            className={`shrink-0 rounded px-2 py-1 font-sans text-[13px] font-medium ${intensityBadge.className}`}
          >
            {intensityBadge.text}
          </span>
        </div>

        <div className="rounded-[20px] border border-[rgba(213,216,224,0.45)] bg-[rgba(250,251,253,0.68)] p-8 shadow-[0_20px_40px_-16px_rgba(16,19,26,0.14)] backdrop-blur-xl backdrop-saturate-180">
          {(() => {
            const maxHr = model.intensity.observedMaxHr;
            const easyTop = Math.round(maxHr * 0.75);
            const modTop = Math.round(maxHr * 0.85);
            return (
              <>
                <ZoneRow
                  label="Zone 1–2"
                  sub={`Easy · <${easyTop} bpm`}
                  pct={model.intensity.pctEasy}
                  fillClass="bg-[var(--accent)]"
                  targetLeftPct={80}
                  targetLabel="target 80%"
                />
                <ZoneRow
                  label="Zone 3"
                  sub={`Moderate · ${easyTop}–${modTop} bpm`}
                  pct={model.intensity.pctMod}
                  fillClass="bg-[var(--status-warn)]"
                  targetLeftPct={10}
                  targetLabel="~10%"
                />
                <ZoneRow
                  label="Zone 4–5"
                  sub={`Hard · >${modTop} bpm`}
                  pct={model.intensity.pctHard}
                  fillClass="bg-[var(--status-bad)] opacity-[0.85]"
                  targetLeftPct={10}
                  targetLabel="~10%"
                />
              </>
            );
          })()}
          <ul className="mt-5 flex flex-wrap gap-6 border-t border-[rgba(213,216,224,0.3)] pt-4 text-[11px] text-[var(--text-muted)]">
            <li className="flex items-center gap-2 font-sans">
              <span className="size-2 rounded-sm bg-[var(--accent)]" aria-hidden />{" "}
              Easy (target 80%)
            </li>
            <li className="flex items-center gap-2 font-sans">
              <span className="size-2 rounded-sm bg-[var(--status-warn)]" aria-hidden />{" "}
              Moderate (target ~10%)
            </li>
            <li className="flex items-center gap-2 font-sans">
              <span className="size-2 rounded-sm bg-[var(--status-bad)] opacity-[0.85]" aria-hidden />{" "}
              Hard (target ~10%)
            </li>
          </ul>
          <p className="mt-3 font-sans text-[11px] text-[var(--text-muted)]">
            Zones based on your observed max HR of {model.intensity.observedMaxHr} bpm using the 75/85% threshold method.{" "}
            <a href="/learn#heart-rate-zones" className="text-[var(--accent)] underline underline-offset-2">
              {t("intensity.zoneMethod")}
            </a>
          </p>
          {model.sessions.some(
            (s) => s.typeLabel === "Intervals" || s.typeLabel === "Tempo",
          ) && (
            <p className="mt-4 rounded border border-[rgba(184,122,10,0.2)] bg-[rgba(184,122,10,0.05)] px-3 py-2 font-sans text-[12px] leading-relaxed text-[var(--text-muted)]">
              <strong className="font-medium text-[var(--text-secondary)]">Estimation note:</strong>{" "}
              Zones are assigned from each session&apos;s <em>average</em> HR — not a lap-by-lap breakdown.
              Interval and tempo sessions average high, so warmup and cooldown time
              (which was likely easy) gets counted as hard. A week with only interval sessions
              will almost always show skewed hard-zone time here.
            </p>
          )}
        </div>
        <IntensityExplanationParagraph text={intensityCopy} />
      </section>

      <section className="mt-12" aria-labelledby="sessions-heading">
        <div className="mb-4">
          <h2 id="sessions-heading" className="font-sans text-[15px] font-semibold">
            {t("sessions.title")}
          </h2>
          <p className="mt-0.5 font-sans text-[12px] text-[var(--text-muted)]">
            {t("sessions.subtitle")}
          </p>
        </div>
        <SessionsTableWithHints sessions={model.sessions} />
      </section>

      <section className="mt-14" aria-labelledby="findings-heading">
        <h2 id="findings-heading" className="mb-4 font-sans text-[15px] font-semibold">
          {t("findings.title")}
        </h2>
        {model.findings.length === 0 ? (
          <p className="rounded border border-[var(--border)] bg-[var(--surface)] p-6 font-sans text-[14px] text-[var(--text-secondary)]">
            {t("findings.empty")}
          </p>
        ) : (
          model.findings.map((f, i) => (
            <Finding
              key={`${f.title}-${i}`}
              severity={f.severity}
              tone={f.tone}
              title={f.title}
              body={f.body}
              citations={f.citations}
              confidence={f.confidence}
              evidenceStrength={f.evidenceStrength}
              methodologyHref={methodologyHrefForFinding(f.title, f.body)}
            />
          ))
        )}
      </section>

      {model.strength ? (
        model.strengthOptIn ? (
          <StrengthRecommendation recommendation={model.strength} raceDateMissing={model.raceDateMissing} />
        ) : (
          <StrengthPlaceholder />
        )
      ) : null}

      <footer className="mt-14 flex flex-col gap-4 border-t border-[var(--border)] pt-8 md:flex-row md:items-center md:justify-between">
        <p className="max-w-lg text-[12px] leading-relaxed text-[var(--text-muted)]">
          This is general fitness information, not medical advice. Zones estimated from
          observed max HR. Consult a healthcare professional for medical concerns and a
          qualified coach for training programming.
        </p>
        <ShareWeeklyButton athleteId={athleteId} weekStart={weekStart} shareId={model.shareId} />
      </footer>
    </div>
  );
}

function StrengthPlaceholder() {
  return (
    <section className="mt-14" aria-labelledby="strength-placeholder-heading">
      <h2 id="strength-placeholder-heading" className="mb-4 font-sans text-[15px] font-semibold">
        Strength recommendation
      </h2>
      <div className="rounded border border-[var(--border)] bg-[var(--surface)] p-6 text-[14px] leading-relaxed text-[var(--text-secondary)]">
        Strength recommendations are pending review by a qualified S&amp;C coach before going wide.
        If you want to try the current version (evidence-informed but not coach-reviewed), enable{" "}
        <Link href="/settings#experimental" className="text-[var(--accent)] underline underline-offset-2">
          &ldquo;Show experimental strength recommendations&rdquo; in Settings
        </Link>
        . See the{" "}
        <Link href="/learn#strength-methodology" className="text-[var(--accent)] underline underline-offset-2">
          methodology page
        </Link>{" "}
        for the research we&apos;re basing them on.
      </div>
    </section>
  );
}

function SummaryItem({
  label,
  value,
  meta,
}: {
  label: string;
  value: ReactNode;
  meta: string;
}) {
  return (
    <div className="min-w-[45%] flex-1 border-[var(--border)] md:min-w-0 md:border-l md:px-6 md:first:border-l-0 md:first:pl-0">
      <div className="font-mono text-[22px] font-medium tracking-tight text-[var(--text-primary)]">
        {value}
      </div>
      <div className="font-sans text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </div>
      <div className="mt-1 font-sans text-[11px] text-[var(--text-muted)]">{meta}</div>
    </div>
  );
}

function ZoneRow({
  label,
  sub,
  pct,
  fillClass,
  targetLeftPct,
  targetLabel,
}: {
  label: string;
  sub: string;
  pct: number;
  fillClass: string;
  targetLeftPct: number;
  targetLabel: string;
}) {
  return (
    <div className="mb-4 grid grid-cols-[minmax(0,88px)_1fr_48px] items-center gap-3 last:mb-0 md:grid-cols-[80px_1fr_48px] md:gap-4">
      <div className="font-sans text-[12px] font-medium leading-tight text-[var(--text-secondary)]">
        {label}
        <span className="mt-0.5 block text-[10px] text-[var(--text-muted)]">{sub}</span>
      </div>
      <div className="relative h-7 overflow-hidden rounded-sm bg-[var(--surface-raised)]">
        <div
          className={`h-full rounded-sm transition-[width] duration-500 ${fillClass}`}
          style={{ width: `${pct}%` }}
          role="meter"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label} ${pct}%`}
        />
        <span
          className="pointer-events-none absolute top-0 h-full w-0.5 bg-[var(--text-primary)] opacity-25"
          style={{ left: `${targetLeftPct}%` }}
          aria-hidden
        />
      </div>
      <span className="text-right font-mono text-[13px] font-medium tabular-nums text-[var(--text-primary)]">
        {pct}%
      </span>
      <span className="sr-only">Target marker: {targetLabel}</span>
    </div>
  );
}

function Finding({
  severity,
  tone,
  title,
  body,
  citations,
  confidence,
  evidenceStrength,
  methodologyHref,
}: {
  severity: string;
  tone: "bad" | "warn" | "low";
  title: string;
  body: string;
  citations: { label: string; href: string }[];
  confidence: string;
  evidenceStrength?: string;
  methodologyHref: string;
}) {
  const tag =
    tone === "bad"
      ? "bg-[rgba(196,75,63,0.06)] text-[var(--status-bad)]"
      : tone === "warn"
        ? "bg-[rgba(184,122,10,0.08)] text-[var(--status-warn)]"
        : "bg-[rgba(46,94,78,0.09)] text-[var(--accent)]";
  const evidence = evidenceStrength ?? "Strong";
  return (
    <article className="mb-3 rounded border border-[var(--border)] bg-[var(--surface)] p-6 last:mb-0">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`rounded-sm px-2 py-0.5 font-sans text-[11px] font-semibold ${tag}`}>
          {severity}
        </span>
        <h3 className="font-sans text-[14px] font-semibold">{title}</h3>
      </div>
      <p className="mt-3 text-[14px] leading-relaxed text-[var(--text-secondary)]">{body}</p>
      <p className="mt-3 font-[family-name:var(--font-instrument)] text-[13px] italic text-[var(--text-muted)]">
        {citations.map((c, i) => (
          <span key={c.href}>
            {i > 0 ? "; " : ""}
            <a
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-[rgba(138,145,160,0.4)] underline-offset-2 hover:text-[var(--accent)]"
            >
              {c.label}
            </a>
          </span>
        ))}
        . Evidence: {evidence}.
      </p>
      <p className="mt-2 font-mono text-[11px] text-[var(--text-muted)]">{confidence}</p>
      <p className="mt-3 font-sans text-[12px] text-[var(--text-muted)]">
        <Link
          href={methodologyHref}
          className="text-[var(--accent)] underline underline-offset-2 hover:text-[var(--text-secondary)]"
        >
          How EnduranceIQ models this →
        </Link>
      </p>
    </article>
  );
}
