import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getTasteProfilesForUser } from '@/lib/get-taste-profiles';
import { SearchPage } from '@/components/pages/search-page';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const userId = user.id;
  let tasteProfiles: Record<string, unknown> = {};
  try {
    tasteProfiles = await getTasteProfilesForUser(userId);
  } catch (e) {
    console.error('Search page error:', e);
  }
  return <SearchPage userId={userId} tasteProfiles={tasteProfiles} />;
}
