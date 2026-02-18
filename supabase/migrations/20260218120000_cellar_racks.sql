-- Rack configurations (JSONB stores the full rack object)
CREATE TABLE IF NOT EXISTS cellar_racks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE cellar_racks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own racks" ON cellar_racks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own racks" ON cellar_racks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own racks" ON cellar_racks
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own racks" ON cellar_racks
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_cellar_racks_user_id ON cellar_racks(user_id);
