"use client";

/**
 * Client wrapper around the F8 input + panel for /session/[id].
 *
 * The server page hands us the AthleteHistorySlice; we own the input state
 * and re-run parseCoachInstruction + interpretRun each time the debounce
 * window fires.
 */

import { useMemo, useState } from "react";
import { CoachInstructionInput } from "@/components/inputs/coach-instruction-input";
import { RunInterpretationPanel } from "@/components/domain/run-interpretation-panel";
import { interpretRun } from "@/lib/analytics/interpretRun";
import { parseCoachInstruction } from "@/lib/analytics/parseCoachInstruction";
import type { AthleteHistorySlice } from "@/lib/analytics/types";
import { flags } from "@/lib/featureFlags";

export interface SessionInterpretViewProps {
  slice: AthleteHistorySlice;
  locale: "en" | "id";
  initialInput: string;
}

export function SessionInterpretView({
  slice,
  locale,
  initialInput,
}: SessionInterpretViewProps) {
  const [input, setInput] = useState(initialInput);

  const interpretation = useMemo(() => {
    if (input.trim().length === 0) return null;
    const parsed = parseCoachInstruction(input, {
      observedMaxHr: slice.observedMaxHr ?? undefined,
    });
    return interpretRun(parsed, slice, {
      personalCalibrationEnabled: flags.F8_PERSONAL_CALIBRATION,
    });
  }, [input, slice]);

  return (
    <div className="mt-6 space-y-5">
      <CoachInstructionInput
        initialValue={initialInput}
        onInterpret={setInput}
      />
      <RunInterpretationPanel interpretation={interpretation} locale={locale} />
    </div>
  );
}
