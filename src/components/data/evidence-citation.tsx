/**
 * <EvidenceCitation> — inline citation with DOI link, styled per UI design §3.2.
 *
 * The serif-italic counterpart to <CitationLink> (which is sans-serif and
 * used in long-form copy). Use this in interpretation panels and inline
 * methodology footers where the citation is part of the editorial voice.
 *
 * Always resolves through the central CITATIONS registry — never inline DOIs.
 */

import { CITATIONS, type CitationId } from "@/lib/data/citations";

export interface EvidenceCitationProps {
  id: CitationId;
  className?: string;
}

export function EvidenceCitation({ id, className = "" }: EvidenceCitationProps) {
  const c = CITATIONS[id];
  return (
    <a
      href={c.url}
      target="_blank"
      rel="noopener noreferrer"
      className={
        "italic underline underline-offset-2 [font-family:var(--font-serif),Georgia,serif] " +
        "text-[var(--accent)] hover:[text-decoration-thickness:2px] " +
        className
      }
    >
      {c.label}
    </a>
  );
}
