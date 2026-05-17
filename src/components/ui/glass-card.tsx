/**
 * <GlassCard> — the single glass surface per view.
 *
 * Rules from UI design §2.5: never stack glass on glass; one hero element
 * per page max. Use HairlineCard for everything else.
 *
 * Tokens (declared globally in CSS):
 *   --glass-bg, --glass-border-top, --glass-border, --glass-shadow,
 *   --radius-glass.
 */

import type { ReactNode } from "react";

export interface GlassCardProps {
  children: ReactNode;
  /** Extra Tailwind / className overrides. */
  className?: string;
  /** ARIA role override if the card represents something specific. */
  role?: string;
  ariaLabel?: string;
}

export function GlassCard({ children, className = "", role, ariaLabel }: GlassCardProps) {
  return (
    <div
      role={role}
      aria-label={ariaLabel}
      className={
        "border-x-0 border-b border-t " +
        "border-[var(--glass-border)] border-t-[var(--glass-border-top)] " +
        "bg-[var(--glass-bg)] " +
        "[backdrop-filter:blur(24px)_saturate(180%)] " +
        "[box-shadow:var(--glass-shadow)] " +
        "rounded-[20px] p-6 " +
        className
      }
    >
      {children}
    </div>
  );
}
