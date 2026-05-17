/**
 * <HairlineCard> — default 0.5px-bordered card.
 *
 * Use everywhere by default. Reserve GlassCard for the single hero element
 * per view (UI design §2.5).
 */

import type { ReactNode } from "react";

export interface HairlineCardProps {
  children: ReactNode;
  className?: string;
  /** Use the slightly heavier border for emphasised / interactive cards. */
  emphasised?: boolean;
}

export function HairlineCard({
  children,
  className = "",
  emphasised = false,
}: HairlineCardProps) {
  const border = emphasised
    ? "border border-[var(--border)]"
    : "border-[0.5px] border-[var(--border-hairline)]";
  return (
    <div className={`${border} rounded-md bg-[var(--surface)] p-5 ${className}`}>
      {children}
    </div>
  );
}
