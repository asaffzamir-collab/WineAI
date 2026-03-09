-- Enable Row Level Security on pkce_verifiers.
-- No policies are added: this denies all access for anon/authenticated roles.
-- The service role (used by lib/pkce-store.ts) always bypasses RLS.
ALTER TABLE public.pkce_verifiers ENABLE ROW LEVEL SECURITY;
