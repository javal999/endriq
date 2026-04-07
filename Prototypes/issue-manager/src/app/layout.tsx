import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Image from "next/image";
import "./globals.css";
import Link from "next/link";
import AuthNav from "./AuthNav";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Issue Manager",
  description: "Issue tracking, classification, and routing",
};

/** Sidebar only. `/upload` and `/triage` stay reachable by direct URL (not listed here). */
const nav = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/submit", label: "Submit Issue", icon: "✏️" },
  { href: "/issues", label: "Issues", icon: "📋" },
  { href: "/priority", label: "Priority Queue", icon: "🔥" },
  { href: "/workflow", label: "Workflow", icon: "📌" },
  { href: "/groups", label: "Issue Groups", icon: "📁" },
  { href: "/patterns", label: "Patterns", icon: "🔍" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-gray-50 text-gray-900`}>
        <div className="flex h-screen overflow-hidden">
          <aside className="w-56 flex-shrink-0 bg-gray-900 text-gray-200 flex flex-col">
            <div className="px-4 py-4 border-b border-gray-700">
              <Link
                href="/"
                className="inline-block rounded-md bg-white px-2.5 py-1.5 mb-3 ring-1 ring-white/10 hover:bg-gray-50 transition-colors"
                aria-label="Paragon Corp — home"
              >
                <Image
                  src="/paragoncorp.png"
                  alt="ParagonCorp"
                  width={200}
                  height={40}
                  className="h-9 w-auto max-w-[148px] object-contain object-left"
                  priority
                />
              </Link>
              <h1 className="text-base font-bold text-white leading-tight">
                Issue Manager
              </h1>
            </div>
            <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm hover:bg-gray-800 transition-colors"
                >
                  <span className="text-base">{n.icon}</span>
                  {n.label}
                </Link>
              ))}
            </nav>
            <AuthNav />
            <div className="px-5 py-4 border-t border-gray-700 text-xs text-gray-500">
              1,314 issues · 38 DCs
            </div>
          </aside>
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
