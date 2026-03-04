import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const USER_DATA_TABLES = [
  'sommelier_conversations',
  'sommelier_profiles',
  'push_subscriptions',
  'monthly_usage',
  'store_prices',
  'wine_tastings',
  'cellar_items',
  'cellar_racks',
  'wishlist_items',
  'taste_profiles',
];

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const adminClient = createAdminClient();

    for (const table of USER_DATA_TABLES) {
      await adminClient.from(table).delete().eq('user_id', user.id);
    }

    await adminClient.from('user_profiles').delete().eq('id', user.id);
    await adminClient.auth.admin.deleteUser(user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Account deletion error:', err);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
