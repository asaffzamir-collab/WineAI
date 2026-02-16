import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users
 * Lists all users with their profiles and stats.
 */
export async function GET() {
  const { error } = await verifyAdmin();
  if (error) return error;

  const supabase = createAdminClient();

  // Fetch all users from Supabase Auth
  const { data: authData, error: authError } =
    await supabase.auth.admin.listUsers({ perPage: 1000 });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  const users = authData.users || [];

  // Fetch all profiles
  const { data: profiles } = await supabase.from('user_profiles').select('*');
  const profileMap = new Map(
    (profiles || []).map((p: Record<string, unknown>) => [p.id, p])
  );

  // Fetch counts per user
  const { data: cellarCounts } = await supabase
    .from('cellar_items')
    .select('user_id');
  const { data: wishlistCounts } = await supabase
    .from('wishlist_items')
    .select('user_id');
  const { data: tastingCounts } = await supabase
    .from('wine_tastings')
    .select('user_id');

  const countByUser = (rows: { user_id: string }[] | null, userId: string) =>
    (rows || []).filter((r) => r.user_id === userId).length;

  const result = users.map((u) => {
    const profile = profileMap.get(u.id) as Record<string, unknown> | undefined;
    return {
      id: u.id,
      email: u.email,
      displayName: profile?.display_name || u.user_metadata?.display_name || '',
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in_at,
      isAdmin: profile?.is_admin || false,
      onboardingCompleted: profile?.onboarding_completed || false,
      cellarCount: countByUser(cellarCounts as { user_id: string }[] | null, u.id),
      wishlistCount: countByUser(wishlistCounts as { user_id: string }[] | null, u.id),
      tastingCount: countByUser(tastingCounts as { user_id: string }[] | null, u.id),
    };
  });

  // Sort by createdAt descending
  result.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return NextResponse.json({ users: result });
}
