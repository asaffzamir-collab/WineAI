/**
 * Premium feature gating system.
 *
 * Uses a two-level check:
 * 1. Global toggle (app_settings.premium_enabled) — when false, everyone has full access
 * 2. Per-user tier (user_profiles.subscription_tier) — checked only when global toggle is on
 */

import { createClient } from '@/lib/supabase/server';

export type SubscriptionTier = 'free' | 'premium';

export interface PremiumStatus {
  paywallActive: boolean;
  tier: SubscriptionTier;
  isPremium: boolean;
}

const PREMIUM_FEATURES = new Set([
  'sommelier_chat',
  'tonight_mode',
  'food_pairing',
  'buying_intelligence',
  'cellar_intelligence',
  'taste_evolution',
  'wine_discovery',
  'smart_refinement',
  'unlimited_search',
]);

export function isPremiumFeature(featureName: string): boolean {
  return PREMIUM_FEATURES.has(featureName);
}

/**
 * Check if the global premium paywall is active.
 */
export async function isPaywallActive(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('app_settings')
      .select('premium_enabled')
      .limit(1)
      .single();
    return data?.premium_enabled === true;
  } catch {
    return false;
  }
}

/**
 * Full premium access check for a given user.
 *
 * When the global paywall is OFF, returns isPremium: true for everyone.
 * When ON, checks the user's subscription_tier.
 */
export async function checkPremiumAccess(userId: string): Promise<PremiumStatus> {
  try {
    const supabase = await createClient();

    const [settingsRes, profileRes] = await Promise.all([
      supabase.from('app_settings').select('premium_enabled').limit(1).single(),
      supabase.from('user_profiles').select('subscription_tier').eq('id', userId).single(),
    ]);

    const paywallActive = settingsRes.data?.premium_enabled === true;
    const tier = (profileRes.data?.subscription_tier as SubscriptionTier) || 'free';

    if (!paywallActive) {
      return { paywallActive: false, tier, isPremium: true };
    }

    return { paywallActive: true, tier, isPremium: tier === 'premium' };
  } catch {
    return { paywallActive: false, tier: 'free', isPremium: true };
  }
}

/**
 * Client-side API to fetch premium status. Called from usePremium() hook.
 */
export async function fetchPremiumStatus(): Promise<PremiumStatus> {
  try {
    const res = await fetch('/api/premium/status');
    if (!res.ok) return { paywallActive: false, tier: 'free', isPremium: true };
    return await res.json();
  } catch {
    return { paywallActive: false, tier: 'free', isPremium: true };
  }
}
