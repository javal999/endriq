"use client";

/**
 * <StickyCta> — T04 mobile pattern.
 *
 * Sticky to the bottom of the viewport on mobile (above the BottomNav);
 * inline at the end of content on desktop. One primary action, optional
 * secondary. Used by /session/[id] and onboarding final step.
 *
 * Refs: PHASE-2.1-BUILD.md §6 T04 step 5.
 */

import type { ReactNode } from "react";

export interface StickyCtaAction {
  label: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  icon?: ReactNode;
}

export interface StickyCtaProps {
  primary: StickyCtaAction;
  secondary?: StickyCtaAction;
  /** Optional helper text rendered above the buttons on mobile only. */
  helper?: string;
}

function ActionButton({
  action,
  variant,
}: {
  action: StickyCtaAction;
  variant: "primary" | "secondary";
}) {
  const base =
    "inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md px-4 font-sans text-[14px] font-medium disabled:opacity-50";
  const cls =
    variant === "primary"
      ? `${base} bg-[var(--accent)] text-[var(--text-on-accent,white)] hover:opacity-90`
      : `${base} border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--border-strong)]`;
  if (action.href) {
    return (
      <a href={action.href} className={cls} aria-disabled={action.disabled}>
        {action.icon}
        <span>{action.label}</span>
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={action.onClick}
      disabled={action.disabled}
      className={cls}
    >
      {action.icon}
      <span>{action.label}</span>
    </button>
  );
}

export function StickyCta({ primary, secondary, helper }: StickyCtaProps) {
  return (
    <div
      className="
        fixed inset-x-0 bottom-14 z-30 border-t border-[var(--border)] bg-[var(--surface)]/95 px-4 py-3 backdrop-blur
        md:static md:inset-auto md:mt-6 md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none
      "
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
    >
      {helper && (
        <p className="mb-2 text-center font-sans text-[12px] text-[var(--text-muted)] md:hidden">
          {helper}
        </p>
      )}
      <div className="mx-auto flex max-w-md gap-2 md:max-w-none">
        {secondary && <ActionButton action={secondary} variant="secondary" />}
        <ActionButton action={primary} variant="primary" />
      </div>
    </div>
  );
}
