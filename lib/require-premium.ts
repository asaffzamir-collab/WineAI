/**
 * Server-side premium gate for API routes.
 * Returns a 403 response if the feature requires premium and the user doesn't have it.
 * Returns null if access is allowed.
 */

import { NextResponse } from 'next/server';
import { checkPremiumAccess, isPremiumFeature } from '@/lib/premium';

export async function requirePremium(
  userId: string,
  feature: string,
): Promise<NextResponse | null> {
  if (!isPremiumFeature(feature)) return null;

  const { isPremium } = await checkPremiumAccess(userId);
  if (isPremium) return null;

  return NextResponse.json(
    { error: 'premium_required', feature },
    { status: 403 },
  );
}
