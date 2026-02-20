-- Trigram indexes for fuzzy text search on wines (used by wine-cache.ts ilike queries)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_wines_name_trgm ON wines USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_wines_winery_trgm ON wines USING gin (winery gin_trgm_ops);

-- Ensure sommelier_profiles has an index on user_id (for quick profile lookups)
CREATE INDEX IF NOT EXISTS idx_sommelier_profiles_user_id ON sommelier_profiles(user_id);
