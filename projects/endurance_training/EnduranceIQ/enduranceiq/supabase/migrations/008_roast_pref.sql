-- Opt-in for sarcastic "Roast" mode on weekly LLM narrative.
-- Off by default; shown only to athletes who explicitly enable it.
ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS roast_enabled BOOLEAN NOT NULL DEFAULT false;

-- Cached roast narrative (generated in parallel with coach narrative).
ALTER TABLE weekly_analyses
  ADD COLUMN IF NOT EXISTS llm_weekly_analysis_roast TEXT;
