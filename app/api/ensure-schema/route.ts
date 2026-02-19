import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CELLAR_RACKS_SQL = `
CREATE TABLE IF NOT EXISTS cellar_racks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE cellar_racks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cellar_racks' AND policyname = 'Users can view own racks') THEN
    CREATE POLICY "Users can view own racks" ON cellar_racks FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cellar_racks' AND policyname = 'Users can insert own racks') THEN
    CREATE POLICY "Users can insert own racks" ON cellar_racks FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cellar_racks' AND policyname = 'Users can update own racks') THEN
    CREATE POLICY "Users can update own racks" ON cellar_racks FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cellar_racks' AND policyname = 'Users can delete own racks') THEN
    CREATE POLICY "Users can delete own racks" ON cellar_racks FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cellar_racks_user_id ON cellar_racks(user_id);
`;

const SLOT_ID_SQL = `
ALTER TABLE cellar_items ADD COLUMN IF NOT EXISTS slot_id TEXT;
CREATE INDEX IF NOT EXISTS idx_cellar_items_slot_id ON cellar_items(slot_id);
`;

async function runMigrations(): Promise<{ success: boolean; message: string }> {
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    return {
      success: false,
      message: 'No DATABASE_URL configured. Add it to environment variables, or run the SQL manually in Supabase SQL Editor.',
    };
  }

  try {
    const postgres = (await import('postgres')).default;
    const sql = postgres(dbUrl, { max: 1, idle_timeout: 5 });

    await sql.unsafe(CELLAR_RACKS_SQL);
    await sql.unsafe(SLOT_ID_SQL);

    // Reload PostgREST schema cache so the new table/column is immediately available
    await sql.unsafe('NOTIFY pgrst, \'reload schema\'');

    await sql.end();
    return { success: true, message: 'Schema migrations applied successfully.' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[ensure-schema] Migration failed:', msg);
    return { success: false, message: `Migration error: ${msg}` };
  }
}

export async function POST() {
  const result = await runMigrations();

  if (!result.success) {
    return NextResponse.json({
      ...result,
      sql: {
        cellar_racks: CELLAR_RACKS_SQL.trim(),
        slot_id: SLOT_ID_SQL.trim(),
      },
    }, { status: result.message.includes('No DATABASE_URL') ? 400 : 500 });
  }

  return NextResponse.json(result);
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint to run schema migrations, or copy the SQL below and run it in the Supabase SQL Editor.',
    sql: {
      cellar_racks: CELLAR_RACKS_SQL.trim(),
      slot_id: SLOT_ID_SQL.trim(),
    },
  });
}
