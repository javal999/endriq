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

-- Phase 0: permissive policies for single-user / bootstrap (replace before multi-tenant prod)
CREATE POLICY athletes_all ON athletes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY workouts_all ON workouts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY weekly_analyses_all ON weekly_analyses FOR ALL USING (true) WITH CHECK (true);
