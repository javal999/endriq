-- EnduranceIQ Phase 2.0 — F13 public coach view
-- Adds: coach_links table; RLS (athlete-scoped INSERT/UPDATE/DELETE);
--       public-readable get_coach_view() SECURITY DEFINER function that
--       returns first_name + week_data WITHOUT exposing email / last_name.
-- Refs: PHASE-2.0-PRD-FINAL.md §5.6 F13; PHASE-2.0-BUILD.md T13 (M5);
--       PHASE-2.0-ARCHITECTURE.md §3.4 path C.
--
-- Critical security posture: the SECURITY DEFINER function is the ONLY
-- read path that bypasses RLS, and it returns a strict subset of fields.
-- Smoke tests in src/lib/coach-links.smoke.test.ts pin the privacy contract.

CREATE TABLE IF NOT EXISTS coach_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '90 days',
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS coach_links_athlete_idx
  ON coach_links(athlete_id, created_at DESC);

CREATE INDEX IF NOT EXISTS coach_links_active_idx
  ON coach_links(id) WHERE revoked_at IS NULL;

ALTER TABLE coach_links ENABLE ROW LEVEL SECURITY;

-- Athletes can CRUD their own rows; nothing else.
DROP POLICY IF EXISTS "coach_links_own" ON coach_links;
CREATE POLICY "coach_links_own" ON coach_links
  FOR ALL
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

-- ── Public-read SECURITY DEFINER function ───────────────────────────────────
-- Returns a strict subset of athlete + weekly_analyses fields. Specifically
-- does NOT expose email, last_name, demographic data, or per-session
-- raw HR. Coach view consumes this function via the admin client; no
-- other route should call it.
--
-- Returns rows for the current week + the trailing 8 weeks (9 total)
-- when the link is active; empty result set when expired/revoked.
CREATE OR REPLACE FUNCTION get_coach_view(link_uuid UUID)
RETURNS TABLE (
  athlete_first_name TEXT,
  week_start DATE,
  total_distance_meters NUMERIC,
  total_duration_seconds INT,
  pct_zone1_2 NUMERIC,
  pct_zone3 NUMERIC,
  pct_zone4_5 NUMERIC,
  acute_load NUMERIC,
  chronic_load NUMERIC,
  load_ratio NUMERIC,
  llm_weekly_analysis TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_athlete_id UUID;
BEGIN
  -- Look up the link; only return data when the link is active.
  SELECT cl.athlete_id INTO v_athlete_id
  FROM coach_links cl
  WHERE cl.id = link_uuid
    AND cl.revoked_at IS NULL
    AND cl.expires_at > now()
  LIMIT 1;

  IF v_athlete_id IS NULL THEN
    -- Empty result set — caller distinguishes "valid link with no data"
    -- from "no link" via a separate get_coach_link_status() call.
    RETURN;
  END IF;

  RETURN QUERY
    SELECT
      -- Strip last_name + email — first name only (split on first space).
      COALESCE(split_part(a.name, ' ', 1), 'Athlete')::TEXT AS athlete_first_name,
      wa.week_start,
      wa.total_distance_meters,
      wa.total_duration_seconds,
      wa.pct_zone1_2,
      wa.pct_zone3,
      wa.pct_zone4_5,
      wa.acute_load,
      wa.chronic_load,
      wa.load_ratio,
      wa.llm_weekly_analysis
    FROM weekly_analyses wa
    JOIN athletes a ON a.id = wa.athlete_id
    WHERE wa.athlete_id = v_athlete_id
    ORDER BY wa.week_start DESC
    LIMIT 9;
END $$;

REVOKE ALL ON FUNCTION get_coach_view(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_coach_view(UUID) TO service_role;

-- Companion: link status check so /coach/[uuid] can render the right
-- "expired" / "revoked" / "not found" copy without revealing whether
-- the link ever existed.
CREATE OR REPLACE FUNCTION get_coach_link_status(link_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
BEGIN
  SELECT revoked_at, expires_at INTO v_row
  FROM coach_links WHERE id = link_uuid;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF v_row.revoked_at IS NOT NULL THEN RETURN 'revoked'; END IF;
  IF v_row.expires_at <= now() THEN RETURN 'expired'; END IF;
  RETURN 'active';
END $$;

REVOKE ALL ON FUNCTION get_coach_link_status(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_coach_link_status(UUID) TO service_role;
