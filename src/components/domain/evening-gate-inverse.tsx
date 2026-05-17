"use client";

/**
 * <EveningGateInverse> — F11 TZ fix helper.
 *
 * Renders its children only when the browser's local hour is BELOW the
 * given threshold (or when no threshold is passed). Used together with
 * <PreSessionPreviewCard gateByClientHour={...}> to swap between the
 * race-countdown card and the pre-session preview without a server-side
 * timezone read.
 *
 * Uses useSyncExternalStore so SSR renders the children (visible=true)
 * and the post-mount client snapshot decides whether to hide them. This
 * is the React-recommended pattern for reading non-React-managed state
 * (here: the browser's `Date`) without tripping
 * react-hooks/set-state-in-effect.
 *
 * Refs: post-2.0 audit followup #4; PHASE-2.1-BUILD.md §6 T11.
 */

import { useSyncExternalStore, type ReactNode } from "react";

export interface EveningGateInverseProps {
  hour: number | null;
  children: ReactNode;
}

/** No-op subscription — snapshot is only read on first client render. */
function subscribe() {
  return () => {};
}

export function EveningGateInverse({ hour, children }: EveningGateInverseProps) {
  const visible = useSyncExternalStore(
    subscribe,
    () => (hour == null ? true : new Date().getHours() < hour),
    () => true,
  );

  if (!visible) return null;
  return <>{children}</>;
}
