import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/users/[id]/erase-data
 * Erases ALL user-specific data for a complete reset — the user starts from scratch.
 * Returns localStorage keys the admin UI should clear for the target user.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await verifyAdmin();
  if (error) return error;

  const { id: targetUserId } = await params;
  const supabase = createAdminClient();

  const tables = [
    'store_prices',
    'wine_tastings',
    'cellar_items',
    'wishlist_items',
    'taste_profiles',
    'sommelier_profiles',
    'sommelier_conversations',
    'cellar_racks',
  ];

  const results: Record<string, string> = {};

  for (const table of tables) {
    const { error: delError, count } = await supabase
      .from(table)
      .delete({ count: 'exact' })
      .eq('user_id', targetUserId);

    if (delError) {
      console.error(`Error erasing ${table}:`, delError);
      results[table] = `error: ${delError.message}`;
    } else {
      results[table] = `deleted ${count ?? 0} rows`;
    }
  }

  // Full reset of user_profiles
  const { error: profileErr } = await supabase
    .from('user_profiles')
    .update({
      onboarding_completed: false,
      subscription_tier: 'free',
    })
    .eq('id', targetUserId);

  if (profileErr) {
    console.error('Error resetting user_profiles:', profileErr);
    results['user_profiles'] = `error: ${profileErr.message}`;
  } else {
    results['user_profiles'] = 'reset (onboarding, subscription)';
  }

  // Store a reset timestamp so client-side can detect and clear localStorage
  const { error: resetTsErr } = await supabase
    .from('user_profiles')
    .update({ data_reset_at: new Date().toISOString() })
    .eq('id', targetUserId);

  if (resetTsErr) {
    // data_reset_at column may not exist yet — non-critical
    console.warn('Could not set data_reset_at (column may not exist):', resetTsErr.message);
  }

  // Return localStorage keys the admin UI should clear if the admin IS the target user
  const localStorageKeys = [
    `cellar-racks:${targetUserId}`,
    `cellar-slots:${targetUserId}`,
    `cellar-opened:${targetUserId}`,
    `cellar-view:${targetUserId}`,
    `wineSearchHistory_${targetUserId}`,
  ];

  const sessionStorageKeys = [
    `cellar-data:${targetUserId}`,
    `sommelier-last-search:${targetUserId}`,
  ];

  return NextResponse.json({
    success: true,
    details: results,
    clearLocalStorage: localStorageKeys,
    clearSessionStorage: sessionStorageKeys,
  });
}
