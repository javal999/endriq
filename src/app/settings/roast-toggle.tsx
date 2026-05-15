"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Toast, useToast } from "@/components/toast";

export function RoastToggle({
  athleteId,
  initialEnabled,
}: {
  athleteId: string;
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function toggle() {
    const next = !enabled;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("athletes")
      .update({ roast_enabled: next })
      .eq("id", athleteId);
    setSaving(false);
    if (error) {
      toast.show("Could not save — " + error.message);
    } else {
      setEnabled(next);
      toast.show(next ? "Roast mode enabled" : "Roast mode disabled");
    }
  }

  return (
    <>
      {toast.message && <Toast message={toast.message} onDismiss={toast.dismiss} />}
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={() => void toggle()}
          disabled={saving}
          className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
        />
        <div>
          <p className="font-sans text-[13px] font-medium text-[var(--text-primary)]">
            Show &ldquo;Roast&rdquo; tab on my weekly report
            {saving && <span className="ml-2 font-normal text-[var(--text-muted)]">Saving…</span>}
          </p>
          <p className="mt-1 font-sans text-[12px] leading-relaxed text-[var(--text-secondary)]">
            A sarcastic version of the LLM analysis — dry, British observational humour,
            not cruelty. Roasts the patterns, not the person. Off by default.
            Never shown on share cards.
          </p>
        </div>
      </label>
    </>
  );
}
