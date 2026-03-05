/**
 * Server-side wine image fetcher.
 *
 * DB-first strategy: checks the `wines` table for a cached image_url before
 * hitting external sources. Once fetched, the URL is persisted to the DB
 * so subsequent requests never hit external APIs again.
 *
 * Strategy 1: Vertex AI Search (legitimate Google Cloud API).
 * Strategy 2: OpenAI web search fallback (costs API credits, last resort).
 *
 * Hebrew wine names are transliterated to English before searching.
 *
 * Negative-cache: failed lookups are remembered so the same wine
 * doesn't keep hammering external services on every page load.
 */

import {
  findCachedImageUrl,
  cacheImageUrl,
  clearCachedImageUrl,
  isNegativelyCached,
  cacheNegativeResult,
} from '@/lib/wine-cache';

export interface WineImageResult {
  url: string;
  source: string;
}

const FETCH_TIMEOUT_MS = 15_000;
const MIN_IMAGE_BYTES = 5_000;

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

function normalizeImageUrl(url: string): string {
  if (url.startsWith('//')) return `https:${url}`;
  return url;
}

const HEBREW_RE = /[\u0590-\u05FF]/;

function containsHebrew(text: string): boolean {
  return HEBREW_RE.test(text);
}

/**
 * Transliterate/translate a Hebrew wine name to English using OpenAI.
 * Returns the original text if no Hebrew is detected or the call fails.
 */
async function transliterateHebrew(text: string): Promise<string> {
  if (!containsHebrew(text)) return text;

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return text;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 120,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content:
              'Transliterate the following Hebrew wine name/winery to English. Keep grape variety names in their standard English form (e.g. שיראז→Shiraz, קברנה סוביניון→Cabernet Sauvignon). Return ONLY the English transliteration, nothing else.',
          },
          { role: 'user', content: text },
        ],
      }),
    });
    clearTimeout(timeout);

    if (!res.ok) return text;
    const data = await res.json();
    const result = data?.choices?.[0]?.message?.content?.trim();
    return result || text;
  } catch {
    return text;
  }
}

/**
 * HEAD-request an image URL and return it only if it responds 200
 * and the content is large enough to be a real product photo.
 */
async function validateImageUrl(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': USER_AGENT },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[wine-image] URL validation failed (${res.status}): ${url}`);
      return null;
    }

    const contentLength = Number(res.headers.get('content-length') || 0);
    if (contentLength > 0 && contentLength < MIN_IMAGE_BYTES) {
      console.warn(`[wine-image] Image too small (${contentLength}B): ${url}`);
      return null;
    }

    return url;
  } catch {
    console.warn(`[wine-image] URL validation error: ${url}`);
    return null;
  }
}

// ───────────── Image filtering ─────────────

const WINE_IMAGE_HOSTS = [
  'images.vivino.com',
  'images.wine-searcher.net',
  'winelibrary.com',
  'bottleraiders.com',
  'wine.com',
  'totalwine.com',
  'klwines.com',
  'wineenthusiast.com',
  'jamesuckling.com',
  'winespectator.com',
  'dalton-winery.com',
  'golanwines.co.il',
  'barkan-winery.com',
];

function isWineImageUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (WINE_IMAGE_HOSTS.some((host) => lower.includes(host))) return true;
  if (/\.(?:jpg|jpeg|png|webp)(?:\?|$)/i.test(url) && /wine|bottle|vivino|winery/i.test(url)) return true;
  return false;
}

const UNWANTED_URL_PATTERNS = [
  'logo', 'icon', 'flag', 'avatar', 'placeholder', 'default',
  '/press/', '/web/',
  '_40x', '_80x', '_32x', '/30/', '/40/', '/60/',
  'instagram.com', 'facebook.com', 'fbcdn.net', 'twitter.com', 'x.com/pic',
  'pinterest.com', 'pinimg.com', 'reddit.com', 'redditmedia.com',
  'tiktok.com', 'youtube.com', 'ytimg.com',
  'shutterstock.com', 'gettyimages.com', 'alamy.com', 'istockphoto.com',
  'dreamstime.com', 'depositphotos.com', 'stock.adobe.com',
  'profile_image', 'user_photo', 'banner', 'header', 'background',
  'thumbnail_small', 'emoji', 'sticker', 'badge',
];

function isUnwantedImage(url: string): boolean {
  const lower = url.toLowerCase();
  return UNWANTED_URL_PATTERNS.some((p) => lower.includes(p));
}

/**
 * Detect the image source domain from a URL for attribution purposes.
 */
export function detectSource(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes('vivino.com')) return 'vivino';
  if (lower.includes('wine-searcher.net')) return 'wine-searcher';
  if (lower.includes('wine.com')) return 'wine.com';
  if (lower.includes('totalwine.com')) return 'totalwine';
  if (lower.includes('klwines.com')) return 'klwines';
  if (lower.includes('winelibrary.com')) return 'winelibrary';
  if (lower.includes('jamesuckling.com')) return 'jamesuckling';
  if (lower.includes('winespectator.com')) return 'winespectator';
  if (lower.includes('wineenthusiast.com')) return 'wineenthusiast';
  return 'web';
}

// ───────────── Strategy 1: Vertex AI Search ─────────────

async function searchViaVertexAI(query: string): Promise<WineImageResult | null> {
  const engineId = process.env.VERTEX_AI_SEARCH_ENGINE_ID;
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  const projectId = process.env.GCP_PROJECT_ID;
  if (!engineId || !apiKey || !projectId) return null;

  const endpoint = `https://discoveryengine.googleapis.com/v1/projects/${projectId}/locations/global/collections/default_collection/engines/${engineId}/servingConfigs/default_search:search?key=${apiKey}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `${query} wine bottle`,
        pageSize: 10,
      }),
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.error(`[wine-image] Vertex AI Search returned ${res.status} for: "${query}"`);
      return null;
    }

    const data = await res.json();
    const results = data?.results ?? [];

    for (const result of results) {
      const doc = result?.document?.derivedStructData ?? {};

      const pagemap = doc.pagemap ?? {};
      const images: string[] = [];

      if (doc.link) {
        const ogImages = pagemap.metatags
          ?.map((t: Record<string, string>) => t['og:image'])
          .filter(Boolean) ?? [];
        images.push(...ogImages);
      }

      const cseImages = pagemap.cse_image?.map((i: { src: string }) => i.src).filter(Boolean) ?? [];
      images.push(...cseImages);

      const cseThumb = pagemap.cse_thumbnail?.map((i: { src: string }) => i.src).filter(Boolean) ?? [];
      images.push(...cseThumb);

      if (doc.thumbnailUrl) images.push(doc.thumbnailUrl);

      for (const imgUrl of images) {
        const normalized = normalizeImageUrl(imgUrl);
        if (isUnwantedImage(normalized)) continue;
        if (!isWineImageUrl(normalized) && !/\.(?:jpg|jpeg|png|webp)(?:\?|$)/i.test(normalized)) continue;

        const validated = await validateImageUrl(normalized);
        if (validated) {
          return { url: validated, source: detectSource(validated) };
        }
      }
    }

    console.warn(`[wine-image] Vertex AI Search: no valid image for: "${query}"`);
    return null;
  } catch (err: unknown) {
    clearTimeout(timeout);
    const isAbort =
      (err instanceof DOMException && err.name === 'AbortError') ||
      (err instanceof Error && err.name === 'AbortError');
    console.error(
      `[wine-image] Vertex AI Search ${isAbort ? 'timed out' : 'failed'} for: "${query}"`,
      isAbort ? '' : err,
    );
    return null;
  }
}

// ───────────── Strategy 2: OpenAI web search fallback ─────────────

async function searchViaOpenAI(query: string): Promise<WineImageResult | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        tools: [{ type: 'web_search_preview' }],
        input: `Find a product image URL for this wine bottle: "${query}". Search on vivino.com, wine-searcher.com, or any wine retailer. I need a direct URL to an image of the wine bottle (not a logo, icon, or generic placeholder). The URL should end in .jpg, .jpeg, .png, or .webp, OR be from images.vivino.com. Return ONLY the image URL, nothing else. If you cannot find one, return "NONE".`,
      }),
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.error(`[wine-image] OpenAI search returned ${res.status} for: "${query}"`);
      return null;
    }

    const data = await res.json();
    const text: string =
      data?.output?.find((o: { type: string }) => o.type === 'message')?.content
        ?.find((c: { type: string }) => c.type === 'output_text')?.text
      ?? '';

    const urlMatch = text.match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)/i)
      || text.match(/https?:\/\/images\.vivino\.com\/[^\s"'<>]+/i)
      || text.match(/https?:\/\/images\.wine-searcher\.net\/[^\s"'<>]+/i);
    if (urlMatch && !isUnwantedImage(urlMatch[0])) {
      const validated = await validateImageUrl(normalizeImageUrl(urlMatch[0]));
      if (validated) {
        return { url: validated, source: detectSource(validated) };
      }
    }

    console.warn(`[wine-image] OpenAI search: no usable URL for: "${query}"`);
    return null;
  } catch (err: unknown) {
    clearTimeout(timeout);
    const isAbort =
      (err instanceof DOMException && err.name === 'AbortError') ||
      (err instanceof Error && err.name === 'AbortError');
    console.error(
      `[wine-image] OpenAI search ${isAbort ? 'timed out' : 'failed'} for: "${query}"`,
      isAbort ? '' : err,
    );
    return null;
  }
}

// ───────────── Combined fetch: Vertex AI -> OpenAI -> placeholder ─────────────

/**
 * Fetch a wine bottle image URL. Checks the DB first (positive and negative
 * cache); falls back to Vertex AI Search and then OpenAI web search.
 * Returns the image URL and its source for attribution.
 */
export async function fetchWineImageUrl(
  wineName: string,
  winery: string,
): Promise<WineImageResult | null> {
  const cached = await findCachedImageUrl(wineName, winery);
  if (cached) {
    const valid = await validateImageUrl(cached.url);
    if (valid) return cached;
    await clearCachedImageUrl(wineName, winery);
    console.warn(`[wine-image] Cleared stale cached URL for: "${wineName}" / "${winery}"`);
  }

  if (isNegativelyCached(wineName, winery)) return null;

  const rawQuery = `${winery} ${wineName}`.trim();
  if (!rawQuery) return null;

  const query = await transliterateHebrew(rawQuery);

  // Strategy 1: Vertex AI Search (primary, legitimate API)
  const vertexResult = await searchViaVertexAI(query);
  if (vertexResult) {
    await cacheImageUrl(wineName, winery, vertexResult.url, vertexResult.source);
    return vertexResult;
  }

  // Strategy 2: OpenAI web search (fallback, legitimate API)
  const openaiResult = await searchViaOpenAI(query);
  if (openaiResult) {
    await cacheImageUrl(wineName, winery, openaiResult.url, openaiResult.source);
    return openaiResult;
  }

  // Retry with just the wine name for broader results
  if (containsHebrew(wineName)) {
    const transliteratedName = await transliterateHebrew(wineName);
    if (transliteratedName !== query) {
      const retryVertex = await searchViaVertexAI(transliteratedName);
      if (retryVertex) {
        await cacheImageUrl(wineName, winery, retryVertex.url, retryVertex.source);
        return retryVertex;
      }
    }
  }

  await cacheNegativeResult(wineName, winery);
  return null;
}

/**
 * Fetch wine images for multiple wines in parallel.
 */
export async function fetchWineImagesForMany(
  wines: Array<{ name: string; winery: string }>,
): Promise<Map<string, WineImageResult | null>> {
  const results = new Map<string, WineImageResult | null>();
  const promises = wines.map(async (w, idx) => {
    const result = await fetchWineImageUrl(w.name, w.winery);
    results.set(`${idx}`, result);
  });
  await Promise.allSettled(promises);
  return results;
}
