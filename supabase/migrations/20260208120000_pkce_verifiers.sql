-- PKCE code verifiers: server-side store for OAuth flow (read by callback via service role).
-- Run in Supabase Dashboard → SQL Editor if you don't use Supabase CLI.
-- Rows are deleted after use or after 15 minutes.
CREATE TABLE IF NOT EXISTS pkce_verifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_verifier TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Optional: index for cleanup of old rows (created_at)
CREATE INDEX IF NOT EXISTS idx_pkce_verifiers_created_at ON pkce_verifiers (created_at);

COMMENT ON TABLE pkce_verifiers IS 'Temporary PKCE code verifiers for OAuth; only accessed by backend with service role.';
