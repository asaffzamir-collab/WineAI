-- Allow cellar_items and wishlist_items to work with any user_id (e.g. dev/mock user).
-- FK to auth.users blocks inserts when user_id is not in auth.users.
-- Run in Supabase SQL Editor if not using migrations: Dashboard → SQL Editor → paste → Run.
ALTER TABLE cellar_items DROP CONSTRAINT IF EXISTS cellar_items_user_id_fkey;
ALTER TABLE wishlist_items DROP CONSTRAINT IF EXISTS wishlist_items_user_id_fkey;
