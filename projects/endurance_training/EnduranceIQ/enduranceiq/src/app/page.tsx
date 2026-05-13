import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isoMondayLocal } from "@/lib/report/date";
import { SiteFooter } from "@/components/site-footer";
import { CITATIONS } from "@/lib/data/citations";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "EnduranceIQ — A smart second opinion on your marathon training",
  description:
    "EnduranceIQ reads your watch data and tells you what you're doing wrong, why it matters, and what to change. Evidence-backed weekly analysis for self-coached runners.",
};

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const week = isoMondayLocal();
  const demoReportHref = `/report/demo/${week}`;
  const t = await getTranslations("landing");
  const tc = await getTranslations("common");

  return (
    <div className="flex min-h-screen flex-col">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="flex min-h-screen flex-col items-center justify-center px-5 py-20 text-center md:px-12">
        <p className="font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
          {t("hero.label")}
        </p>
        <h1 className="mt-4 max-w-2xl font-sans text-[32px] font-bold leading-[1.15] tracking-tight text-[var(--text-primary)] md:text-[44px]">
          {t("hero.headline")}
        </h1>
        <p className="mt-6 max-w-xl font-sans text-[16px] leading-relaxed text-[var(--text-secondary)]">
          {t("hero.subhead")}
        </p>

        {/* Glass CTA card — the ONE glass card on the page */}
        <div className="mt-12 w-full max-w-sm rounded-[20px] border border-[rgba(213,216,224,0.45)] bg-[rgba(250,251,253,0.68)] p-8 shadow-[0_20px_40px_-16px_rgba(16,19,26,0.14)] backdrop-blur-xl backdrop-saturate-180 supports-[backdrop-filter]:bg-[rgba(250,251,253,0.68)]">
          <p className="font-sans text-[13px] text-[var(--text-secondary)]">
            {t("hero.ctaSampleDesc")}
          </p>
          <Link
            href={demoReportHref}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded bg-[var(--accent)] px-5 font-sans text-[14px] font-medium text-white transition-colors hover:bg-[#245045]"
          >
            {t("hero.ctaSample")}
          </Link>
          <div className="mt-4 border-t border-[var(--border)] pt-4">
            <Link
              href="/auth/signup"
              className="inline-flex min-h-11 w-full items-center justify-center rounded border border-[var(--border)] bg-[var(--surface)] px-5 font-sans text-[14px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-raised)]"
            >
              {t("hero.ctaSignup")}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Problem framing ──────────────────────────────────────────── */}
      <section className="border-t border-[var(--border)] bg-[var(--surface)] px-5 py-20 md:px-12">
        <div className="mx-auto max-w-2xl space-y-6 font-sans text-[16px] leading-relaxed text-[var(--text-secondary)]">
          <p>{t("problem.p1")}</p>
          <p>{t("problem.p2")}</p>
          <p>
            {t("problem.p3")}{" "}
            <a
              href={CITATIONS.seiler_2010.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] underline underline-offset-2"
            >
              Seiler (2010)
            </a>
            {" "}shows 80% easy training produces the best aerobic adaptations.
            Most recreational runners invert this ratio.
          </p>
        </div>
      </section>

      {/* ── What you'll get ──────────────────────────────────────────── */}
      <section className="px-5 py-20 md:px-12">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-sans text-[22px] font-bold tracking-tight text-[var(--text-primary)]">
            {t("features.title")}
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <FeatureCard title={t("features.intensityTitle")} body={t("features.intensityBody")} />
            <FeatureCard title={t("features.loadTitle")} body={t("features.loadBody")} />
            <FeatureCard title={t("features.strengthTitle")} body={t("features.strengthBody")} />
          </div>
        </div>
      </section>

      {/* ── Methodology teaser ───────────────────────────────────────── */}
      <section className="border-t border-[var(--border)] bg-[var(--surface)] px-5 py-20 md:px-12">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-sans text-[22px] font-bold tracking-tight text-[var(--text-primary)]">
            {t("methodology.headline")}
          </h2>
          <p className="mt-5 font-sans text-[16px] leading-relaxed text-[var(--text-secondary)]">
            {t("methodology.p1")}
          </p>
          <p className="mt-4 font-sans text-[16px] leading-relaxed text-[var(--text-secondary)]">
            {t("methodology.p2")}
          </p>
          <p className="mt-6 font-sans text-[14px]">
            <Link href="/learn" className="text-[var(--accent)] underline underline-offset-2">
              {t("methodology.link")}
            </Link>
          </p>
        </div>
      </section>

      {/* ── CTA strip ────────────────────────────────────────────────── */}
      <section className="bg-[var(--accent)] px-5 py-16 text-center md:px-12">
        <h2 className="font-sans text-[22px] font-bold tracking-tight text-white">
          {t("cta.headline")}
        </h2>
        <p className="mt-3 font-sans text-[15px] text-[rgba(255,255,255,0.8)]">
          {t("cta.subhead")}
        </p>
        <Link
          href="/auth/signup"
          className="mt-8 inline-flex min-h-12 items-center justify-center rounded bg-white px-8 font-sans text-[14px] font-semibold text-[var(--accent)] transition-colors hover:bg-[rgba(255,255,255,0.9)]"
        >
          {t("cta.button")}
        </Link>
      </section>

      <SiteFooter />
    </div>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded border border-[var(--border)] bg-[var(--surface)] p-6">
      <h3 className="font-sans text-[15px] font-semibold text-[var(--text-primary)]">
        {title}
      </h3>
      <p className="mt-3 font-sans text-[14px] leading-relaxed text-[var(--text-secondary)]">
        {body}
      </p>
    </div>
  );
}
