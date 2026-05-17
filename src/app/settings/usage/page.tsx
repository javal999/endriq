import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * /settings/usage — F16.B quota visibility (T15).
 *
 * The athlete can check their monthly AI quota here. PRD §5.9 is explicit
 * that the quota is NOT surfaced on report pages — only here. When the
 * athlete hits the cap, the LLM sections silently disappear from the
 * report; this page is the one place they can see why.
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.9 F16.B; PHASE-2.0-BUILD.md T15.
 */

export const metadata = { title: "Usage — Settings — EnduranceIQ" };

export default async function UsagePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/login?redirect=${encodeURIComponent("/settings/usage")}`);
  }

  const { data: athlete } = await supabase
    .from("athletes")
    .select("monthly_llm_calls_quota, monthly_llm_calls_used, quota_reset_at")
    .eq("id", user.id)
    .maybeSingle();

  const quota =
    typeof athlete?.monthly_llm_calls_quota === "number"
      ? athlete.monthly_llm_calls_quota
      : 20;
  const used =
    typeof athlete?.monthly_llm_calls_used === "number"
      ? athlete.monthly_llm_calls_used
      : 0;
  const remaining = Math.max(0, quota - used);
  const resetAt =
    typeof athlete?.quota_reset_at === "string" ? athlete.quota_reset_at : null;
  const resetDate = resetAt ? resetAt.slice(0, 10) : null;
  const pct = quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;
  const lowWarning = remaining <= 5;
  const exhausted = remaining === 0;

  return (
    <div className="mx-auto max-w-2xl px-5 py-12 md:px-8">
      <p className="font-sans text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
        <Link href="/settings" className="hover:text-[var(--text-secondary)]">
          ← Settings
        </Link>
      </p>
      <h1 className="mt-2 font-sans text-xl font-bold tracking-tight">Usage</h1>
      <p className="mt-2 font-sans text-[14px] text-[var(--text-secondary)]">
        AI-generated commentary is part of your weekly report. We cap it at a
        monthly call budget so costs stay predictable.
      </p>

      <section
        aria-labelledby="ai-quota-heading"
        className="mt-8 rounded-md border border-[var(--border)] bg-[var(--surface)] p-5"
      >
        <h2
          id="ai-quota-heading"
          className="font-sans text-[15px] font-semibold text-[var(--text-primary)]"
        >
          AI quota
        </h2>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-mono text-[24px] font-medium text-[var(--text-primary)]">
            {used}
          </span>
          <span className="font-sans text-[14px] text-[var(--text-secondary)]">
            / {quota} used this month
          </span>
        </div>

        <div
          className="mt-3 h-2 w-full overflow-hidden rounded-sm bg-[var(--surface-raised)]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={quota}
          aria-valuenow={used}
        >
          <div
            style={{
              width: `${pct}%`,
              background: exhausted
                ? "var(--status-bad)"
                : lowWarning
                  ? "var(--status-warn)"
                  : "var(--accent)",
            }}
            className="h-full transition-all"
          />
        </div>

        {resetDate && (
          <p className="mt-3 font-sans text-[12px] text-[var(--text-muted)]">
            Resets on <span className="font-mono">{resetDate}</span>.
          </p>
        )}

        {exhausted && (
          <p className="mt-3 font-sans text-[13px] text-[var(--text-secondary)]">
            You&apos;ve hit this month&apos;s AI quota. Weekly narrative,
            intensity commentary, and per-session explanations are paused
            until the reset date. Charts, intensity bars, and strength
            recommendations stay available.
          </p>
        )}

        {!exhausted && lowWarning && (
          <p className="mt-3 font-sans text-[13px] text-[var(--text-secondary)]">
            Approaching the monthly cap — {remaining} call
            {remaining === 1 ? "" : "s"} remaining.
          </p>
        )}
      </section>

      <p className="mt-6 font-sans text-[12px] italic text-[var(--text-muted)]">
        The quota counts every individual AI call: weekly narrative,
        intensity explanation, per-session explanations, locale translation
        passes, and roast mode (when enabled).
      </p>
    </div>
  );
}
