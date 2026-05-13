"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Toast, useToast } from "@/components/toast";

export function ExperimentalStrengthToggle({
  athleteId,
  initialOptin,
}: {
  athleteId: string;
  initialOptin: boolean;
}) {
  const [optin, setOptin] = useState(initialOptin);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function toggle() {
    const next = !optin;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("athletes")
      .update({ strength_recommendations_optin: next })
      .eq("id", athleteId);
    setSaving(false);
    if (error) {
      toast.show("Could not save — " + error.message);
    } else {
      setOptin(next);
      toast.show(next ? "Strength recommendations enabled" : "Strength recommendations disabled");
    }
  }

  return (
    <>
      {toast.message && <Toast message={toast.message} onDismiss={toast.dismiss} />}
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={optin}
          onChange={() => void toggle()}
          disabled={saving}
          className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
        />
        <div>
          <p className="font-sans text-[13px] font-medium text-[var(--text-primary)]">
            Show experimental strength recommendations
            {saving && <span className="ml-2 font-normal text-[var(--text-muted)]">Saving…</span>}
          </p>
          <p className="mt-1 font-sans text-[12px] leading-relaxed text-[var(--text-secondary)]">
            Evidence-informed but not yet reviewed by a qualified S&amp;C coach.
            See the{" "}
            <Link href="/learn#strength-methodology" className="text-[var(--accent)] underline underline-offset-2">
              methodology
            </Link>{" "}
            for the research behind each recommendation. Off by default.
          </p>
        </div>
      </label>
    </>
  );
}
