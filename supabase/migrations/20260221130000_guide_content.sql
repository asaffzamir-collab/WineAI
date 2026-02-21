-- Dynamic guide content table for auto-generated FAQ and feature descriptions
CREATE TABLE IF NOT EXISTS guide_content (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('faq', 'features')),
  locale text NOT NULL DEFAULT 'en',
  content jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (type, locale)
);

ALTER TABLE guide_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read guide content"
  ON guide_content FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage guide content"
  ON guide_content FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE INDEX idx_guide_content_type_locale ON guide_content (type, locale);
