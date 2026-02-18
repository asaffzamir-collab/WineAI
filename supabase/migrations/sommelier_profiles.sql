-- Sommelier Profiles table
CREATE TABLE IF NOT EXISTS sommelier_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  phase TEXT DEFAULT 'discovery' CHECK (phase IN ('discovery', 'learning', 'personalization')),
  discovery_data JSONB DEFAULT '{}',
  occasions TEXT[] DEFAULT '{}',
  taste_precision INTEGER DEFAULT 0 CHECK (taste_precision >= 0 AND taste_precision <= 100),
  engagement_events JSONB DEFAULT '[]',
  tonight_mode_history JSONB DEFAULT '[]',
  conversation_history JSONB DEFAULT '[]',
  last_interaction TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE sommelier_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sommelier profile" ON sommelier_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sommelier profile" ON sommelier_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sommelier profile" ON sommelier_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_sommelier_profiles_user_id ON sommelier_profiles(user_id);
