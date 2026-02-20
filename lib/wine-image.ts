/**
 * Server-side wine image fetcher.
 *
 * DB-first strategy: checks the `wines` table for a cached image_url before
 * scraping Vivino. Once fetched from Vivino, the URL is persisted to the DB
 * so subsequent requests never hit Vivino again.
 */

import { findCachedImageUrl, cacheImageUrl } from '@/lib/wine-cache';

const FETCH_TIMEOUT_MS = 8000;

/**
 * Extract the first wine bottle image from Vivino's preloaded state JSON.
 */
function extractImageFromPreloadedState(html: string): string | null {
  const stateMatch = html.match(/data-preloaded-state="([^"]+)"/);
  if (!stateMatch) return null;

  try {
    const raw = stateMatch[1]
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'");

    const data = JSON.parse(raw);
    const matches = data?.search_results?.matches;
    if (!Array.isArray(matches) || matches.length === 0) return null;

    for (const match of matches) {
      const image = match?.vintage?.image;
      if (!image) continue;

      const location =
        image?.variations?.bottle_large ||
        image?.variations?.bottle_medium ||
        image?.location;

      if (typeof location === 'string' && location.includes('vivino.com')) {
        return location.startsWith('//') ? `https:${location}` : location;
      }
    }
  } catch (err) {
    console.warn('Failed to parse Vivino preloaded state:', err);
  }

  return null;
}

/**
 * Fallback: extract wine image URLs directly from HTML using regex.
 */
function extractImageFromHtml(html: string): string | null {
  const imgRegex = /(?:https?:)?\/\/images\.vivino\.com\/thumbs\/[^"'\s)&]+/g;
  let match: RegExpExecArray | null;
  while ((match = imgRegex.exec(html)) !== null) {
    const url = match[0];
    if (url.includes('_40x') || url.includes('_80x') || url.includes('_32x')) continue;
    if (url.includes('/foods/') || url.includes('/regions/')) continue;
    const fullUrl = url.startsWith('//') ? `https:${url}` : url;
    return fullUrl;
  }
  return null;
}

/**
 * Scrape Vivino for a wine bottle image. This is the slow/fragile path
 * used only when no cached image exists.
 */
async function scrapeVivinoImage(
  wineName: string,
  winery: string,
): Promise<string | null> {
  const query = `${winery} ${wineName}`.trim();
  if (!query) return null;

  const searchUrl = `https://www.vivino.com/search/wines?q=${encodeURIComponent(query)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(searchUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`Vivino search returned ${response.status} for query: ${query}`);
      return null;
    }

    const html = await response.text();
    return extractImageFromPreloadedState(html) || extractImageFromHtml(html);
  } catch (err: unknown) {
    const isAbort =
      (err instanceof DOMException && err.name === 'AbortError') ||
      (err instanceof Error && err.name === 'AbortError');
    if (isAbort) {
      console.warn(`Vivino image fetch timed out for: ${query}`);
    } else {
      console.warn(`Vivino image fetch failed for: ${query}`, err);
    }
    return null;
  }
}

/**
 * Fetch a wine bottle image URL. Checks the DB first; falls back to
 * Vivino scraping and persists the result for future use.
 */
export async function fetchWineImageUrl(
  wineName: string,
  winery: string,
): Promise<string | null> {
  // 1. Check DB cache
  const cached = await findCachedImageUrl(wineName, winery);
  if (cached) return cached;

  // 2. Scrape Vivino
  const imageUrl = await scrapeVivinoImage(wineName, winery);

  // 3. Persist to DB for next time
  if (imageUrl) {
    await cacheImageUrl(wineName, winery, imageUrl);
  }

  return imageUrl;
}

/**
 * Fetch wine images for multiple wines in parallel.
 */
export async function fetchWineImagesForMany(
  wines: Array<{ name: string; winery: string }>,
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();
  const promises = wines.map(async (w, idx) => {
    const url = await fetchWineImageUrl(w.name, w.winery);
    results.set(`${idx}`, url);
  });
  await Promise.allSettled(promises);
  return results;
}
