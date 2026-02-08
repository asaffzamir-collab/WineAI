import { createClient, createAdminClient } from '@/lib/supabase/server';
import { SettingsPage } from '@/components/pages/settings-page';

const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001';

export default async function Page() {
  const userId = MOCK_USER_ID;
  const supabase = await createClient();
  const client = userId === MOCK_USER_ID ? createAdminClient() : supabase;

  const { data: profile } = await client
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  return (
    <SettingsPage
      userId={userId}
      profile={profile}
      userEmail="test@example.com"
    />
  );
}
