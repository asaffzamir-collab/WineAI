-- Composite indexes for common query patterns

-- Cellar: check if user already has a specific wine
CREATE INDEX IF NOT EXISTS idx_cellar_items_user_wine ON cellar_items(user_id, wine_id);

-- Cellar: find wines expiring soon
CREATE INDEX IF NOT EXISTS idx_cellar_items_user_drink_until ON cellar_items(user_id, drink_until);

-- Wishlist: check if user already has a specific wine
CREATE INDEX IF NOT EXISTS idx_wishlist_items_user_wine ON wishlist_items(user_id, wine_id);

-- Tastings: check if user has tasted a specific wine
CREATE INDEX IF NOT EXISTS idx_wine_tastings_user_wine ON wine_tastings(user_id, wine_id);

-- Wines: lookup by name+winery pair
CREATE INDEX IF NOT EXISTS idx_wines_name_winery ON wines(name, winery);

-- Store prices: find prices for a wine
CREATE INDEX IF NOT EXISTS idx_store_prices_wine_id ON store_prices(wine_id);
