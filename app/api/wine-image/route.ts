import { NextResponse } from 'next/server';
import { fetchWineImageUrl } from '@/lib/wine-image';
import { clearCachedImageUrl } from '@/lib/wine-cache';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/wine-image?name=...&winery=...
 *
 * Lazily fetches a wine bottle image.
 * Used as a client-side fallback when no image_url is present.
 * Persists the found URL to the wines table for future use.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  const winery = searchParams.get('winery');

  if (!name) {
    return NextResponse.json(
      { error: 'name query parameter is required' },
      { status: 400 }
    );
  }

  try {
    const t0 = performance.now();
    const imageUrl = await fetchWineImageUrl(name, winery || '');
    const fetchMs = Math.round(performance.now() - t0);
    if (imageUrl) {
      try {
        const { cacheImageUrl } = await import('@/lib/wine-cache');
        await cacheImageUrl(name, winery || '', imageUrl);
      } catch {}
    }
    const resp = NextResponse.json({ imageUrl, _timing: { fetch_ms: fetchMs } });
    if (imageUrl) {
      resp.headers.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    }
    return resp;
  } catch (err) {
    console.error('Wine image fetch error:', err);
    return NextResponse.json({ imageUrl: null });
  }
}

/**
 * DELETE /api/wine-image?name=...&winery=...
 *
 * Clears a broken/stale image_url from the DB.
 * Called by the client when an <img> onError fires.
 */
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  const winery = searchParams.get('winery');

  if (!name) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }

  try {
    await clearCachedImageUrl(name, winery || '');
    return NextResponse.json({ cleared: true });
  } catch {
    return NextResponse.json({ cleared: false });
  }
}
