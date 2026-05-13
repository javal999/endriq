-- Track whether the athlete has completed the onboarding form.
-- Existing rows default to false; set to true after onboarding submit.
ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT false;
