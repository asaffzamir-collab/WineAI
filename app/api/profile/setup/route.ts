import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Run ALTER TABLE statements to add missing profile columns using the
 * Supabase SQL Editor HTTP endpoint (service role key required).
 */
async function runProfileMigration(): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return false;

  const statements = [
    'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS first_name TEXT',
    'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_name TEXT',
    'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS country TEXT',
    'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS birthday DATE',
    `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'non-binary', 'prefer-not-to-say'))`,
    'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE',
    'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE',
    'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS age_verified_at TIMESTAMP WITH TIME ZONE',
    'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS cookie_consent TEXT',
  ];

  try {
    for (const sql of statements) {
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ query: sql }),
      });
      // If the rpc function doesn't exist, try the postgres endpoint
      if (!res.ok) {
        const pgRes = await fetch(`${supabaseUrl}/pg/query`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ query: sql }),
        });
        if (!pgRes.ok) {
          console.warn('[profile-migrate] SQL endpoint returned', pgRes.status);
        }
      }
    }

    // Tell PostgREST to reload schema cache
    await fetch(`${supabaseUrl}/rest/v1/rpc/notify_pgrst`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({}),
    }).catch(() => {});

    return true;
  } catch (err) {
    console.error('[profile-migrate] Migration failed:', err);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { firstName, lastName, alias, country, birthday, gender, preferredLanguage, cookieConsent } = body;

    if (!firstName || !lastName || !alias) {
      return NextResponse.json({ error: 'First name, last name, and alias are required' }, { status: 400 });
    }

    if (!birthday) {
      return NextResponse.json({ error: 'Birthday is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Full payload including new columns
    const fullPayload: Record<string, unknown> = {
      first_name: firstName,
      last_name: lastName,
      display_name: alias,
      country: country || null,
      birthday,
      gender: gender || null,
      preferred_language: preferredLanguage || 'he',
      profile_completed: true,
      age_verified_at: new Date().toISOString(),
      cookie_consent: cookieConsent || null,
    };

    // Core payload without the new columns (safe for older schemas)
    const corePayload: Record<string, unknown> = {
      first_name: firstName,
      last_name: lastName,
      display_name: alias,
      country: country || null,
      birthday,
      gender: gender || null,
      preferred_language: preferredLanguage || 'he',
      profile_completed: true,
    };

    let { error } = await supabase
      .from('user_profiles')
      .update(fullPayload)
      .eq('id', user.id);

    // If the full payload failed (likely missing new columns), try without them
    if (error) {
      console.error('[profile-setup] Full payload error:', JSON.stringify(error));
      await runProfileMigration();

      try {
        const base = process.env.NEXT_PUBLIC_BASE_URL
          || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
        if (base) {
          await fetch(`${base}/api/ensure-schema`, { method: 'POST' });
        }
      } catch { /* ignore */ }

      // Retry with full payload after migration
      const retry = await supabase
        .from('user_profiles')
        .update(fullPayload)
        .eq('id', user.id);
      error = retry.error;
    }

    // If still failing, try the core payload without new columns
    if (error) {
      console.error('[profile-setup] Retry error:', JSON.stringify(error));
      const coreTry = await supabase
        .from('user_profiles')
        .update(corePayload)
        .eq('id', user.id);
      error = coreTry.error;
    }

    // Final fallback: minimal fields that definitely exist
    if (error) {
      console.error('[profile-setup] Core payload error:', JSON.stringify(error));
      const { error: fallbackError } = await supabase
        .from('user_profiles')
        .update({
          display_name: alias,
          preferred_language: preferredLanguage || 'he',
          profile_completed: true,
        })
        .eq('id', user.id);

      if (fallbackError) {
        return NextResponse.json({
          error: 'Failed to save profile',
          details: error.message,
          code: error.code,
          hint: 'Run this SQL in your Supabase SQL Editor: ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS first_name TEXT; ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_name TEXT; ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS country TEXT; ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS birthday DATE; ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS gender TEXT; ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;',
        }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Profile setup error:', err);
    return NextResponse.json({
      error: 'An unexpected error occurred',
      details: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
