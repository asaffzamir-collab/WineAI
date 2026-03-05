import { NextResponse } from 'next/server';
import type { WineData } from '@/lib/openai';
import { findCachedWines, cacheTasteSpectrum, findCachedImageUrl } from '@/lib/wine-cache';
import { requireUsage } from '@/lib/require-usage';
import { incrementUsage } from '@/lib/usage';
import { notifyAdminUsageThreshold } from '@/lib/notify-admin';

async function fillCachedImages(wines: WineData[]): Promise<void> {
  for (const w of wines) {
    if (!w.image_url) {
      try {
        const cached = await findCachedImageUrl(w.name, w.winery);
        if (cached) w.image_url = cached.url;
      } catch { /* best-effort */ }
    }
  }
}

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  const t0 = performance.now();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch (parseErr) {
    console.error('Failed to parse request body:', parseErr);
    return NextResponse.json(
      { error: 'Invalid request. The image may be too large — please try a smaller photo.' },
      { status: 400 }
    );
  }

  try {
    const { query, image, imageMimeType, userId } = body;

    if (userId) {
      const usageBlock = await requireUsage(userId as string, 'wine_search');
      if (usageBlock) return usageBlock;
    }

    const tSetup = performance.now();

    const { searchWinesByText, searchWineByImage } = await import('@/lib/openai');

    const tImport = performance.now();

    if (image) {
      const wine = await searchWineByImage(image as string, (imageMimeType as string) || 'image/jpeg');
      const tSearch = performance.now();
      if (!wine) {
        return NextResponse.json(
          { error: 'Could not identify wine. Please try a clearer image of the wine label, or search by name.' },
          { status: 200 }
        );
      }
      await fillCachedImages([wine]);
      if (wine.taste_spectrum && typeof wine.taste_spectrum.body === 'number') {
        cacheTasteSpectrum(wine.name, wine.winery, wine.taste_spectrum).catch(() => {});
      }
      if (userId) {
        incrementUsage(userId as string, 'wine_search').then(({ thresholdHit }) => {
          if (thresholdHit) notifyAdminUsageThreshold(userId as string, 'wine_search', thresholdHit);
        }).catch(() => {});
      }
      return NextResponse.json({
        wine, match: null,
        _timing: {
          setup_ms: Math.round(tSetup - t0),
          import_ms: Math.round(tImport - tSetup),
          search_ms: Math.round(tSearch - tImport),
          total_ms: Math.round(performance.now() - t0),
        },
      });
    }

    if (query) {
      const cached = await findCachedWines(query as string);
      const wines = cached.length > 0
        ? cached
        : await searchWinesByText(query as string);

      const tSearch = performance.now();

      if (wines.length === 0) {
        return NextResponse.json(
          { error: 'Could not find any matching wines. Try a different spelling or add the winery name.' },
          { status: 200 }
        );
      }

      await fillCachedImages(wines);

      for (const w of wines) {
        if (w.taste_spectrum && typeof w.taste_spectrum.body === 'number') {
          cacheTasteSpectrum(w.name, w.winery, w.taste_spectrum).catch(() => {});
        }
      }

      if (userId) {
        incrementUsage(userId as string, 'wine_search').then(({ thresholdHit }) => {
          if (thresholdHit) notifyAdminUsageThreshold(userId as string, 'wine_search', thresholdHit);
        }).catch(() => {});
      }

      const timing = {
        setup_ms: Math.round(tSetup - t0),
        import_ms: Math.round(tImport - tSetup),
        search_ms: Math.round(tSearch - tImport),
        total_ms: Math.round(performance.now() - t0),
        cached: cached.length > 0,
      };

      if (wines.length === 1) {
        return NextResponse.json({ wine: wines[0], match: null, _timing: timing });
      }
      return NextResponse.json({ wines, _timing: timing });
    }

    return NextResponse.json(
      { error: 'No query or image provided' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Wine search error:', error);
    return NextResponse.json(
      { error: 'Search failed. Please try again.' },
      { status: 500 }
    );
  }
}
