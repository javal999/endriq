import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { isoMondayLocal } from "@/lib/report/date";
import { LocaleSwitch } from "@/components/locale-switch";

export async function Nav() {
  const week = isoMondayLocal();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // T08: signed-in users go to the consolidated /week view; signed-out
  // visitors keep landing on the demo report for the marketing flow.
  const weekHref = user ? "/week" : `/report/demo/${week}`;

  const locale = await getLocale();
  const t = await getTranslations("common");

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5 md:px-12">
        <Link
          href={user ? "/dashboard" : "/"}
          className="inline-flex items-center gap-2 font-sans text-[15px] font-semibold tracking-tight text-[var(--text-primary)]"
        >
          {/* Brand mark — inline SVG mirrors src/app/icon.svg (favicon)
              and projects/endurance_training/EnduranceIQ/endriq.svg
              (asset source). Inline so it scales sharply and adds no
              network round-trip. */}
          <svg
            viewBox="0 0 1024 1024"
            width="22"
            height="22"
            aria-hidden
            fill="none"
            className="shrink-0 rounded-sm"
          >
            <rect width="1024" height="1024" fill="#050505" />
            <path
              d="M 560,260 H 820 C 835,260 846,273 842,287 L 820,370 C 816,384 803,394 788,394 H 528 C 513,394 502,381 506,367 L 528,284 C 532,270 545,260 560,260 Z"
              fill="#F5F5F5"
            />
            <path
              d="M 470,468 H 680 C 695,468 706,481 702,495 L 686,554 C 682,568 669,578 654,578 H 444 C 429,578 418,565 422,551 L 438,492 C 442,478 455,468 470,468 Z"
              fill="#F5F5F5"
            />
            <path
              d="M 430,664 H 720 C 735,664 746,677 742,691 L 720,774 C 716,788 703,798 688,798 H 398 C 383,798 372,785 376,771 L 398,688 C 402,674 415,664 430,664 Z"
              fill="#F5F5F5"
            />
            <path
              d="M 290,500 C 360,390 470,390 560,394 C 545,470 490,520 390,520 H 240 C 250,510 270,500 290,500 Z"
              fill="#7CFF00"
            />
            <path
              d="M 250,700 C 320,590 430,590 520,594 C 505,670 450,720 350,720 H 200 C 210,710 230,700 250,700 Z"
              fill="#00E04F"
            />
          </svg>
          <span>
            Endurance<span className="text-[var(--accent)]">IQ</span>
          </span>
        </Link>

        {user ? (
          // T04 mobile pass: top-nav links are desktop-only. On viewports
          // below `md`, BottomNav (rendered in app/layout.tsx) takes over.
          // The locale switch + signed-in badge stay accessible.
          <>
          {/* Mobile locale switch — bottom-nav handles navigation. */}
          <div className="flex md:hidden">
            <LocaleSwitch currentLocale={locale} />
          </div>
          <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
            <ul className="flex gap-6">
              {[
                { href: "/dashboard", label: t("nav.home") },
                { href: weekHref, label: t("nav.week") },
                { href: "/session/strength", label: t("nav.strength") },
                { href: "/race", label: t("nav.race") },
                { href: "/learn", label: t("nav.learn") },
                { href: "/settings", label: t("nav.settings") },
                { href: "/support", label: t("nav.support") },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="inline-flex min-h-11 items-center border-b-[1.5px] border-transparent pb-0.5 font-sans text-[13px] font-medium text-[var(--text-muted)] transition-colors duration-[180ms] hover:text-[var(--text-secondary)]"
                    prefetch={false}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <LocaleSwitch currentLocale={locale} />
          </nav>
          </>
        ) : (
          <nav aria-label="Primary" className="flex items-center gap-4">
            <ul className="flex gap-6">
              <li>
                <Link
                  href="/learn"
                  className="inline-flex min-h-11 items-center font-sans text-[13px] font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
                >
                  {t("nav.learn")}
                </Link>
              </li>
              <li>
                <Link
                  href="/auth/login"
                  className="inline-flex min-h-11 items-center rounded border border-[var(--border)] bg-[var(--surface)] px-4 font-sans text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-raised)]"
                >
                  {t("nav.signIn")}
                </Link>
              </li>
            </ul>
            <LocaleSwitch currentLocale={locale} />
          </nav>
        )}
      </div>
    </header>
  );
}
