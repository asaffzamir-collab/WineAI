import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SearchPage } from '@/components/pages/search-page';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  return (
    <Suspense>
      <SearchPage userId={user.id} />
    </Suspense>
  );
}
