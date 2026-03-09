import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdmin } from '@/lib/admin';
import { TIER_LIMITS, type PricingTier } from '@/lib/usage';

export const dynamic = 'force-dynamic';

function monthStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function GET(req: NextRequest) {
  const { error } = await verifyAdmin();
  if (error) return error;

  const supabase = createAdminClient();
  const now = new Date();

  const fromParam = req.nextUrl.searchParams.get('from');
  const toParam = req.nextUrl.searchParams.get('to');

  const rangeFrom = fromParam ? new Date(fromParam) : new Date(now.getFullYear(), now.getMonth(), 1);
  const rangeTo = toParam ? new Date(toParam) : now;

  const currentMonth = monthStr(rangeFrom);
  const rangeFromISO = rangeFrom.toISOString();
  const rangeToISO = rangeTo.toISOString();

  const prevDuration = rangeTo.getTime() - rangeFrom.getTime();
  const prevFrom = new Date(rangeFrom.getTime() - prevDuration);
  const prevTo = rangeFrom;
  const prevMonth = monthStr(prevFrom);

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const users = authData?.users || [];

  const { data: profiles } = await supabase.from('user_profiles').select('id, is_admin, subscription_tier, onboarding_completed, display_name, created_at');
  const profileMap = new Map((profiles || []).map((p: Record<string, unknown>) => [p.id, p]));

  const { data: monthlyUsage } = await supabase.from('monthly_usage').select('user_id, wine_searches, pier_messages').eq('month', currentMonth);

  const { data: apiUsage } = await supabase.from('api_usage_log').select('service, model, feature, estimated_cost_usd, tokens_in, tokens_out, user_id').gte('created_at', rangeFromISO).lte('created_at', rangeToISO);

  const { data: prevApiUsage } = await supabase.from('api_usage_log').select('estimated_cost_usd').gte('created_at', prevFrom.toISOString()).lt('created_at', prevTo.toISOString());

  const { data: prevMonthUsage } = await supabase.from('monthly_usage').select('user_id').eq('month', prevMonth);

  const totalUsers = users.length;
  const adminCount = (profiles || []).filter((p: Record<string, unknown>) => p.is_admin).length;
  const onboardedCount = (profiles || []).filter((p: Record<string, unknown>) => p.onboarding_completed).length;
  const premiumCount = (profiles || []).filter((p: Record<string, unknown>) => p.subscription_tier === 'premium').length;
  const newUsersLast7d = users.filter(u => new Date(u.created_at) >= new Date(sevenDaysAgo)).length;
  const newUsersLast30d = users.filter(u => new Date(u.created_at) >= new Date(thirtyDaysAgo)).length;

  const activeUserIds = new Set((monthlyUsage || []).map((u: Record<string, unknown>) => u.user_id));
  const activeThisMonth = activeUserIds.size;
  const activeLastMonth = new Set((prevMonthUsage || []).map((u: Record<string, unknown>) => u.user_id)).size;

  let totalSearches = 0;
  let totalPierMessages = 0;
  for (const u of (monthlyUsage || []) as Array<{ wine_searches: number; pier_messages: number }>) {
    totalSearches += u.wine_searches || 0;
    totalPierMessages += u.pier_messages || 0;
  }

  let totalCostThisMonth = 0;
  const costByService: Record<string, number> = {};
  const countByService: Record<string, number> = {};
  const costByModel: Record<string, number> = {};
  const costByFeature: Record<string, number> = {};
  const costByUser: Record<string, number> = {};

  for (const row of (apiUsage || []) as Array<{ service: string; model: string; feature: string; estimated_cost_usd: number; user_id: string }>) {
    const cost = Number(row.estimated_cost_usd) || 0;
    totalCostThisMonth += cost;
    costByService[row.service] = (costByService[row.service] || 0) + cost;
    countByService[row.service] = (countByService[row.service] || 0) + 1;
    if (row.model) costByModel[row.model] = (costByModel[row.model] || 0) + cost;
    costByFeature[row.feature] = (costByFeature[row.feature] || 0) + cost;
    if (row.user_id) costByUser[row.user_id] = (costByUser[row.user_id] || 0) + cost;
  }

  const totalCostLastMonth = (prevApiUsage || []).reduce((sum: number, r: Record<string, unknown>) => sum + (Number(r.estimated_cost_usd) || 0), 0);

  const topCostUsers = Object.entries(costByUser)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([userId, cost]) => {
      const profile = profileMap.get(userId) as Record<string, unknown> | undefined;
      const authUser = users.find(u => u.id === userId);
      return {
        userId,
        displayName: (profile?.display_name as string) || authUser?.email || userId,
        cost: Math.round(cost * 1000000) / 1000000,
      };
    });

  type TierStatus = 'ok' | 'warning' | 'critical' | 'exceeded';
  function getStatus(current: number, limit: number): TierStatus {
    const pct = (current / limit) * 100;
    if (pct >= 100) return 'exceeded';
    if (pct >= 80) return 'critical';
    if (pct >= 50) return 'warning';
    return 'ok';
  }

  let exceededFreeCount = 0;
  let criticalFreeCount = 0;
  let warningFreeCount = 0;
  const exceededUsers: Array<{ userId: string; displayName: string; wineSearches: number; pierMessages: number; tier: string }> = [];

  for (const u of users) {
    const profile = profileMap.get(u.id) as Record<string, unknown> | undefined;
    const tier = ((profile?.subscription_tier as string) || 'free') as PricingTier;
    const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
    const usage = (monthlyUsage || []).find((mu: Record<string, unknown>) => mu.user_id === u.id) as { wine_searches: number; pier_messages: number } | undefined;
    const ws = usage?.wine_searches || 0;
    const pm = usage?.pier_messages || 0;

    const wsStatus = getStatus(ws, limits.wine_search);
    const pmStatus = getStatus(pm, limits.pier_message);

    const worstStatus = [wsStatus, pmStatus].includes('exceeded') ? 'exceeded'
      : [wsStatus, pmStatus].includes('critical') ? 'critical'
      : [wsStatus, pmStatus].includes('warning') ? 'warning' : 'ok';

    if (worstStatus === 'exceeded') {
      exceededFreeCount++;
      exceededUsers.push({
        userId: u.id,
        displayName: (profile?.display_name as string) || u.email || '',
        wineSearches: ws,
        pierMessages: pm,
        tier,
      });
    } else if (worstStatus === 'critical') {
      criticalFreeCount++;
    } else if (worstStatus === 'warning') {
      warningFreeCount++;
    }
  }

  const { data: cellarCounts } = await supabase.from('cellar_items').select('user_id');
  const { data: tastingCounts } = await supabase.from('wine_tastings').select('user_id');
  const { data: wishlistCounts } = await supabase.from('wishlist_items').select('user_id');

  function countFor(rows: Array<{ user_id: string }> | null, userId: string) {
    return (rows || []).filter(r => r.user_id === userId).length;
  }

  let powerCount = 0, regularCount = 0, lightCount = 0, dormantCount = 0;

  for (const u of users) {
    const profile = profileMap.get(u.id) as Record<string, unknown> | undefined;
    const usage = (monthlyUsage || []).find((mu: Record<string, unknown>) => mu.user_id === u.id) as { wine_searches: number; pier_messages: number } | undefined;
    const ws = usage?.wine_searches || 0;
    const pm = usage?.pier_messages || 0;
    const cc = countFor(cellarCounts as Array<{ user_id: string }> | null, u.id);
    const tc = countFor(tastingCounts as Array<{ user_id: string }> | null, u.id);
    const wc = countFor(wishlistCounts as Array<{ user_id: string }> | null, u.id);

    const totalActions = ws + pm + cc + tc + wc;
    const base = Math.min(60, totalActions * 2);

    let breadth = 0;
    if (ws > 0) breadth += 5;
    if (pm > 0) breadth += 5;
    if (cc > 0) breadth += 5;
    if (tc > 0) breadth += 5;
    if (wc > 0) breadth += 5;

    let journey = 0;
    if (profile?.onboarding_completed) journey += 5;

    const lastSignIn = u.last_sign_in_at ? new Date(u.last_sign_in_at) : new Date(u.created_at);
    const daysSince = Math.floor((now.getTime() - lastSignIn.getTime()) / (1000 * 60 * 60 * 24));
    const recency = daysSince < 7 ? 0 : daysSince < 14 ? 10 : daysSince < 30 ? 20 : 40;

    const score = Math.max(0, Math.min(100, base + breadth + journey - recency));

    if (score >= 70) powerCount++;
    else if (score >= 30) regularCount++;
    else if (score >= 10) lightCount++;
    else dormantCount++;
  }

  const recentSignups = users
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)
    .map(u => {
      const profile = profileMap.get(u.id) as Record<string, unknown> | undefined;
      return {
        id: u.id,
        email: u.email,
        displayName: (profile?.display_name as string) || '',
        createdAt: u.created_at,
        onboardingCompleted: !!profile?.onboarding_completed,
        isActive: activeUserIds.has(u.id),
      };
    });

  return NextResponse.json({
    stats: {
      totalUsers,
      adminCount,
      onboardedCount,
      onboardedPct: totalUsers > 0 ? Math.round((onboardedCount / totalUsers) * 100) : 0,
      premiumCount,
      activeThisMonth,
      activeLastMonth,
      newUsersLast7d,
      newUsersLast30d,
    },
    usage: {
      totalSearches,
      totalPierMessages,
      avgSearchesPerActive: activeThisMonth > 0 ? Math.round((totalSearches / activeThisMonth) * 10) / 10 : 0,
      avgMessagesPerActive: activeThisMonth > 0 ? Math.round((totalPierMessages / activeThisMonth) * 10) / 10 : 0,
    },
    segments: { power: powerCount, regular: regularCount, light: lightCount, dormant: dormantCount },
    apiCosts: {
      totalCostThisMonth: Math.round(totalCostThisMonth * 100) / 100,
      totalCostLastMonth: Math.round(totalCostLastMonth * 100) / 100,
      costPerActiveUser: activeThisMonth > 0 ? Math.round((totalCostThisMonth / activeThisMonth) * 100) / 100 : 0,
      byService: costByService,
      countByService,
      byModel: Object.fromEntries(Object.entries(costByModel).map(([k, v]) => [k, Math.round(v * 100) / 100])),
      byFeature: Object.fromEntries(
        Object.entries(costByFeature).sort(([, a], [, b]) => b - a).slice(0, 10).map(([k, v]) => [k, Math.round(v * 1000) / 1000])
      ),
      topCostUsers,
    },
    tierExhaustion: {
      exceededCount: exceededFreeCount,
      criticalCount: criticalFreeCount,
      warningCount: warningFreeCount,
      exceededUsers: exceededUsers.slice(0, 10),
    },
    recentSignups,
  });
}
