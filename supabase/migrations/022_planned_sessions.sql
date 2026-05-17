-- EnduranceIQ Phase 2.0 — F9 typical-week pattern + planned-session overrides
-- Adds: athletes.typical_week_pattern JSONB; planned_sessions table; RLS.
--       (onboarding_complete already exists from Phase 1.3 — IF NOT EXISTS is safe.)
-- Refs: PHASE-2.0-PRD-FINAL.md §5.2 F9; PHASE-2.0-BUILD.md T07 (M3);
--       PHASE-2.0-ARCHITECTURE.md §2.1.

-- ── athletes columns ─────────────────────────────────────────────────────────
ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS typical_week_pattern JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT false;

-- ── planned_sessions table ───────────────────────────────────────────────────
-- Per-date overrides to the typical-week pattern. The sessions JSONB array
-- mirrors the shape of typical_week_pattern[].sessions.
--
-- interpretation_json caches the F8 interpretRun output for the session's
-- coach_instruction_text so reopening the day shows identical numbers
-- (PRD §5.1 AC6).
CREATE TABLE IF NOT EXISTS planned_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  planned_date DATE NOT NULL,
  sessions JSONB NOT NULL DEFAULT '[]'::jsonb,
  interpretation_json JSONB,
  coach_instruction_text TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (athlete_id, planned_date)
);

CREATE INDEX IF NOT EXISTS planned_sessions_athlete_date_idx
  ON planned_sessions(athlete_id, planned_date);

ALTER TABLE planned_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "planned_sessions_own" ON planned_sessions;
CREATE POLICY "planned_sessions_own" ON planned_sessions
  FOR ALL
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

-- Auto-bump updated_at on UPDATE (matches the pattern used elsewhere).
CREATE OR REPLACE FUNCTION planned_sessions_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS planned_sessions_updated_at ON planned_sessions;
CREATE TRIGGER planned_sessions_updated_at
  BEFORE UPDATE ON planned_sessions
  FOR EACH ROW EXECUTE FUNCTION planned_sessions_touch_updated_at();
