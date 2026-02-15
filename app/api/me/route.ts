import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/me
 * Returns current user id, email, and onboarding status. Creates user_profile if missing.
 * 401 if not signed in.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let { data: profile } = await supabase
    .from('user_profiles')
    .select('onboarding_completed, display_name')
    .eq('id', user.id)
    .single();

  if (!profile) {
    const displayName =
      (user.user_metadata as { display_name?: string })?.display_name
        || user.email?.split('@')[0]
        || 'Wine Lover';
    await supabase.from('user_profiles').insert({
      id: user.id,
      display_name: displayName,
      preferred_language: 'he',
      preferred_currency: 'ILS',
      onboarding_completed: false,
    });
    profile = { onboarding_completed: false, display_name: displayName };
  }

  return NextResponse.json({
    id: user.id,
    email: user.email ?? null,
    onboardingCompleted: profile?.onboarding_completed ?? false,
    displayName: profile?.display_name ?? null,
  });
}
