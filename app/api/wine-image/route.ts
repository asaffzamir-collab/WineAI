import { NextResponse } from 'next/server';
import { fetchWineImageUrl } from '@/lib/wine-image';

export const dynamic = 'force-dynamic';

/**
 * GET /api/wine-image?name=...&winery=...
 *
 * Lazily fetches a wine bottle image from Vivino.
 * Used as a client-side fallback when no image_url is present.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  const winery = searchParams.get('winery');

  if (!name || !winery) {
    return NextResponse.json(
      { error: 'name and winery query parameters are required' },
      { status: 400 }
    );
  }

  try {
    const imageUrl = await fetchWineImageUrl(name, winery);
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
