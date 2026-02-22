import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProfilePage, type TasteProfile } from '@/components/pages/profile-page';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const userId = user.id;
  let profiles: Array<{ wine_type: string; profile_data: unknown; updated_at: string }> = [];
  let firstName: string | undefined;
  try {
    const [profilesResult, userProfileResult] = await Promise.all([
      supabase.from('taste_profiles').select('wine_type, profile_data, updated_at').eq('user_id', userId),
      supabase.from('user_profiles').select('first_name').eq('id', userId).single(),
    ]);
    profiles = profilesResult.data || [];
    firstName = userProfileResult.data?.first_name || undefined;
  } catch (e) {
    console.error('Profile page error:', e);
  }
  return <ProfilePage userId={userId} profiles={profiles as TasteProfile[]} firstName={firstName} />;
}
