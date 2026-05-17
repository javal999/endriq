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
          {/* Brand mark — inline SVG so it scales sharply at any density and
              doesn't add a network round-trip. Mirrors public/logo-mark.svg
              and src/app/icon.svg. */}
          <svg
            viewBox="0 0 256 256"
            width="22"
            height="22"
            aria-hidden
            className="shrink-0 rounded-sm"
          >
            <rect width="256" height="256" fill="#0B1426" />
            <path d="M 92,72 L 208,72 L 192,98 L 92,98 Z" fill="#FFFFFF" />
            <path d="M 92,116 L 196,116 L 180,142 L 92,142 Z" fill="#FFFFFF" />
            <path d="M 92,160 L 208,160 L 192,186 L 92,186 Z" fill="#FFFFFF" />
            <path d="M 72,90 C 84,70 116,70 124,98 C 116,118 84,118 72,98 Z" fill="#3FCE3F" />
            <path d="M 72,134 C 84,114 116,114 124,142 C 116,162 84,162 72,142 Z" fill="#22B81E" />
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
