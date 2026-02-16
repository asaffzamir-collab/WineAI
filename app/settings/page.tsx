import { createClient } from '@/lib/supabase/server';
import { SettingsPage } from '@/components/pages/settings-page';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <SettingsPage
      userId={user.id}
      profile={profile}
      userEmail={user.email || ''}
      isAdmin={profile?.is_admin === true}
    />
  );
}
