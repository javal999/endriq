-- Phase 1.1 — LLM explanation columns + audit trail (server-generated only)

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
