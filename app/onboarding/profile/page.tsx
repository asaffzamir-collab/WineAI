import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProfileSetupPage } from '@/components/pages/profile-setup-page';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('profile_completed, display_name')
    .eq('id', user.id)
    .single();

  if (profile?.profile_completed) {
    redirect('/sommelier/welcome');
  }

  const displayName =
    profile?.display_name
    ?? (user.user_metadata as { display_name?: string })?.display_name
    ?? user.email?.split('@')[0]
    ?? '';

  return <ProfileSetupPage userId={user.id} initialDisplayName={displayName} />;
}
