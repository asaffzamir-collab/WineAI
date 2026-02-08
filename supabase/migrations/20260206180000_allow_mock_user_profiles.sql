-- Allow taste_profiles and wine_tastings to work with any user_id (e.g. dev/mock user).
-- FK to auth.users blocks inserts when user_id is not in auth.users.
-- Run in Supabase SQL Editor: Dashboard → SQL Editor → New query → paste → Run.
ALTER TABLE taste_profiles DROP CONSTRAINT IF EXISTS taste_profiles_user_id_fkey;
ALTER TABLE wine_tastings DROP CONSTRAINT IF EXISTS wine_tastings_user_id_fkey;
