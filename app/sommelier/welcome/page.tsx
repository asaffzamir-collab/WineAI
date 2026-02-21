import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SommelierWelcome } from '@/components/sommelier/sommelier-welcome';

export const dynamic = 'force-dynamic';

export default async function SommelierWelcomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  let { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('profile_completed, onboarding_completed, display_name')
    .eq('id', user.id)
    .single();

  if (profileError?.message?.includes('profile_completed')) {
    const fallback = await supabase
      .from('user_profiles')
      .select('onboarding_completed, display_name')
      .eq('id', user.id)
      .single();
    profile = fallback.data ? { ...fallback.data, profile_completed: true } : null;
  }

  if (!profile?.profile_completed) redirect('/onboarding/profile');
  if (profile?.onboarding_completed) redirect('/');

  const displayName =
    profile?.display_name
    ?? (user.user_metadata as { display_name?: string })?.display_name
    ?? user.email?.split('@')[0]
    ?? null;

  return <SommelierWelcome displayName={displayName} />;
}
