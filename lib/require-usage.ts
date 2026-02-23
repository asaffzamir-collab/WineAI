/**
 * Server-side usage gate for API routes.
 * Returns a 429 response if the user has hit their tier limit.
 * Returns null if the request is allowed.
 *
 * During beta (paywall off), always allows but still tracks.
 */

import { NextResponse } from 'next/server';
import { checkUsageLimit, type UsageType } from '@/lib/usage';

export async function requireUsage(
  userId: string,
  type: UsageType,
): Promise<NextResponse | null> {
  const result = await checkUsageLimit(userId, type);

  if (result.allowed) return null;

  return NextResponse.json(
    {
      error: 'usage_limit_reached',
      type: result.type,
      current: result.current,
      limit: result.limit,
      tier: result.tier,
      upgradeUrl: '/plans',
    },
    { status: 429 },
  );
}
