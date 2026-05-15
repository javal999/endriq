-- Intensity v2: TRIMP-weighted dual metric (shadow mode — no UI change yet).
ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS hr_rest INT;  -- nullable; user-entered or estimated

ALTER TABLE weekly_analyses
  ADD COLUMN IF NOT EXISTS pct_load_z1_2 NUMERIC(4,3),
  ADD COLUMN IF NOT EXISTS pct_load_z3   NUMERIC(4,3),
  ADD COLUMN IF NOT EXISTS pct_load_z4_5 NUMERIC(4,3),
  ADD COLUMN IF NOT EXISTS intensity_v2_meta JSONB;
  -- intensity_v2_meta shape: {hr_rest_used, model: "banister_karvonen"|"karvonen_approx", total_trimp, warnings}
