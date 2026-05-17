-- EnduranceIQ Phase 2.0 — F11 nightly recovery check-in
-- Adds: recovery_check_in table with RLS.
-- Refs: PHASE-2.0-PRD-FINAL.md §5.4 F11; PHASE-2.0-BUILD.md T12 (M6).
--
-- One row per athlete per calendar day. Unique constraint enforces
-- idempotent upserts when the athlete taps Sharp / Okay / Tired more
-- than once on the same evening.

CREATE TABLE IF NOT EXISTS recovery_check_in (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL,
  feeling TEXT NOT NULL CHECK (feeling IN ('sharp', 'okay', 'tired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (athlete_id, check_in_date)
);

CREATE INDEX IF NOT EXISTS recovery_check_in_athlete_idx
  ON recovery_check_in(athlete_id, check_in_date DESC);

ALTER TABLE recovery_check_in ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recovery_check_in_own" ON recovery_check_in;
CREATE POLICY "recovery_check_in_own" ON recovery_check_in
  FOR ALL
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());
