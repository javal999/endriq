import Link from "next/link";
import { LEVITATIONS_LINKEDIN_URL } from "@/lib/enduranceiq/constants";

export function SiteFooter() {
  const instagramHref = process.env.NEXT_PUBLIC_INSTAGRAM_URL?.trim();

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)] py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 md:flex-row md:items-center md:justify-between md:px-12">
        <p className="font-sans text-[12px] text-[var(--text-muted)]">
          © Levitations ·{" "}
          <a
            href={process.env.NEXT_PUBLIC_APP_URL ?? "/"}
            className="text-[var(--accent)] underline underline-offset-2"
          >
            {process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") ?? "endriq.levitations.id"}
          </a>
        </p>
        <ul className="flex flex-wrap gap-x-6 gap-y-2 font-sans text-[12px] text-[var(--text-muted)]">
          <li>
            <a
              href="https://levitations.id"
              className="hover:text-[var(--accent)]"
              target="_blank"
              rel="noopener noreferrer"
            >
              levitations.id
            </a>
          </li>
          <li>
            <a
              href={LEVITATIONS_LINKEDIN_URL}
              className="hover:text-[var(--accent)]"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
            </a>
          </li>
          {instagramHref ? (
            <li>
              <a
                href={instagramHref}
                className="hover:text-[var(--accent)]"
                target="_blank"
                rel="noopener noreferrer"
              >
                Instagram
              </a>
            </li>
          ) : null}
          <li>
            <Link href="/learn" className="hover:text-[var(--accent)]">
              Learn
            </Link>
          </li>
          <li>
            <Link href="/support" className="hover:text-[var(--accent)]">
              Support EnduranceIQ
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}
