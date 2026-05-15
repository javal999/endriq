import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support EnduranceIQ",
  description:
    "EnduranceIQ is free to use. If it's saved you time or helped your training, consider supporting.",
};

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16 md:px-8">
      <p className="font-sans text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
        EnduranceIQ
      </p>
      <h1 className="mt-2 font-sans text-[26px] font-bold tracking-tight text-[var(--text-primary)]">
        Support EnduranceIQ
      </h1>

      <p className="mt-6 font-sans text-[15px] leading-relaxed text-[var(--text-secondary)]">
        EnduranceIQ is free to use. Running it costs real money — every weekly
        report triggers a few Anthropic API calls, and the analysis runs on
        Vercel + Supabase infrastructure. No ads, no paywall, no tracking.
      </p>
      <p className="mt-4 font-sans text-[15px] leading-relaxed text-[var(--text-secondary)]">
        If the weekly analysis has been useful — caught a week where you were
        overreaching, made your easy runs actually easy, or just gave you a
        second opinion you trusted — consider chipping in. It keeps the LLM
        bills covered and the lights on.
      </p>

      <div className="mt-10">
        <a
          href="https://saweria.co/levitations"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center justify-center gap-3 rounded bg-[var(--accent)] px-8 font-sans text-[15px] font-semibold text-white transition-colors hover:bg-[#245045]"
        >
          Dukung via Saweria →
        </a>
        <p className="mt-3 font-sans text-[13px] text-[var(--text-muted)]">
          One-time, no account needed. QRIS / e-wallet / bank transfer.
          Indonesian-first — suits the primary audience.
        </p>
      </div>

      <p className="mt-12 font-sans text-[12px] leading-relaxed text-[var(--text-muted)]">
        No PII collected on this page. No analytics tied to identity.
        Support is entirely voluntary — EnduranceIQ works the same either way.
      </p>
    </div>
  );
}
