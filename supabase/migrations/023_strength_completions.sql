-- EnduranceIQ Phase 2.0 — F10 strength session completion log
-- Adds: strength_completions table; idempotent athletes columns.
-- Refs: PHASE-2.0-PRD-FINAL.md §5.3 F10; PHASE-2.0-BUILD.md T09 (M4).
--
-- The athletes columns are listed in BUILD.md as "add if not exists"; they
-- already shipped in Phase 1.3 / earlier phases, so IF NOT EXISTS keeps the
-- migration idempotent across environments.

ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS hr_rest INT,
  ADD COLUMN IF NOT EXISTS strength_recommendations_optin BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS roast_enabled BOOLEAN NOT NULL DEFAULT false;

-- Add the hr_rest CHECK constraint only if the column was just added (or if it
-- exists but has no constraint yet). DO block is the cleanest cross-env path.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'athletes_hr_rest_range'
  ) THEN
    ALTER TABLE athletes
      ADD CONSTRAINT athletes_hr_rest_range
      CHECK (hr_rest IS NULL OR (hr_rest BETWEEN 30 AND 90));
  END IF;
END $$;

-- ── strength_completions ────────────────────────────────────────────────────
-- One row per "Mark complete" tap. session_id is athlete-supplied (the F10
-- StrengthSessionDetail computes a stable id from pattern+phase+weekday); no
-- FK because the recommendation is computed each load, not persisted.
CREATE TABLE IF NOT EXISTS strength_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  perceived_rpe INT CHECK (perceived_rpe IS NULL OR (perceived_rpe BETWEEN 1 AND 10)),
  duration_minutes INT CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS strength_completions_athlete_idx
  ON strength_completions(athlete_id, completed_at DESC);

ALTER TABLE strength_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "strength_completions_own" ON strength_completions;
CREATE POLICY "strength_completions_own" ON strength_completions
  FOR ALL
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());
