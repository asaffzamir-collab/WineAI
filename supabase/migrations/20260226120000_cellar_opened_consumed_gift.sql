-- Add opened_at, consumed_at, and is_gift columns to cellar_items
ALTER TABLE cellar_items ADD COLUMN IF NOT EXISTS opened_at timestamptz;
ALTER TABLE cellar_items ADD COLUMN IF NOT EXISTS consumed_at timestamptz;
ALTER TABLE cellar_items ADD COLUMN IF NOT EXISTS is_gift boolean DEFAULT false;
