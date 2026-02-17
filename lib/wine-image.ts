/**
 * Server-side wine image fetcher.
 * Scrapes Vivino search results to find real wine bottle photos.
 *
 * Vivino uses a React SPA where wine data (including images) is embedded
 * in a `data-preloaded-state` JSON attribute. We parse that JSON to
 * extract reliable image URLs from images.vivino.com.
 */

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const FETCH_TIMEOUT_MS = 8000;

interface CacheEntry {
  url: string | null;
  ts: number;
}

const cache = new Map<string, CacheEntry>();

function getCacheKey(name: string, winery: string): string {
  return `${winery}::${name}`.toLowerCase().trim();
}

function getCached(key: string): string | null | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return undefined;
  }
  return entry.url;
}

function setCache(key: string, url: string | null) {
  cache.set(key, { url, ts: Date.now() });
  if (cache.size > 500) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
}

/**
 * Extract the first wine bottle image from Vivino's preloaded state JSON.
 *
 * The page has a `<div id="search-page" data-preloaded-state="...">` element
 * containing HTML-escaped JSON. Inside the JSON, wine images are at:
 *   search_results.matches[].vintage.image.location
 *   search_results.matches[].vintage.image.variations.bottle_large
 *
 * Image paths are protocol-relative (e.g. //images.vivino.com/thumbs/...).
 */
function extractImageFromPreloadedState(html: string): string | null {
  // Extract the data-preloaded-state attribute value
  const stateMatch = html.match(/data-preloaded-state="([^"]+)"/);
  if (!stateMatch) return null;

  try {
    // Unescape HTML entities (Vivino encodes the JSON in the attribute)
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

      // Prefer the larger bottle variation, fall back to default location
      const location =
        image?.variations?.bottle_large ||
        image?.variations?.bottle_medium ||
        image?.location;

      if (typeof location === 'string' && location.includes('vivino.com')) {
        // Ensure the URL has a protocol
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
 * Catches images that might appear in <img> tags or inline styles.
 */
function extractImageFromHtml(html: string): string | null {
  const imgRegex = /(?:https?:)?\/\/images\.vivino\.com\/thumbs\/[^"'\s)&]+/g;
  let match: RegExpExecArray | null;
  while ((match = imgRegex.exec(html)) !== null) {
    const url = match[0];
    // Skip tiny thumbnails and food/region background images
    if (url.includes('_40x') || url.includes('_80x') || url.includes('_32x')) continue;
    if (url.includes('/foods/') || url.includes('/regions/')) continue;
    const fullUrl = url.startsWith('//') ? `https:${url}` : url;
    return fullUrl;
  }
  return null;
}

/**
 * Fetch a professional wine bottle image URL from Vivino search.
 *
 * @param wineName  The wine name (e.g. "Brunello di Montalcino")
 * @param winery    The winery name (e.g. "Tenuta")
 * @returns         A URL string or null if no image was found
 */
export async function fetchWineImageUrl(
  wineName: string,
  winery: string
): Promise<string | null> {
  const key = getCacheKey(wineName, winery);
  const cached = getCached(key);
  if (cached !== undefined) return cached;

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
      setCache(key, null);
      return null;
    }

    const html = await response.text();

    // Primary: parse structured JSON from preloaded state
    let imageUrl = extractImageFromPreloadedState(html);

    // Fallback: regex scan of the HTML
    if (!imageUrl) {
      imageUrl = extractImageFromHtml(html);
    }

    setCache(key, imageUrl);
    return imageUrl;
  } catch (err: unknown) {
    const isAbort =
      (err instanceof DOMException && err.name === 'AbortError') ||
      (err instanceof Error && err.name === 'AbortError');
    if (isAbort) {
      console.warn(`Vivino image fetch timed out for: ${query}`);
    } else {
      console.warn(`Vivino image fetch failed for: ${query}`, err);
    }
    setCache(key, null);
    return null;
  }
}

/**
 * Fetch wine images for multiple wines in parallel.
 * Useful for candidate lists.
 */
export async function fetchWineImagesForMany(
  wines: Array<{ name: string; winery: string }>
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();
  const promises = wines.map(async (w, idx) => {
    const url = await fetchWineImageUrl(w.name, w.winery);
    results.set(`${idx}`, url);
  });
  await Promise.allSettled(promises);
  return results;
}
