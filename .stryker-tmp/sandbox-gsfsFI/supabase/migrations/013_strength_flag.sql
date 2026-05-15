-- Gate strength recommendations behind explicit opt-in until an S&C coach reviews them.
ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS strength_recommendations_optin BOOLEAN NOT NULL DEFAULT false;
