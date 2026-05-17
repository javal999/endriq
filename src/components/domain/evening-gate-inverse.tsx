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
 * SSR renders the children (so RaceCountdownCard is visible on first
 * paint). After mount we check the local hour; if it's ≥ the threshold
 * we hide the children, letting the PreSessionPreviewCard take over.
 *
 * Refs: post-2.0 audit followup #4; PHASE-2.1-BUILD.md §6 T11.
 */

import { useEffect, useState, type ReactNode } from "react";

export interface EveningGateInverseProps {
  hour: number | null;
  children: ReactNode;
}

export function EveningGateInverse({ hour, children }: EveningGateInverseProps) {
  // Initial state: visible. After mount we may hide ourselves.
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (hour == null) return;
    if (new Date().getHours() >= hour) setVisible(false);
  }, [hour]);

  if (!visible) return null;
  return <>{children}</>;
}
