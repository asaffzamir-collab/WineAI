import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { timingSafeCompare } from '@/lib/timing-safe';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

let vapidConfigured = false;

async function getWebPush() {
  const wp = (await import('web-push')).default;

  if (!vapidConfigured) {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:support@winejourney.co';

    if (publicKey && privateKey) {
      wp.setVapidDetails(subject, publicKey, privateKey);
      vapidConfigured = true;
    }
  }

  return wp;
}

export async function POST(request: Request) {
  try {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json({ error: 'Push not configured' }, { status: 503 });
    }

    const apiKey = request.headers.get('x-api-key') ?? '';
    const expected = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
    if (!expected || !timingSafeCompare(apiKey, expected)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, title, body, url, tag } = await request.json();
    if (!userId || !title) {
      return NextResponse.json({ error: 'userId and title required' }, { status: 400 });
    }

    const webpush = await getWebPush();
    const supabase = createAdminClient();
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, keys_p256dh, keys_auth')
      .eq('user_id', userId);

    if (error) throw error;
    if (!subscriptions?.length) {
      return NextResponse.json({ sent: 0, message: 'No subscriptions found' });
    }

    const payload = JSON.stringify({ title, body, url, tag });
    let sent = 0;
    const stale: string[] = [];

    for (const sub of subscriptions) {
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

    return NextResponse.json({ sent, cleaned: stale.length });
  } catch (error) {
    console.error('Push send error:', error);
    return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 });
  }
}
