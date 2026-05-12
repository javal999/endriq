import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isoMondayLocal } from "@/lib/report/date";

export async function Nav() {
  const week = isoMondayLocal();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const reportHref = user
    ? `/report/${user.id}/${week}`
    : `/report/demo/${week}`;
  const links = [
    { href: "/", label: "Home" },
    { href: reportHref, label: "Weekly report" },
    { href: "/learn", label: "Learn" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5 md:px-12">
        <Link
          href="/"
          className="font-sans text-[15px] font-semibold tracking-tight text-[var(--text-primary)]"
        >
          Endurance<span className="text-[var(--accent)]">IQ</span>
        </Link>
        <nav aria-label="Primary">
          <ul className="flex gap-8">
            {links.map((l) => (
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
        </nav>
      </div>
    </header>
  );
}
