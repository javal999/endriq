-- Add encrypted token columns alongside existing plaintext columns.
-- Plaintext columns are kept during transition; drop them after running scripts/encrypt-tokens.ts.
ALTER TABLE oauth_connections
  ADD COLUMN IF NOT EXISTS access_token_enc  TEXT,
  ADD COLUMN IF NOT EXISTS refresh_token_enc TEXT;

-- After the backfill script has populated _enc for all rows and you've
-- verified the application reads correctly, run:
--   ALTER TABLE oauth_connections DROP COLUMN access_token;
--   ALTER TABLE oauth_connections DROP COLUMN refresh_token;
