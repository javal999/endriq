"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ExperimentalStrengthToggle({
  athleteId,
  initialOptin,
}: {
  athleteId: string;
  initialOptin: boolean;
}) {
  const [optin, setOptin] = useState(initialOptin);
  const [status, setStatus] = useState<"idle" | "saving">("idle");

  async function toggle() {
    const next = !optin;
    setStatus("saving");
    const supabase = createClient();
    await supabase
      .from("athletes")
      .update({ strength_recommendations_optin: next })
      .eq("id", athleteId);
    setOptin(next);
    setStatus("idle");
  }

  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={optin}
          onChange={() => void toggle()}
          disabled={status === "saving"}
          className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
        />
        <div>
          <p className="font-sans text-[13px] font-medium text-[var(--text-primary)]">
            Show experimental strength recommendations
          </p>
          <p className="mt-1 font-sans text-[12px] leading-relaxed text-[var(--text-secondary)]">
            Evidence-informed but not yet reviewed by a qualified S&amp;C coach.
            See the{" "}
            <Link
              href="/learn#strength-methodology"
              className="text-[var(--accent)] underline underline-offset-2"
            >
              methodology
            </Link>{" "}
            for the research behind each recommendation. Off by default.
          </p>
        </div>
      </label>
    </div>
  );
}
