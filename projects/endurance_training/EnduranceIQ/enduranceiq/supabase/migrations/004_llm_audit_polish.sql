-- Phase 1.1 polish — weekly narrative provenance + richer LLM audit rows

ALTER TABLE weekly_analyses
  ADD COLUMN IF NOT EXISTS llm_weekly_from_api BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE llm_audit_log
  ADD COLUMN IF NOT EXISTS input_data JSONB,
  ADD COLUMN IF NOT EXISTS output_text TEXT,
  ADD COLUMN IF NOT EXISTS validation_passed BOOLEAN,
  ADD COLUMN IF NOT EXISTS validation_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_llm_audit_created ON llm_audit_log (created_at);
