import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OnboardingWelcome } from '@/components/onboarding-welcome';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth');
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('onboarding_completed, display_name')
    .eq('id', user.id)
    .single();

  if (profile?.onboarding_completed) {
    redirect('/');
  }

  const displayName =
    profile?.display_name
    ?? (user.user_metadata as { given_name?: string })?.given_name
    ?? (user.user_metadata as { full_name?: string })?.full_name?.split(/\s+/)[0]
    ?? null;

  return <OnboardingWelcome userId={user.id} displayName={displayName} />;
}
