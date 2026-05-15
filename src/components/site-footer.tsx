import { LEVITATIONS_LINKEDIN_URL } from "@/lib/enduranceiq/constants";

export function SiteFooter() {
  const instagramHref = process.env.NEXT_PUBLIC_INSTAGRAM_URL?.trim();

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)] py-6">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 md:px-12">
        <p className="font-sans text-[12px] text-[var(--text-muted)]">
          Built with love by{" "}
          <a
            href="https://levitations.id"
            className="text-[var(--accent)] underline underline-offset-2"
            target="_blank"
            rel="noopener noreferrer"
          >
            levitations
          </a>
        </p>
        <ul className="flex gap-5 font-sans text-[12px] text-[var(--text-muted)]">
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
        </ul>
      </div>
    </footer>
  );
}
