-- Global app settings (single-row configuration table)
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  premium_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed with default row (premium OFF at launch)
INSERT INTO app_settings (premium_enabled) VALUES (false)
ON CONFLICT DO NOTHING;

-- RLS: only admins can modify, anyone authenticated can read
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read app settings" ON app_settings
  FOR SELECT USING (auth.role() = 'authenticated');

-- Per-user premium tier
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'free'
  CHECK (subscription_tier IN ('free', 'premium'));
