-- Fresh Supabase project ONLY (empty DB). If athletes/workouts already exist,
-- do NOT run this file—you will get "relation already exists". Apply only new
-- numbered migrations under supabase/migrations/ instead (e.g. 003_llm_fields.sql).
--
-- Run this entire file once in Supabase → SQL Editor → New query → Run
-- (Combines 001 + 002 + 003 + seed for convenience.)

-- === 001_initial_schema.sql ===
-- EnduranceIQ Phase 0 — matches EnduranceIQ_Platform_Architecture Part 7
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE athletes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    birth_year INT,
    weight_kg NUMERIC(5,2),
    sex TEXT CHECK (sex IN ('male', 'female', 'other')),
    goal_race_type TEXT,
    goal_race_date DATE,
    goal_weekly_km NUMERIC(5,1),
    observed_max_hr INT,
    estimated_zone2_ceiling INT,
    timezone TEXT DEFAULT 'UTC',
    sharing_enabled BOOLEAN DEFAULT true,
    subscription_status TEXT DEFAULT 'free'
);

CREATE TABLE workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    source_id TEXT,
    sport_type TEXT NOT NULL,
    session_label TEXT,
    started_at TIMESTAMPTZ NOT NULL,
    duration_seconds INT NOT NULL,
    distance_meters NUMERIC(10,1),
    avg_hr INT,
    max_hr INT,
    avg_cadence INT,
    elevation_gain_meters NUMERIC(6,1),
    calories INT,
    total_sets INT,
    training_stress NUMERIC(6,2),
    hr_zone_distribution JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(athlete_id, source, started_at)
);

CREATE INDEX idx_workouts_athlete_date ON workouts(athlete_id, started_at);

CREATE TABLE weekly_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    total_distance_meters NUMERIC(10,1),
    total_duration_seconds INT,
    total_sessions INT,
    running_sessions INT,
    strength_sessions INT,
    pct_zone1_2 NUMERIC(4,3),
    pct_zone3 NUMERIC(4,3),
    pct_zone4_5 NUMERIC(4,3),
    acute_load NUMERIC(8,2),
    chronic_load NUMERIC(8,2),
    load_ratio NUMERIC(4,2),
    findings JSONB NOT NULL DEFAULT '[]',
    strength_recommendation JSONB,
    prev_week_distance NUMERIC(10,1),
    prev_week_load NUMERIC(8,2),
    month_avg_distance NUMERIC(10,1),
    month_avg_load NUMERIC(8,2),
    share_id UUID DEFAULT gen_random_uuid(),
    data_sources TEXT[],
    data_gaps TEXT[],
    generated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(athlete_id, week_start)
);

ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY athletes_all ON athletes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY workouts_all ON workouts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY weekly_analyses_all ON weekly_analyses FOR ALL USING (true) WITH CHECK (true);

-- === 002_strava_oauth.sql ===
CREATE TABLE oauth_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('strava')),
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    scope TEXT,
    external_athlete_id TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (athlete_id, provider)
);

ALTER TABLE oauth_connections ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_oauth_connections_athlete ON oauth_connections(athlete_id);

CREATE UNIQUE INDEX idx_workouts_strava_source
    ON workouts (athlete_id, source_id)
    WHERE source = 'strava' AND source_id IS NOT NULL;

-- === 003_llm_fields.sql ===
ALTER TABLE weekly_analyses
  ADD COLUMN IF NOT EXISTS llm_weekly_analysis TEXT,
  ADD COLUMN IF NOT EXISTS llm_intensity_explanation TEXT,
  ADD COLUMN IF NOT EXISTS llm_session_statuses JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS llm_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    prompt_type TEXT NOT NULL,
    input_tokens INT,
    output_tokens INT,
    model TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_llm_audit_athlete_week
    ON llm_audit_log (athlete_id, week_start);

ALTER TABLE llm_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY llm_audit_log_all ON llm_audit_log FOR ALL USING (true) WITH CHECK (true);

-- === 004_llm_audit_polish.sql ===
ALTER TABLE weekly_analyses
  ADD COLUMN IF NOT EXISTS llm_weekly_from_api BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE llm_audit_log
  ADD COLUMN IF NOT EXISTS input_data JSONB,
  ADD COLUMN IF NOT EXISTS output_text TEXT,
  ADD COLUMN IF NOT EXISTS validation_passed BOOLEAN,
  ADD COLUMN IF NOT EXISTS validation_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_llm_audit_created ON llm_audit_log (created_at);

-- === 005_auth_rls.sql ===
DROP POLICY IF EXISTS "athletes_all" ON athletes;
DROP POLICY IF EXISTS "workouts_all" ON workouts;
DROP POLICY IF EXISTS "weekly_analyses_all" ON weekly_analyses;
DROP POLICY IF EXISTS "llm_audit_log_all" ON llm_audit_log;

CREATE POLICY "athletes_own" ON athletes
  FOR ALL USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "workouts_own" ON workouts
  FOR ALL USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "weekly_analyses_own" ON weekly_analyses
  FOR ALL USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "oauth_connections_own" ON oauth_connections
  FOR ALL USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "llm_audit_own" ON llm_audit_log
  FOR ALL USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

-- === seed.sql ===
INSERT INTO athletes (id, email, name, birth_year, weight_kg, goal_race_type)
VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'levi@enduranceiq.local',
  'Levi',
  1996,
  72,
  'marathon'
)
ON CONFLICT (email) DO NOTHING;
