-- EnduranceIQ Phase 2.1 — T10 Strava per-km HR streams
-- Adds hr_per_km JSONB + fetch-state columns to workouts.
-- Refs: PHASE-2.1-BUILD.md §6 T10 step 1.

ALTER TABLE workouts
  ADD COLUMN IF NOT EXISTS hr_per_km JSONB,
  ADD COLUMN IF NOT EXISTS streams_fetched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS streams_status TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workouts_streams_status_check'
  ) THEN
    ALTER TABLE workouts
      ADD CONSTRAINT workouts_streams_status_check
      CHECK (
        streams_status IS NULL
        OR streams_status IN ('pending', 'fetched', 'unavailable', 'failed')
      );
  END IF;
END $$;

-- Index for the backfill query (find run workouts that need streams)
CREATE INDEX IF NOT EXISTS workouts_streams_status_idx
  ON workouts(athlete_id, started_at DESC)
  WHERE streams_status IS NULL OR streams_status = 'pending';
