-- Add slot_id to cellar_items for rack placement tracking
ALTER TABLE cellar_items
ADD COLUMN IF NOT EXISTS slot_id TEXT;

CREATE INDEX IF NOT EXISTS idx_cellar_items_slot_id ON cellar_items(slot_id);
