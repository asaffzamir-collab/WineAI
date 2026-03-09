import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdmin } from '@/lib/admin';
import { TIER_LIMITS, type PricingTier } from '@/lib/usage';

export const dynamic = 'force-dynamic';

type TierStatus = 'ok' | 'warning' | 'critical' | 'exceeded';

function getTierStatus(current: number, limit: number): TierStatus {
  const pct = (current / limit) * 100;
  if (pct >= 100) return 'exceeded';
  if (pct >= 80) return 'critical';
  if (pct >= 50) return 'warning';
  return 'ok';
}

export async function GET() {
  const { error } = await verifyAdmin();
  if (error) return error;

  const supabase = createAdminClient();
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthStart = `${currentMonth}-01T00:00:00Z`;

  const { data: authData, error: authError } =
    await supabase.auth.admin.listUsers({ perPage: 1000 });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  const users = authData.users || [];

  const { data: profiles } = await supabase.from('user_profiles').select('*');
  const profileMap = new Map(
    (profiles || []).map((p: Record<string, unknown>) => [p.id, p])
  );

  const { data: cellarCounts } = await supabase
    .from('cellar_items')
    .select('user_id');
  const { data: wishlistCounts } = await supabase
    .from('wishlist_items')
    .select('user_id');
  const { data: tastingCounts } = await supabase
    .from('wine_tastings')
    .select('user_id');

  const { data: currentMonthUsage } = await supabase
    .from('monthly_usage')
    .select('user_id, wine_searches, pier_messages')
    .eq('month', currentMonth);

  const { data: allMonthlyUsage } = await supabase
    .from('monthly_usage')
    .select('user_id, wine_searches, pier_messages');

  const { data: sommelierProfiles } = await supabase
    .from('sommelier_profiles')
    .select('user_id, phase');

  const { data: sommelierConversations } = await supabase
    .from('sommelier_conversations')
    .select('user_id');

  const { data: tasteProfiles } = await supabase
    .from('taste_profiles')
    .select('user_id');

  const { data: apiUsage } = await supabase
    .from('api_usage_log')
    .select('user_id, estimated_cost_usd')
    .gte('created_at', monthStart);

  const countByUser = (rows: { user_id: string }[] | null, userId: string) =>
    (rows || []).filter((r) => r.user_id === userId).length;

  const currentUsageMap = new Map(
    (currentMonthUsage || []).map((r: Record<string, unknown>) => [r.user_id, r])
  );

  const allTimeUsageMap = new Map<string, { totalSearches: number; totalMessages: number }>();
  for (const row of (allMonthlyUsage || []) as Array<{ user_id: string; wine_searches: number; pier_messages: number }>) {
    const existing = allTimeUsageMap.get(row.user_id) || { totalSearches: 0, totalMessages: 0 };
    existing.totalSearches += row.wine_searches || 0;
    existing.totalMessages += row.pier_messages || 0;
    allTimeUsageMap.set(row.user_id, existing);
  }

  const sommelierPhaseMap = new Map(
    (sommelierProfiles || []).map((r: Record<string, unknown>) => [r.user_id, r.phase as string])
  );

  const tasteProfileSet = new Set(
    (tasteProfiles || []).map((r: Record<string, unknown>) => r.user_id as string)
  );

  const apiCostMap = new Map<string, number>();
  for (const row of (apiUsage || []) as Array<{ user_id: string; estimated_cost_usd: number }>) {
    if (row.user_id) {
      apiCostMap.set(row.user_id, (apiCostMap.get(row.user_id) || 0) + (Number(row.estimated_cost_usd) || 0));
    }
  }

  const PHASE_ORDER = ['idle', 'onboarding', 'learning', 'developing', 'refining', 'advanced'];

  const result = users.map((u) => {
    const profile = profileMap.get(u.id) as Record<string, unknown> | undefined;
    const tier = ((profile?.subscription_tier as string) || 'free') as PricingTier;
    const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;

    const currentUsage = currentUsageMap.get(u.id) as { wine_searches: number; pier_messages: number } | undefined;
    const wineSearches = currentUsage?.wine_searches || 0;
    const pierMessages = currentUsage?.pier_messages || 0;

    const allTime = allTimeUsageMap.get(u.id) || { totalSearches: 0, totalMessages: 0 };

    const cellarCount = countByUser(cellarCounts as { user_id: string }[] | null, u.id);
    const wishlistCount = countByUser(wishlistCounts as { user_id: string }[] | null, u.id);
    const tastingCount = countByUser(tastingCounts as { user_id: string }[] | null, u.id);

    const sommelierPhase = sommelierPhaseMap.get(u.id) || null;
    const conversationCount = countByUser(sommelierConversations as { user_id: string }[] | null, u.id);
    const hasTasteProfile = tasteProfileSet.has(u.id);

    const wineSearchPct = Math.round((wineSearches / limits.wine_search) * 100);
    const pierMessagePct = Math.round((pierMessages / limits.pier_message) * 100);

    const tierStatus = {
      wineSearchPct,
      pierMessagePct,
      wineSearchStatus: getTierStatus(wineSearches, limits.wine_search),
      pierMessageStatus: getTierStatus(pierMessages, limits.pier_message),
    };

    // Engagement score (volume-first)
    const totalActionsThisMonth = wineSearches + pierMessages;
    const base = Math.min(60, totalActionsThisMonth * 2);

    let breadth = 0;
    if (wineSearches > 0) breadth += 5;
    if (pierMessages > 0) breadth += 5;
    if (cellarCount > 0) breadth += 5;
    if (tastingCount > 0) breadth += 5;
    if (wishlistCount > 0) breadth += 5;

    let journey = 0;
    if (profile?.onboarding_completed) journey += 5;
    if (hasTasteProfile) journey += 5;
    if (sommelierPhase && PHASE_ORDER.indexOf(sommelierPhase) >= PHASE_ORDER.indexOf('learning')) journey += 5;

    const lastActiveDate = u.last_sign_in_at ? new Date(u.last_sign_in_at) : new Date(u.created_at);
    const daysSinceLastActive = Math.floor((now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24));
    const recency = daysSinceLastActive < 7 ? 0 : daysSinceLastActive < 14 ? 10 : daysSinceLastActive < 30 ? 20 : 40;

    const engagementScore = Math.max(0, Math.min(100, base + breadth + journey - recency));

    let segment: 'power' | 'regular' | 'light' | 'dormant';
    if (engagementScore >= 70) segment = 'power';
    else if (engagementScore >= 30) segment = 'regular';
    else if (engagementScore >= 10) segment = 'light';
    else segment = 'dormant';

    return {
      id: u.id,
      email: u.email,
      displayName: profile?.display_name || u.user_metadata?.display_name || '',
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in_at,
      lastActiveAt: lastActiveDate.toISOString(),
      daysSinceLastActive,
      isAdmin: profile?.is_admin || false,
      isPremium: profile?.subscription_tier === 'premium',
      subscriptionTier: tier,
      onboardingCompleted: profile?.onboarding_completed || false,
      cellarCount,
      wishlistCount,
      tastingCount,
      wineSearches,
      pierMessages,
      totalSearchesAllTime: allTime.totalSearches,
      totalMessagesAllTime: allTime.totalMessages,
      sommelierPhase,
      conversationCount,
      engagementScore,
      segment,
      tierStatus,
      apiCostThisMonth: Math.round((apiCostMap.get(u.id) || 0) * 100) / 100,
    };
  });

  result.sort((a, b) => b.engagementScore - a.engagementScore);

  return NextResponse.json({ users: result });
}
