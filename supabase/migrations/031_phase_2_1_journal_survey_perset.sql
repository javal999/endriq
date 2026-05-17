-- EnduranceIQ Phase 2.1 — combined T07 + T08 + T09 migration
-- T07: daily_journal_tags  — WHOOP-style 3-question daily check-in
-- T08: strength_completions.post_session_feel  — TrainerRoad-style survey
-- T09: strength_set_logs  — Hevy-style per-set logging
--
-- Batched into one migration to keep the Phase 2.1 deploy surface small
-- (T07/T08/T09 all gate on G1; one migration = one production change).
-- Refs: PHASE-2.1-BUILD.md §6 T07/T08/T09; PHASE-2.1-PRD-FINAL.md.

-- ── T07: daily_journal_tags ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_journal_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL,
  slept_well BOOLEAN,
  travelling BOOLEAN,
  stressed BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (athlete_id, check_in_date)
);

CREATE INDEX IF NOT EXISTS daily_journal_tags_athlete_date_idx
  ON daily_journal_tags(athlete_id, check_in_date DESC);

ALTER TABLE daily_journal_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_journal_tags_own" ON daily_journal_tags;
CREATE POLICY "daily_journal_tags_own" ON daily_journal_tags
  FOR ALL
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

-- ── T08: post-session feel on strength_completions ─────────────────────────
ALTER TABLE strength_completions
  ADD COLUMN IF NOT EXISTS post_session_feel TEXT;

-- Add CHECK only if not present (idempotent across environments)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'strength_completions_post_session_feel_check'
  ) THEN
    ALTER TABLE strength_completions
      ADD CONSTRAINT strength_completions_post_session_feel_check
      CHECK (
        post_session_feel IS NULL
        OR post_session_feel IN ('easier_than_expected', 'right', 'harder_than_expected')
      );
  END IF;
END $$;

-- ── T09: strength_set_logs ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS strength_set_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  completion_id UUID REFERENCES strength_completions(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  set_number INT NOT NULL CHECK (set_number BETWEEN 1 AND 20),
  weight_kg NUMERIC(6,2) CHECK (weight_kg IS NULL OR weight_kg >= 0),
  reps INT CHECK (reps IS NULL OR (reps BETWEEN 0 AND 200)),
  rpe NUMERIC(3,1) CHECK (rpe IS NULL OR (rpe BETWEEN 1 AND 10)),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (completion_id, exercise_id, set_number)
);

CREATE INDEX IF NOT EXISTS strength_set_logs_athlete_idx
  ON strength_set_logs(athlete_id, logged_at DESC);

CREATE INDEX IF NOT EXISTS strength_set_logs_completion_idx
  ON strength_set_logs(completion_id);

ALTER TABLE strength_set_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "strength_set_logs_own" ON strength_set_logs;
CREATE POLICY "strength_set_logs_own" ON strength_set_logs
  FOR ALL
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());
