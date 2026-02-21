import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('onboarding_completed, profile_completed, display_name')
    .eq('id', user.id)
    .single();

  if (profileError?.message?.includes('profile_completed')) {
    const fallback = await supabase
      .from('user_profiles')
      .select('onboarding_completed, display_name, first_name')
      .eq('id', user.id)
      .single();
    if (fallback.data) {
      const hasExtendedProfile = !!fallback.data.first_name;
      profile = { ...fallback.data, profile_completed: hasExtendedProfile };
    } else {
      profile = null;
    }
  }

  if (!profile) {
    const meta = user.user_metadata as { display_name?: string; terms_accepted_at?: string } | undefined;
    const displayName = meta?.display_name || user.email?.split('@')[0] || 'Wine Lover';
    await supabase.from('user_profiles').insert({
      id: user.id,
      display_name: displayName,
      preferred_language: 'he',
      preferred_currency: 'ILS',
      profile_completed: false,
      onboarding_completed: false,
      terms_accepted_at: meta?.terms_accepted_at ?? null,
    });
    profile = { onboarding_completed: false, profile_completed: false, display_name: displayName };
  }

  return NextResponse.json({
    id: user.id,
    email: user.email ?? null,
    profileCompleted: profile?.profile_completed ?? false,
    onboardingCompleted: profile?.onboarding_completed ?? false,
    displayName: profile?.display_name ?? null,
  });
}
