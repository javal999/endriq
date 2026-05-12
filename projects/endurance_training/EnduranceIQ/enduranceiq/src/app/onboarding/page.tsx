import Link from "next/link";

export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-lg px-5 py-16 md:px-8">
      <h1 className="font-sans text-xl font-bold tracking-tight text-[var(--text-primary)]">
        Welcome to EnduranceIQ
      </h1>
      <p className="mt-4 text-[14px] leading-relaxed text-[var(--text-secondary)]">
        Connect Strava to import runs with heart rate, then open your weekly report from the home page.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/settings"
          className="inline-flex min-h-11 items-center justify-center rounded bg-[var(--accent)] px-5 font-sans text-[13px] font-medium text-white hover:bg-[#245045]"
        >
          Open settings
        </Link>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center rounded border border-[var(--border)] px-5 font-sans text-[13px] font-medium text-[var(--text-secondary)] hover:border-[var(--accent)]"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
