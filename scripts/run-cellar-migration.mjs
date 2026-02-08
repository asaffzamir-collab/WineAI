#!/usr/bin/env node
/**
 * Runs the cellar/wishlist migration (drops FK on cellar_items and wishlist_items for demo user).
 * Loads .env.local from project root so DATABASE_URL or SUPABASE_DB_URL is used.
 *
 * Option A - Run this script:
 *   Add to .env.local: DATABASE_URL="postgresql://postgres.[ref]:[YOUR-PASSWORD]@..."
 *   (from Supabase Dashboard → Project Settings → Database → Connection string URI)
 *   Then: node scripts/run-cellar-migration.mjs
 *
 * Option B - Run in Supabase SQL Editor:
 *   Dashboard → SQL Editor → New query → paste the SQL below → Run
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const envPath = join(root, '.env.local');

if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (t && !t.startsWith('#')) {
      const i = t.indexOf('=');
      if (i > 0) {
        const key = t.slice(0, i).trim();
        let val = t.slice(i + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
          val = val.slice(1, -1);
        process.env[key] = val;
      }
    }
  }
}

const url = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

async function main() {
  if (url) {
    const postgres = (await import('postgres')).default;
    const sql = postgres(url, { max: 1 });
    try {
      await sql.unsafe('ALTER TABLE cellar_items DROP CONSTRAINT IF EXISTS cellar_items_user_id_fkey');
      await sql.unsafe('ALTER TABLE wishlist_items DROP CONSTRAINT IF EXISTS wishlist_items_user_id_fkey');
      console.log('Cellar/wishlist migration completed. Add to cellar and wishlist should work for the demo user.');
    } finally {
      await sql.end();
    }
    return;
  }

  console.error('No DATABASE_URL or SUPABASE_DB_URL in .env.local.');
  console.error('');
  console.error('Run this SQL manually in Supabase:');
  console.error('  Dashboard → SQL Editor → New query → paste → Run');
  console.error('');
  console.error('--- COPY BELOW ---');
  console.error(`
ALTER TABLE cellar_items DROP CONSTRAINT IF EXISTS cellar_items_user_id_fkey;
ALTER TABLE wishlist_items DROP CONSTRAINT IF EXISTS wishlist_items_user_id_fkey;
`);
  console.error('--- END ---');
  process.exit(1);
}

main().catch((e) => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
