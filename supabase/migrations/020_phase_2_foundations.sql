-- EnduranceIQ Phase 2.0 — Foundations
-- Adds: athletes.persona, monthly_llm_calls_*, quota_reset_at
--       + decrement_llm_quota() RPC for atomic quota check + decrement
-- Refs: PHASE-2.0-ARCHITECTURE.md §2.2, §5.3; PHASE-2.0-BUILD.md T01 (M1)
--
-- Backwards-compatible: every column has a DEFAULT so existing rows keep working.

ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS persona TEXT NOT NULL DEFAULT 'self_coached'
    CHECK (persona IN ('coached', 'self_coached', 'hybrid')),
  ADD COLUMN IF NOT EXISTS monthly_llm_calls_quota INT NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS monthly_llm_calls_used INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quota_reset_at TIMESTAMPTZ NOT NULL
    DEFAULT date_trunc('month', now()) + interval '1 month';

-- Atomic quota check + decrement.
-- Resets counters if quota_reset_at has passed, then conditionally increments.
-- Returns (allowed, remaining) so callers can branch without a second round-trip.
CREATE OR REPLACE FUNCTION decrement_llm_quota(
  p_athlete_id UUID,
  p_cost INT
)
RETURNS TABLE (allowed BOOLEAN, remaining INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quota INT;
  v_used INT;
  v_reset_at TIMESTAMPTZ;
BEGIN
  IF p_cost < 0 THEN
    RAISE EXCEPTION 'p_cost must be >= 0';
  END IF;

  SELECT monthly_llm_calls_quota, monthly_llm_calls_used, quota_reset_at
    INTO v_quota, v_used, v_reset_at
    FROM athletes
    WHERE id = p_athlete_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'athlete % not found', p_athlete_id;
  END IF;

  -- Roll the window if we've crossed the monthly boundary.
  IF v_reset_at <= now() THEN
    v_used := 0;
    v_reset_at := date_trunc('month', now()) + interval '1 month';
  END IF;

  IF v_used + p_cost > v_quota THEN
    UPDATE athletes
      SET monthly_llm_calls_used = v_used,
          quota_reset_at = v_reset_at
      WHERE id = p_athlete_id;
    RETURN QUERY SELECT false, GREATEST(v_quota - v_used, 0);
    RETURN;
  END IF;

  UPDATE athletes
    SET monthly_llm_calls_used = v_used + p_cost,
        quota_reset_at = v_reset_at
    WHERE id = p_athlete_id;

  RETURN QUERY SELECT true, GREATEST(v_quota - (v_used + p_cost), 0);
END;
$$;

REVOKE ALL ON FUNCTION decrement_llm_quota(UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decrement_llm_quota(UUID, INT) TO service_role;
