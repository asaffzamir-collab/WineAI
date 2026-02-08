#!/usr/bin/env node
/**
 * Runs the profile migration (drops FK on taste_profiles and wine_tastings).
 * Loads .env.local from project root so DATABASE_URL or SUPABASE_DB_URL is used.
 *
 * One-time: Get your connection string from Supabase Dashboard → Project Settings → Database → Connection string (URI).
 * Add to .env.local: DATABASE_URL="postgresql://postgres.[ref]:[YOUR-PASSWORD]@..."
 * Then: node scripts/run-profile-migration.mjs
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
if (!url) {
  console.error('Missing DATABASE_URL or SUPABASE_DB_URL.');
  console.error('Add it to .env.local from Supabase Dashboard → Project Settings → Database → Connection string (URI).');
  process.exit(1);
}

async function main() {
  const postgres = (await import('postgres')).default;
  const sql = postgres(url, { max: 1 });
  try {
    await sql.unsafe('ALTER TABLE taste_profiles DROP CONSTRAINT IF EXISTS taste_profiles_user_id_fkey');
    await sql.unsafe('ALTER TABLE wine_tastings DROP CONSTRAINT IF EXISTS wine_tastings_user_id_fkey');
    console.log('Profile migration completed. Add-to-profile should work now.');
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
