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
          className="font-sans text-[15px] font-semibold tracking-tight text-[var(--text-primary)]"
        >
          Endurance<span className="text-[var(--accent)]">IQ</span>
        </Link>

        {user ? (
          <nav aria-label="Primary" className="flex items-center gap-6">
            <ul className="flex gap-8">
              {[
                { href: "/dashboard", label: t("nav.home") },
                { href: weekHref, label: t("nav.week") },
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
