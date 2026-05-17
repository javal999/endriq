/**
 * <AdvisoryBlock> — left-accent advisory.
 *
 * Used for rationale callouts, "If it feels harder than this..." notes,
 * race-week lockdown messages, and other inline guidance. Left border is
 * 3px solid in the chosen tone; the rest of the card uses hairline borders
 * on the remaining sides.
 *
 * UI design §2.5.
 */

import type { ReactNode } from "react";

export type AdvisoryTone = "info" | "warn" | "bad" | "accent";

export interface AdvisoryBlockProps {
  tone?: AdvisoryTone;
  children: ReactNode;
  className?: string;
}

const TONE_COLOR: Record<AdvisoryTone, string> = {
  info: "var(--accent)",
  warn: "var(--status-warn)",
  bad: "var(--status-bad)",
  accent: "var(--accent)",
};

const TONE_BG: Record<AdvisoryTone, string> = {
  info: "var(--accent-soft)",
  warn: "var(--status-warn-bg)",
  bad: "var(--status-bad-bg)",
  accent: "var(--accent-soft)",
};

export function AdvisoryBlock({
  tone = "accent",
  children,
  className = "",
}: AdvisoryBlockProps) {
  return (
    <div
      role="note"
      style={{
        borderLeft: `3px solid ${TONE_COLOR[tone]}`,
        background: TONE_BG[tone],
      }}
      className={`rounded-r-md px-4 py-3 ${className}`}
    >
      {children}
    </div>
  );
}
