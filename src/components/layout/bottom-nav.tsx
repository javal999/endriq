"use client";

/**
 * <BottomNav> — T04 mobile bottom tab bar.
 *
 * Sticky to the viewport bottom on mobile; hidden on md+ (top Nav takes
 * over). Four tabs: Today / Plan / Race / Profile. The active tab uses
 * the accent colour and bold weight.
 *
 * Touch targets: each link is min-h-14 (56px) — comfortably above the
 * 44×44px Apple Human Interface Guidelines minimum.
 *
 * Refs: PHASE-2.1-BUILD.md §6 T04 step 2.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Tab {
  href: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
}

const TABS: Tab[] = [
  {
    href: "/dashboard",
    label: "Today",
    icon: (active) => (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden fill="none">
        <path
          d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8.5Z"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.6}
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/week",
    label: "Plan",
    icon: (active) => (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden fill="none">
        <rect
          x="3.5"
          y="5"
          width="17"
          height="15"
          rx="1.5"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.6}
        />
        <path
          d="M3.5 9.5h17M8 3v4M16 3v4"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.6}
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: "/race",
    label: "Race",
    icon: (active) => (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden fill="none">
        <circle
          cx="12"
          cy="12"
          r="8"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.6}
        />
        <path
          d="M12 6v6l4 2"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Profile",
    icon: (active) => (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden fill="none">
        <circle
          cx="12"
          cy="9"
          r="3.5"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.6}
        />
        <path
          d="M5 20c1.6-3.5 4.5-5 7-5s5.4 1.5 7 5"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.6}
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
  if (href === "/week") return pathname.startsWith("/week") || pathname.startsWith("/report");
  if (href === "/race") return pathname.startsWith("/race");
  if (href === "/settings") return pathname.startsWith("/settings");
  return pathname === href;
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Bottom navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between gap-1 px-2">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                prefetch={false}
                aria-current={active ? "page" : undefined}
                className={
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 py-1.5 font-sans text-[10px] font-medium uppercase tracking-wider " +
                  (active
                    ? "text-[var(--accent)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]")
                }
              >
                {tab.icon(active)}
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
