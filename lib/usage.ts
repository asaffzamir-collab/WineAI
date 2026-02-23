/**
 * Usage tracking and tier limit enforcement.
 *
 * Tracks wine searches and Pier messages per user per month.
 * During beta (paywall off), usage is tracked but not enforced.
 */

import { createAdminClient } from '@/lib/supabase/server';
import { isPaywallActive } from '@/lib/premium';

export type UsageType = 'wine_search' | 'pier_message';

export type PricingTier = 'free' | 'plus' | 'premium';

export const TIER_LIMITS: Record<PricingTier, Record<UsageType, number>> = {
  free:    { wine_search: 5,   pier_message: 5   },
  plus:    { wine_search: 40,  pier_message: 40  },
  premium: { wine_search: 150, pier_message: 150 },
};

const ALL_THRESHOLDS = [5, 40, 150];

export interface UsageCounts {
  wine_searches: number;
  pier_messages: number;
}

export interface UsageLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  tier: string;
  type: UsageType;
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function columnForType(type: UsageType): 'wine_searches' | 'pier_messages' {
  return type === 'wine_search' ? 'wine_searches' : 'pier_messages';
}

export async function getMonthlyUsage(userId: string): Promise<UsageCounts> {
  const admin = createAdminClient();
  const month = currentMonth();

  const { data } = await admin
    .from('monthly_usage')
    .select('wine_searches, pier_messages')
    .eq('user_id', userId)
    .eq('month', month)
    .single();

  return {
    wine_searches: data?.wine_searches ?? 0,
    pier_messages: data?.pier_messages ?? 0,
  };
}

export async function getUserTier(userId: string): Promise<PricingTier> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('user_profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .single();

  const tier = data?.subscription_tier;
  if (tier === 'plus' || tier === 'premium') return tier;
  return 'free';
}

export async function checkUsageLimit(
  userId: string,
  type: UsageType,
): Promise<UsageLimitResult> {
  const paywall = await isPaywallActive();

  const [usage, tier] = await Promise.all([
    getMonthlyUsage(userId),
    getUserTier(userId),
  ]);

  const col = columnForType(type);
  const current = usage[col];
  const limit = TIER_LIMITS[tier][type];

  if (!paywall) {
    return { allowed: true, current, limit, tier, type };
  }

  return {
    allowed: current < limit,
    current,
    limit,
    tier,
    type,
  };
}

/**
 * Increment usage counter and return the new count.
 * Returns the threshold that was just hit (5, 40, or 150), or null.
 */
export async function incrementUsage(
  userId: string,
  type: UsageType,
): Promise<{ newCount: number; thresholdHit: number | null }> {
  const admin = createAdminClient();
  const month = currentMonth();
  const col = columnForType(type);

  const { data: existing } = await admin
    .from('monthly_usage')
    .select('id, wine_searches, pier_messages')
    .eq('user_id', userId)
    .eq('month', month)
    .single();

  let newCount: number;

  if (existing) {
    newCount = (existing[col] ?? 0) + 1;
    await admin
      .from('monthly_usage')
      .update({ [col]: newCount, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    newCount = 1;
    await admin
      .from('monthly_usage')
      .insert({
        user_id: userId,
        month,
        [col]: 1,
      });
  }

  const thresholdHit = ALL_THRESHOLDS.includes(newCount) ? newCount : null;

  return { newCount, thresholdHit };
}
