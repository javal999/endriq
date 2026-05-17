-- EnduranceIQ Phase 2.0 — F14.0 multi-race + primary race
-- Adds: races table; partial unique index for one-primary-per-athlete; RLS;
--       backfill from athletes.goal_race_type / goal_race_date.
-- Refs: PHASE-2.0-PRD-FINAL.md §5.7 F14.0; PHASE-2.0-BUILD.md T03 (M2);
--       PHASE-2.0-ARCHITECTURE.md §2.1.
--
-- Non-destructive: athletes.goal_race_* columns are retained as compatibility
-- shim per PRD ("dropped in Phase 2.1"). Backfill copies existing primary-race
-- intent into the new table without modifying the legacy columns.

CREATE TABLE IF NOT EXISTS races (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  race_type TEXT NOT NULL CHECK (race_type IN (
    'marathon',
    'half_marathon',
    '10k',
    '5k',
    'ultramarathon',
    'ironman_70_3',
    'ironman_full',
    'other_endurance'
  )),
  race_date DATE NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One-primary-per-athlete invariant enforced at the DB.
CREATE UNIQUE INDEX IF NOT EXISTS races_one_primary_per_athlete
  ON races(athlete_id)
  WHERE is_primary = true;

-- Common access pattern: list an athlete's races in chronological order.
CREATE INDEX IF NOT EXISTS races_athlete_date_idx
  ON races(athlete_id, race_date);

ALTER TABLE races ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "races_own" ON races;
CREATE POLICY "races_own" ON races
  FOR ALL
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

-- ── Backfill: legacy goal_race_* → races rows ───────────────────────────────
--
-- For every athlete with a future goal_race_date and a recognised race type,
-- create one race row flagged is_primary = true. Athletes whose legacy
-- goal_race_type is 'general_fitness' or NULL are skipped — they have no
-- specific race to anchor to. Past races are also skipped (they shouldn't
-- drive the countdown).
--
-- Idempotent guard: only inserts when the athlete has zero existing primary
-- race rows. Safe to re-run if the migration is replayed.

INSERT INTO races (athlete_id, name, race_type, race_date, is_primary)
SELECT
  a.id,
  CASE
    WHEN a.goal_race_type IN ('marathon', 'half_marathon', '10k', '5k',
                              'ultramarathon', 'ironman_70_3', 'ironman_full')
      THEN INITCAP(REPLACE(a.goal_race_type, '_', ' ')) || ' ' ||
           to_char(a.goal_race_date, 'YYYY-MM-DD')
    ELSE 'Race ' || to_char(a.goal_race_date, 'YYYY-MM-DD')
  END AS name,
  CASE
    WHEN a.goal_race_type IN ('marathon', 'half_marathon', '10k', '5k',
                              'ultramarathon', 'ironman_70_3', 'ironman_full')
      THEN a.goal_race_type
    ELSE 'other_endurance'
  END AS race_type,
  a.goal_race_date,
  true
FROM athletes a
WHERE a.goal_race_date IS NOT NULL
  AND a.goal_race_date >= CURRENT_DATE
  AND COALESCE(a.goal_race_type, '') <> 'general_fitness'
  AND NOT EXISTS (
    SELECT 1 FROM races r WHERE r.athlete_id = a.id AND r.is_primary = true
  );

-- Sanity check: COUNT of athletes with a future non-general-fitness race
-- should match COUNT of newly-inserted primary races. Replicate the verification
-- query from BUILD.md T03 step 2.
DO $$
DECLARE
  legacy_count INT;
  primary_count INT;
BEGIN
  SELECT COUNT(*) INTO legacy_count
    FROM athletes
    WHERE goal_race_date IS NOT NULL
      AND goal_race_date >= CURRENT_DATE
      AND COALESCE(goal_race_type, '') <> 'general_fitness';
  SELECT COUNT(*) INTO primary_count
    FROM races WHERE is_primary = true;
  IF primary_count < legacy_count THEN
    RAISE WARNING
      'Backfill mismatch: % legacy athletes vs % primary races. Investigate before T03 PR is merged.',
      legacy_count, primary_count;
  END IF;
END $$;
