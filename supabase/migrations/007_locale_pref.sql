-- Persist athlete's preferred locale to survive session changes.
ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS preferred_locale TEXT DEFAULT 'en'
  CHECK (preferred_locale IN ('en', 'id'));

-- LLM outputs cached in both languages (null = not yet generated in that locale).
ALTER TABLE weekly_analyses
  ADD COLUMN IF NOT EXISTS llm_weekly_analysis_id TEXT,
  ADD COLUMN IF NOT EXISTS llm_intensity_explanation_id TEXT,
  ADD COLUMN IF NOT EXISTS llm_session_statuses_id JSONB;
