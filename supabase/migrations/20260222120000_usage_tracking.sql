-- Monthly usage counters per user (one row per user per month)
CREATE TABLE IF NOT EXISTS monthly_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,  -- format: '2026-02'
  wine_searches INTEGER NOT NULL DEFAULT 0,
  pier_messages INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_usage_user_month ON monthly_usage(user_id, month);

ALTER TABLE monthly_usage ENABLE ROW LEVEL SECURITY;

-- Users can read their own usage
CREATE POLICY "Users can read own usage" ON monthly_usage
  FOR SELECT USING (auth.uid() = user_id);

-- Service role handles inserts/updates (via API routes)
