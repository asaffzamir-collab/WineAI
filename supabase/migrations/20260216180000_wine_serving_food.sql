-- Add serving info and food pairings to wines table
ALTER TABLE wines ADD COLUMN IF NOT EXISTS serving JSONB;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS food_pairings TEXT[];
