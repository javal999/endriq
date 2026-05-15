-- LLM output feedback (thumbs up / down) from authenticated athletes

CREATE TABLE IF NOT EXISTS llm_feedback (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id    UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  week_start    DATE NOT NULL,
  prompt_type   TEXT NOT NULL CHECK (prompt_type IN ('weekly_analysis', 'intensity_explanation', 'session_statuses')),
  rating        SMALLINT NOT NULL CHECK (rating IN (-1, 1)),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One vote per athlete × week × prompt_type; upsert updates rating + timestamp
CREATE UNIQUE INDEX IF NOT EXISTS llm_feedback_unique
  ON llm_feedback (athlete_id, week_start, prompt_type);

ALTER TABLE llm_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "athletes manage own feedback"
  ON llm_feedback
  FOR ALL
  USING  (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());
