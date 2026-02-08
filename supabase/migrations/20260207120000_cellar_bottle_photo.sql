-- Add optional user photo of the bottle for cellar items
ALTER TABLE cellar_items
ADD COLUMN IF NOT EXISTS bottle_photo_url TEXT;
