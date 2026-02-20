/**
 * Server-side wine image fetcher.
 *
 * DB-first strategy: checks the `wines` table for a cached image_url before
 * scraping Vivino. Once fetched from Vivino, the URL is persisted to the DB
 * so subsequent requests never hit Vivino again.
 */

import { findCachedImageUrl, cacheImageUrl } from '@/lib/wine-cache';

const FETCH_TIMEOUT_MS = 15_000;

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
];

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

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
    console.warn('[wine-image] Failed to parse Vivino preloaded state:', err);
  }

  return null;
}

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

async function scrapeVivinoImageOnce(
  query: string,
): Promise<string | null> {
  const searchUrl = `https://www.vivino.com/search/wines?q=${encodeURIComponent(query)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(searchUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': randomUA(),
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`[wine-image] Vivino returned ${response.status} for query: "${query}"`);
      return null;
    }

    const html = await response.text();

    if (!html || html.length < 500) {
      console.error(`[wine-image] Vivino returned unexpectedly short HTML (${html.length} chars) for: "${query}"`);
      return null;
    }

    const imageUrl = extractImageFromPreloadedState(html) || extractImageFromHtml(html);
    if (!imageUrl) {
      console.warn(`[wine-image] No image found in Vivino HTML for: "${query}" (HTML length: ${html.length})`);
    }
    return imageUrl;
  } catch (err: unknown) {
    clearTimeout(timeout);
    const isAbort =
      (err instanceof DOMException && err.name === 'AbortError') ||
      (err instanceof Error && err.name === 'AbortError');
    if (isAbort) {
      console.error(`[wine-image] Vivino fetch timed out (${FETCH_TIMEOUT_MS}ms) for: "${query}"`);
    } else {
      console.error(`[wine-image] Vivino fetch error for: "${query}"`, err);
    }
    return null;
  }
}

/**
 * Scrape Vivino with one automatic retry after 1s on failure.
 */
async function scrapeVivinoImage(
  wineName: string,
  winery: string,
): Promise<string | null> {
  const query = `${winery} ${wineName}`.trim();
  if (!query) return null;

  const first = await scrapeVivinoImageOnce(query);
  if (first) return first;

  await new Promise((r) => setTimeout(r, 1000));
  return scrapeVivinoImageOnce(query);
}

/**
 * Fetch a wine bottle image URL. Checks the DB first; falls back to
 * Vivino scraping and persists the result for future use.
 */
export async function fetchWineImageUrl(
  wineName: string,
  winery: string,
): Promise<string | null> {
  const cached = await findCachedImageUrl(wineName, winery);
  if (cached) return cached;

  const imageUrl = await scrapeVivinoImage(wineName, winery);

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
