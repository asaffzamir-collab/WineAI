import { createClient, createAdminClient } from '@/lib/supabase/server';
import { ProfilePage, type TasteProfile } from '@/components/pages/profile-page';

export const dynamic = 'force-dynamic';

const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001';

export default async function Page() {
  const userId = MOCK_USER_ID;
  const supabase = await createClient();
  const client = userId === MOCK_USER_ID ? createAdminClient() : supabase;

  let profiles: Array<{ wine_type: string; profile_data: unknown; updated_at: string }> = [];
  try {
    const { data } = await client
      .from('taste_profiles')
      .select('wine_type, profile_data, updated_at')
      .eq('user_id', userId);
    profiles = data || [];
  } catch (e) {
    console.error('Profile page error:', e);
  }
  return <ProfilePage userId={userId} profiles={profiles as TasteProfile[]} />;
}
