import { getTasteProfilesForUser } from '@/lib/get-taste-profiles';
import { SearchPage } from '@/components/pages/search-page';

export const dynamic = 'force-dynamic';

const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001';

export default async function Page() {
  const userId = MOCK_USER_ID;
  let tasteProfiles: Record<string, unknown> = {};
  try {
    tasteProfiles = await getTasteProfilesForUser(userId);
  } catch (e) {
    console.error('Search page error:', e);
  }
  return <SearchPage userId={userId} tasteProfiles={tasteProfiles} />;
}
