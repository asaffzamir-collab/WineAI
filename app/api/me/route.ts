import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function tryEnsureSchema(): Promise<boolean> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const res = await fetch(`${base}/api/ensure-schema`, { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('onboarding_completed, profile_completed, display_name, gender')
    .eq('id', user.id)
    .single();

  // If profile_completed column doesn't exist yet, run migrations and retry
  if (profileError?.message?.includes('profile_completed')) {
    await tryEnsureSchema();
    const retry = await supabase
      .from('user_profiles')
      .select('onboarding_completed, profile_completed, display_name, gender')
      .eq('id', user.id)
      .single();
    if (retry.data) {
      profile = retry.data;
      profileError = null;
    } else {
      // Final fallback: query without the new columns
      const fallback = await supabase
        .from('user_profiles')
        .select('onboarding_completed, display_name')
        .eq('id', user.id)
        .single();
      profile = fallback.data ? { ...fallback.data, profile_completed: false, gender: null } : null;
      profileError = null;
    }
  }

  if (!profile) {
    const meta = user.user_metadata as { display_name?: string; terms_accepted_at?: string } | undefined;
    const displayName = meta?.display_name || user.email?.split('@')[0] || 'Wine Lover';
    try {
      await supabase.from('user_profiles').insert({
        id: user.id,
        display_name: displayName,
        preferred_language: 'he',
        preferred_currency: 'ILS',
        profile_completed: false,
        onboarding_completed: false,
        terms_accepted_at: meta?.terms_accepted_at ?? null,
      });
    } catch {
      // Insert might fail if profile_completed column doesn't exist; that's okay
    }
    profile = { onboarding_completed: false, profile_completed: false, display_name: displayName, gender: null };
  }

  return NextResponse.json({
    id: user.id,
    email: user.email ?? null,
    profileCompleted: profile?.profile_completed ?? false,
    onboardingCompleted: profile?.onboarding_completed ?? false,
    displayName: profile?.display_name ?? null,
    gender: profile?.gender ?? null,
  });
}
