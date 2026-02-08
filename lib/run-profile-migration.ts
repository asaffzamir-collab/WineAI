/**
 * Drops FK constraints on taste_profiles and wine_tastings so mock/test user IDs work.
 * Call when profile upsert fails with a foreign key violation.
 * Requires DATABASE_URL or SUPABASE_DB_URL in env (Supabase: Settings → Database → Connection string).
 */
let ran = false;

export async function runProfileMigrationIfNeeded(): Promise<boolean> {
  const url = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!url || ran) return ran;

  try {
    const postgres = (await import('postgres')).default;
    const sql = postgres(url, { max: 1 });
    await sql.unsafe('ALTER TABLE taste_profiles DROP CONSTRAINT IF EXISTS taste_profiles_user_id_fkey');
    await sql.unsafe('ALTER TABLE wine_tastings DROP CONSTRAINT IF EXISTS wine_tastings_user_id_fkey');
    await sql.end();
    ran = true;
    console.log('Profile migration (drop FKs) completed.');
    return true;
  } catch (e) {
    console.error('Profile migration failed:', e);
    return false;
  }
}

export function isLikelyFkError(message: string): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return m.includes('foreign key') || m.includes('violates foreign key') || m.includes('23503');
}
