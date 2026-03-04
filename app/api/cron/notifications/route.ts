import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function getWebPush() {
  const wp = (await import('web-push')).default;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:support@winejourney.co';

  if (publicKey && privateKey) {
    wp.setVapidDetails(subject, publicKey, privateKey);
  }
  return wp;
}

/**
 * Daily cron job that sends push notifications:
 * 1. Welcome back: users who haven't visited in 5+ days
 * 2. Cellar tip: users with 3+ cellar items get a weekly insight
 *
 * Secured via CRON_SECRET (set in Vercel cron config).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

  if (!vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json({ error: 'Push not configured' }, { status: 503 });
  }

  try {
    const webpush = await getWebPush();
    const supabase = createAdminClient();

    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('user_id, endpoint, keys_p256dh, keys_auth');

    if (!subscriptions?.length) {
      return NextResponse.json({ sent: 0, message: 'No subscriptions' });
    }

    const userIds = Array.from(new Set(subscriptions.map((s) => s.user_id)));

    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, display_name, preferred_language, updated_at')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    const { data: cellarCounts } = await supabase
      .from('cellar_items')
      .select('user_id')
      .in('user_id', userIds)
      .is('consumed_at', null);

    const cellarCountMap = new Map<string, number>();
    cellarCounts?.forEach((item) => {
      cellarCountMap.set(item.user_id, (cellarCountMap.get(item.user_id) || 0) + 1);
    });

    let sent = 0;
    const stale: string[] = [];
    const dayOfWeek = new Date().getDay();

    for (const sub of subscriptions) {
      const profile = profileMap.get(sub.user_id);
      const isHebrew = profile?.preferred_language === 'he';
      const cellarCount = cellarCountMap.get(sub.user_id) || 0;

      let title: string | null = null;
      let body: string | null = null;
      let url = '/';

      const lastActive = profile?.updated_at ? new Date(profile.updated_at) : null;
      const isInactive = lastActive && lastActive < fiveDaysAgo;

      if (isInactive) {
        title = isHebrew ? 'חסר לנו אותך!' : 'We miss you!';
        body = isHebrew
          ? 'יש יינות חדשים שמחכים לך. בואו לגלות מה מתאים לטעם שלכם.'
          : 'New wines are waiting for you. Come discover your next favorite.';
        url = '/search';
      } else if (cellarCount >= 3 && dayOfWeek === 0) {
        title = isHebrew ? 'תובנה שבועית מהמרתף' : 'Weekly Cellar Insight';
        body = isHebrew
          ? `יש לכם ${cellarCount} יינות במרתף. בואו לבדוק מה מומלץ לפתוח השבוע.`
          : `You have ${cellarCount} wines in your cellar. Check what's ready to open this week.`;
        url = '/cellar';
      }

      if (!title) continue;

      const payload = JSON.stringify({ title, body, url, tag: 'daily-cron' });

      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
          },
          payload,
        );
        sent++;
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          stale.push(sub.endpoint);
        }
      }
    }

    if (stale.length) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', stale);
    }

    return NextResponse.json({ sent, cleaned: stale.length, totalSubs: subscriptions.length });
  } catch (error) {
    console.error('Notification cron error:', error);
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}
