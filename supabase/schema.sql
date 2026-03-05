-- WineJourney Database Schema
-- Run this in your Supabase SQL Editor

-- No need for uuid-ossp extension, using built-in gen_random_uuid()

-- User Profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  display_name TEXT,
  country TEXT,
  birthday DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'non-binary', 'prefer-not-to-say')),
  preferred_language TEXT DEFAULT 'en' CHECK (preferred_language IN ('he', 'en')),
  preferred_currency TEXT DEFAULT 'ILS',
  profile_completed BOOLEAN DEFAULT FALSE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  terms_accepted_at TIMESTAMP WITH TIME ZONE,
  age_verified_at TIMESTAMP WITH TIME ZONE,
  cookie_consent TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add is_admin column if it doesn't exist (for existing databases)
-- ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Taste Profiles table
CREATE TABLE IF NOT EXISTS taste_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  wine_type TEXT NOT NULL CHECK (wine_type IN ('red', 'white', 'rose')),
  profile_data JSONB DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, wine_type)
);

-- Enable RLS
ALTER TABLE taste_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for taste_profiles
CREATE POLICY "Users can view own taste profiles" ON taste_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own taste profiles" ON taste_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own taste profiles" ON taste_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Wines table (cached wine data from AI)
CREATE TABLE IF NOT EXISTS wines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  winery TEXT NOT NULL,
  vivino_rating DECIMAL(2,1),
  vivino_reviews INTEGER,
  country TEXT,
  region TEXT,
  grapes TEXT[],
  alcohol DECIMAL(4,1),
  wine_type TEXT CHECK (wine_type IN ('red', 'white', 'rose', 'sparkling', 'dessert')),
  tasting_notes JSONB,
  ai_description TEXT,
  image_url TEXT,
  image_source TEXT,
  taste_spectrum JSONB,
  serving JSONB,
  food_pairings TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE wines ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wines (publicly readable, admin writable)
CREATE POLICY "Wines are publicly readable" ON wines
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert wines" ON wines
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Cellar Items table
CREATE TABLE IF NOT EXISTS cellar_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  wine_id UUID REFERENCES wines(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER DEFAULT 1,
  purchase_price DECIMAL(10,2),
  purchase_date DATE,
  storage_location TEXT,
  drink_from DATE,
  drink_until DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE cellar_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cellar_items
CREATE POLICY "Users can view own cellar items" ON cellar_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cellar items" ON cellar_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cellar items" ON cellar_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cellar items" ON cellar_items
  FOR DELETE USING (auth.uid() = user_id);

-- Wishlist Items table
CREATE TABLE IF NOT EXISTS wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  wine_id UUID REFERENCES wines(id) ON DELETE CASCADE NOT NULL,
  priority INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wishlist_items
CREATE POLICY "Users can view own wishlist items" ON wishlist_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wishlist items" ON wishlist_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wishlist items" ON wishlist_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own wishlist items" ON wishlist_items
  FOR DELETE USING (auth.uid() = user_id);

-- Wine Tastings table (for profile updates)
CREATE TABLE IF NOT EXISTS wine_tastings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  wine_id UUID REFERENCES wines(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  tasted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE wine_tastings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wine_tastings
CREATE POLICY "Users can view own tastings" ON wine_tastings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tastings" ON wine_tastings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tastings" ON wine_tastings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tastings" ON wine_tastings
  FOR DELETE USING (auth.uid() = user_id);

-- Store Prices table
CREATE TABLE IF NOT EXISTS store_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wine_id UUID REFERENCES wines(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  store_name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'ILS',
  country TEXT DEFAULT 'Israel',
  availability TEXT,
  purchase_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE store_prices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for store_prices
CREATE POLICY "Store prices are publicly readable" ON store_prices
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert store prices" ON store_prices
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own store prices" ON store_prices
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own store prices" ON store_prices
  FOR DELETE USING (auth.uid() = user_id);

-- Wine Match Cache table (persists AI-computed match results per user+wine)
CREATE TABLE IF NOT EXISTS wine_match_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  wine_key TEXT NOT NULL,
  match_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, wine_key)
);

ALTER TABLE wine_match_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own match cache" ON wine_match_cache
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own match cache" ON wine_match_cache
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own match cache" ON wine_match_cache
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own match cache" ON wine_match_cache
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cellar_items_user_id ON cellar_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_user_id ON wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_taste_profiles_user_id ON taste_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_wine_tastings_user_id ON wine_tastings(user_id);
CREATE INDEX IF NOT EXISTS idx_wines_name ON wines(name);
CREATE INDEX IF NOT EXISTS idx_wines_winery ON wines(winery);
CREATE INDEX IF NOT EXISTS idx_wine_match_cache_user ON wine_match_cache(user_id);
