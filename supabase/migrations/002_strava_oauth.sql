-- Strava OAuth tokens — readable/writable only via Supabase service role from server routes (no RLS policies).
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

-- Dedupe Strava imports by activity id (source_id must be set for Strava rows).
CREATE UNIQUE INDEX idx_workouts_strava_source
    ON workouts (athlete_id, source_id)
    WHERE source = 'strava' AND source_id IS NOT NULL;
