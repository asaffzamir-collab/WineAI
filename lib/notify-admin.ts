/**
 * Admin email notifications via Resend.
 * Fire-and-forget — never blocks the API response.
 */

import { createAdminClient } from '@/lib/supabase/server';
import { TIER_LIMITS, type UsageType } from '@/lib/usage';

const ADMIN_EMAIL = 'asaffz@winejourney.co';
const FROM_EMAIL = 'notifications@winejourney.co';

const TYPE_LABELS: Record<UsageType, { en: string; he: string }> = {
  wine_search: { en: 'Wine Searches', he: 'חיפושי יין' },
  pier_message: { en: 'Pier Messages', he: 'הודעות Pier' },
};

function tierForThreshold(threshold: number, type: UsageType): string {
  for (const [tier, limits] of Object.entries(TIER_LIMITS)) {
    if (limits[type] === threshold) return tier;
  }
  return 'unknown';
}

async function getUserInfo(userId: string) {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('user_profiles')
      .select('display_name, first_name, last_name, subscription_tier')
      .eq('id', userId)
      .single();

    const name = data?.display_name || [data?.first_name, data?.last_name].filter(Boolean).join(' ') || 'Unknown';
    return { name, tier: data?.subscription_tier || 'free' };
  } catch {
    return { name: 'Unknown', tier: 'free' };
  }
}

export async function notifyAdminUsageThreshold(
  userId: string,
  type: UsageType,
  threshold: number,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[notify-admin] RESEND_API_KEY not set, skipping notification');
    return;
  }

  try {
    const { name, tier } = await getUserInfo(userId);
    const tierHit = tierForThreshold(threshold, type);
    const typeLabel = TYPE_LABELS[type].en;

    const subject = `WineJourney: ${name} hit ${tierHit} limit (${threshold} ${typeLabel.toLowerCase()})`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #7A2D4A; margin-bottom: 16px;">Usage Threshold Reached</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 8px 0; color: #666;">User</td><td style="padding: 8px 0; font-weight: 600;">${name}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">User ID</td><td style="padding: 8px 0; font-family: monospace; font-size: 12px;">${userId}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Current Tier</td><td style="padding: 8px 0; font-weight: 600;">${tier}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Usage Type</td><td style="padding: 8px 0;">${typeLabel}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Count Reached</td><td style="padding: 8px 0; font-weight: 600; color: #D97706;">${threshold}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Tier Limit Hit</td><td style="padding: 8px 0; font-weight: 600; text-transform: capitalize;">${tierHit}</td></tr>
        </table>
        <p style="margin-top: 20px; font-size: 12px; color: #999;">This is an automated notification from WineJourney.</p>
      </div>
    `;

    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);

    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject,
      html,
    });
  } catch (err) {
    console.error('[notify-admin] Failed to send email:', err);
  }
}
