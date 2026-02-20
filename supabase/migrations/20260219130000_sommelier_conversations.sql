-- Persistent sommelier chat conversations
CREATE TABLE IF NOT EXISTS sommelier_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sommelier_conversations_user
  ON sommelier_conversations(user_id, updated_at DESC);

ALTER TABLE sommelier_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations" ON sommelier_conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations" ON sommelier_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON sommelier_conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" ON sommelier_conversations
  FOR DELETE USING (auth.uid() = user_id);
