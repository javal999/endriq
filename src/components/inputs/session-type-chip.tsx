"use client";

/**
 * <SessionTypeChip> — selectable chip for a session type.
 *
 * Color-coded by session band per UI design §2.1 (--session-* tokens).
 * 28px tall pill; padding makes the tap area ≥44px on mobile.
 */

import type { SessionType } from "@/lib/plan/types";

const LABELS: Record<SessionType, string> = {
  easy_run: "Easy run",
  long_run: "Long run",
  tempo: "Tempo",
  interval: "Intervals",
  drill: "Drill",
  strides: "Strides",
  recovery: "Recovery",
  swim: "Swim",
  bike: "Bike",
  cross_training: "Cross",
  strength: "Strength",
  rest: "Rest",
};

const TONE_BG: Record<SessionType, string> = {
  easy_run: "var(--session-easy)",
  long_run: "var(--session-easy)",
  recovery: "var(--session-easy)",
  drill: "var(--session-easy)",
  tempo: "var(--session-moderate)",
  strides: "var(--session-hard)",
  interval: "var(--session-hard)",
  strength: "var(--session-strength)",
  swim: "var(--session-cross)",
  bike: "var(--session-cross)",
  cross_training: "var(--session-cross)",
  rest: "var(--session-rest)",
};

export interface SessionTypeChipProps {
  type: SessionType;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  /** Optional link target — renders as <a> instead of <span>. */
  href?: string;
  className?: string;
  /** Optional removal handler — when present, shows an inline × button. */
  onRemove?: () => void;
}

export function SessionTypeChip({
  type,
  selected = false,
  disabled = false,
  onClick,
  href,
  onRemove,
  className = "",
}: SessionTypeChipProps) {
  const isInteractive = !disabled && (!!onClick || !!onRemove || !!href);
  const commonClass =
    `inline-flex h-7 items-center gap-1 rounded-sm px-2 py-1 ` +
    `font-sans text-[12px] font-medium text-[var(--text-primary)] no-underline ` +
    `${selected ? "ring-1 ring-[var(--accent)]" : ""} ` +
    `${className}`;
  const commonStyle = {
    background: TONE_BG[type],
    opacity: disabled ? 0.5 : 1,
    cursor: isInteractive ? "pointer" : "default",
  };

  const inner = (
    <>
      {LABELS[type]}
      {onRemove && !disabled && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${LABELS[type]}`}
          className="ml-1 rounded-sm px-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          ×
        </button>
      )}
    </>
  );

  if (href && !disabled) {
    return (
      <a
        href={href}
        style={commonStyle}
        className={commonClass}
        aria-label={`Open ${LABELS[type]} session`}
      >
        {inner}
      </a>
    );
  }

  return (
    <span
      role={onClick ? "button" : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      onClick={!disabled ? onClick : undefined}
      onKeyDown={
        onClick && !disabled
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      style={commonStyle}
      className={commonClass}
    >
      {inner}
    </span>
  );
}

export const SESSION_TYPE_LABELS = LABELS;
