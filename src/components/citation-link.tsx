import { CITATIONS, type CitationId } from "@/lib/data/citations";

/**
 * Renders a verified research citation as an external link.
 * Always resolves from the centralized CITATIONS registry — never inline URLs.
 */
export function CitationLink({ id }: { id: CitationId }) {
  const c = CITATIONS[id];
  return (
    <a
      href={c.url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[var(--accent)] underline underline-offset-2"
    >
      {c.label} ↗
    </a>
  );
}
