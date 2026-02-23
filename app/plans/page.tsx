import { createClient } from '@/lib/supabase/server';
import { PlansPage } from '@/components/pages/plans-page';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  return <PlansPage />;
}
