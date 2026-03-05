-- Add image_source column to track provenance for attribution and cleanup
ALTER TABLE wines ADD COLUMN IF NOT EXISTS image_source TEXT;

-- Backfill image_source from existing image_url patterns
UPDATE wines SET image_source = 'vivino'
  WHERE image_url ILIKE '%vivino.com%' AND image_source IS NULL;

UPDATE wines SET image_source = 'wine-searcher'
  WHERE image_url ILIKE '%wine-searcher.net%' AND image_source IS NULL;

UPDATE wines SET image_source = 'selfhosted'
  WHERE image_url ILIKE '%supabase%wine-images%' AND image_source IS NULL;
