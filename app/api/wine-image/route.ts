import { NextResponse } from 'next/server';
import { fetchWineImageUrl } from '@/lib/wine-image';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/wine-image?name=...&winery=...
 *
 * Lazily fetches a wine bottle image from Vivino.
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
    const imageUrl = await fetchWineImageUrl(name, winery || '');
    if (imageUrl) {
      // Persist image URL to the wines table so future loads don't need to re-fetch
      try {
        const supabase = await createClient();
        await supabase
          .from('wines')
          .update({ image_url: imageUrl })
          .eq('name', name)
          .eq('winery', winery || '')
          .is('image_url', null);
      } catch {}
    }
    const resp = NextResponse.json({ imageUrl });
    if (imageUrl) {
      resp.headers.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    }
    return resp;
  } catch (err) {
    console.error('Wine image fetch error:', err);
    return NextResponse.json({ imageUrl: null });
  }
}
