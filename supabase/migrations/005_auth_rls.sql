-- Phase 1.2 — replace permissive RLS with auth.uid()-scoped policies

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
