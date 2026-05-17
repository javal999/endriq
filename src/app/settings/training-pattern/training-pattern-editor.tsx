"use client";

/**
 * Client wrapper for /settings/training-pattern.
 *
 * Owns the planner's pattern state. Save action writes to
 * athletes.typical_week_pattern via the user-session Supabase client
 * (RLS scopes to auth.uid()). Mirrors the upsert pattern used by
 * /onboarding so we don't need a new API route.
 */

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { TypicalWeekPlanner } from "@/components/domain/typical-week-planner";
import { createClient } from "@/lib/supabase/client";
import type { TypicalWeekPattern } from "@/lib/plan/types";

export interface TrainingPatternEditorProps {
  initial: TypicalWeekPattern;
}

export function TrainingPatternEditor({ initial }: TrainingPatternEditorProps) {
  const router = useRouter();
  const [pattern, setPattern] = useState<TypicalWeekPattern>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dirty if the stringified pattern differs from initial — simple
  // equality is fine because both sides use the same canonical shape
  // (weekday-sorted, no whitespace from JSONB.
  const isDirty =
    JSON.stringify(pattern) !== JSON.stringify(initial);

  const save = useCallback(async () => {
    setError(null);
    setSaving(true);
    setSaved(false);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Session expired. Sign in again and retry.");
      }
      const { error: upsertErr } = await supabase
        .from("athletes")
        .update({ typical_week_pattern: pattern })
        .eq("id", user.id);
      if (upsertErr) throw new Error(upsertErr.message);
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }, [pattern, router]);

  return (
    <div className="space-y-5">
      <TypicalWeekPlanner value={pattern} onChange={setPattern} />

      {error && (
        <p className="font-sans text-[13px] text-[var(--status-bad)]">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || !isDirty}
          className="rounded-md bg-[var(--accent)] px-4 py-2 font-sans text-[14px] font-medium text-[var(--text-on-accent)] hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save pattern"}
        </button>
        {saved && !isDirty && (
          <span className="font-sans text-[13px] text-[var(--status-good)]">
            ✓ Saved
          </span>
        )}
        {!isDirty && !saved && (
          <span className="font-sans text-[13px] text-[var(--text-muted)]">
            No unsaved changes
          </span>
        )}
      </div>
    </div>
  );
}
