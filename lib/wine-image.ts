/**
 * Server-side wine image fetcher.
 *
 * DB-first strategy: checks the `wines` table for a cached image_url before
 * hitting external sources. Once fetched, the URL is persisted to the DB
 * so subsequent requests never hit external APIs again.
 *
 * Strategy 1: Google Image Search (extracts Vivino/wine-retailer image URLs).
 * Strategy 2: Wine-Searcher scraping (independent CDN).
 * Strategy 3: OpenAI web search fallback (costs API credits, last resort).
 *
 * Negative-cache: failed lookups are remembered so the same wine
 * doesn't keep hammering external services on every page load.
 */

import {
  findCachedImageUrl,
  cacheImageUrl,
  isNegativelyCached,
  cacheNegativeResult,
} from '@/lib/wine-cache';

const FETCH_TIMEOUT_MS = 15_000;

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
];

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function normalizeImageUrl(url: string): string {
  if (url.startsWith('//')) return `https:${url}`;
  return url;
}

/** Shared browser-like headers that reduce bot-detection fingerprinting. */
function browserHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    'User-Agent': randomUA(),
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    ...extra,
  };
}

function detectChallengePage(html: string): boolean {
  const markers = ['cf-challenge', 'Checking your browser', 'cf-turnstile', 'challenge-platform', 'px-captcha'];
  return markers.some((m) => html.includes(m));
}

// ───────────── Strategy 1: Google Image Search ─────────────

const WINE_IMAGE_HOSTS = [
  'images.vivino.com',
  'images.wine-searcher.net',
  'winelibrary.com',
  'bottleraiders.com',
  'wine.com',
];

function isWineImageUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (WINE_IMAGE_HOSTS.some((host) => lower.includes(host))) return true;
  if (/\.(?:jpg|jpeg|png|webp)(?:\?|$)/i.test(url) && /wine|bottle|vivino|winery/i.test(url)) return true;
  return false;
}

function isUnwantedImage(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes('logo') ||
    lower.includes('icon') ||
    lower.includes('flag') ||
    lower.includes('avatar') ||
    lower.includes('placeholder') ||
    lower.includes('default') ||
    lower.includes('/press/') ||
    lower.includes('/web/') ||
    lower.includes('_40x') ||
    lower.includes('_80x') ||
    lower.includes('_32x') ||
    lower.includes('/30/') ||
    lower.includes('/40/') ||
    lower.includes('/60/')
  );
}

async function scrapeGoogleImages(query: string): Promise<string | null> {
  const searchQuery = `${query} wine bottle`;
  const url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&tbm=isch`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: browserHeaders({
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }),
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.error(`[wine-image] Google Images returned ${res.status} for: "${query}"`);
      return null;
    }

    const html = await res.text();
    if (!html || html.length < 1000) {
      console.error(`[wine-image] Google Images HTML too short (${html.length}) for: "${query}"`);
      return null;
    }

    // Extract Vivino image URLs first (highest priority — reliable wine bottle images)
    const vivinoRegex = /https?:\/\/images\.vivino\.com\/thumbs\/[^\s"'<>&\\]+/g;
    const vivinoMatches = Array.from(new Set(html.match(vivinoRegex) ?? []));
    for (const img of vivinoMatches) {
      if (!isUnwantedImage(img)) return normalizeImageUrl(img);
    }

    // Extract other wine-related image URLs
    const generalRegex = /https?:\/\/[^\s"'<>&\\]+\.(?:jpg|jpeg|png|webp)/gi;
    const allImages = Array.from(new Set(html.match(generalRegex) ?? []));
    for (const img of allImages) {
      if (isWineImageUrl(img) && !isUnwantedImage(img)) return normalizeImageUrl(img);
    }

    console.warn(`[wine-image] Google Images: no wine image found for: "${query}"`);
    return null;
  } catch (err: unknown) {
    clearTimeout(timeout);
    const isAbort =
      (err instanceof DOMException && err.name === 'AbortError') ||
      (err instanceof Error && err.name === 'AbortError');
    console.error(
      `[wine-image] Google Images ${isAbort ? 'timed out' : 'failed'} for: "${query}"`,
      isAbort ? '' : err,
    );
    return null;
  }
}

// ───────────── Strategy 2: Wine-Searcher scraping ─────────────

async function scrapeWineSearcher(query: string): Promise<string | null> {
  const slug = query.toLowerCase().replace(/[^a-z0-9]+/g, '+');
  const searchUrl = `https://www.wine-searcher.com/find/${encodeURIComponent(slug)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(searchUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: browserHeaders({
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        Referer: 'https://www.wine-searcher.com/',
      }),
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`[wine-image] Wine-Searcher returned ${response.status} for: "${query}"`);
      return null;
    }

    const html = await response.text();

    if (detectChallengePage(html)) {
      console.error(`[wine-image] Wine-Searcher challenge page for: "${query}"`);
      return null;
    }

    const wsImgRegex = /(?:https?:)?\/\/images\.wine-searcher\.net\/[^"'\s)&]+\.(?:jpg|jpeg|png|webp)/gi;
    let match: RegExpExecArray | null;
    while ((match = wsImgRegex.exec(html)) !== null) {
      const url = match[0];
      if (isUnwantedImage(url)) continue;
      return normalizeImageUrl(url);
    }

    const ogMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)
      || html.match(/<meta\s+content="([^"]+)"\s+property="og:image"/i);
    if (ogMatch?.[1] && !isUnwantedImage(ogMatch[1])) {
      return normalizeImageUrl(ogMatch[1]);
    }

    console.warn(`[wine-image] No image in Wine-Searcher for: "${query}"`);
    return null;
  } catch (err: unknown) {
    clearTimeout(timeout);
    const isAbort =
      (err instanceof DOMException && err.name === 'AbortError') ||
      (err instanceof Error && err.name === 'AbortError');
    console.error(
      `[wine-image] Wine-Searcher ${isAbort ? 'timed out' : 'failed'} for: "${query}"`,
      isAbort ? '' : err,
    );
    return null;
  }
}

// ───────────── Strategy 3: OpenAI web search fallback ─────────────

async function searchViaOpenAI(query: string): Promise<string | null> {
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
      return normalizeImageUrl(urlMatch[0]);
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

// ───────────── Combined fetch with multi-source fallback ─────────────

async function fetchWineImage(wineName: string, winery: string): Promise<string | null> {
  const query = `${winery} ${wineName}`.trim();
  if (!query) return null;

  // Strategy 1: Google Image Search (fast, reliable from server IPs)
  const googleResult = await scrapeGoogleImages(query);
  if (googleResult) return googleResult;

  // Strategy 2: Wine-Searcher scraping
  const wsResult = await scrapeWineSearcher(query);
  if (wsResult) return wsResult;

  // Retry Google with just wine name for broader results
  if (wineName !== query) {
    const retryGoogle = await scrapeGoogleImages(wineName);
    if (retryGoogle) return retryGoogle;
  }

  // Strategy 3: OpenAI web search (last resort, costs API credits)
  const aiResult = await searchViaOpenAI(query);
  if (aiResult) return aiResult;

  return null;
}

/**
 * Fetch a wine bottle image URL. Checks the DB first (positive and negative
 * cache); falls back to external sources and persists the result.
 */
export async function fetchWineImageUrl(
  wineName: string,
  winery: string,
): Promise<string | null> {
  const cached = await findCachedImageUrl(wineName, winery);
  if (cached) return cached;

  if (await isNegativelyCached(wineName, winery)) return null;

  const imageUrl = await fetchWineImage(wineName, winery);

  if (imageUrl) {
    await cacheImageUrl(wineName, winery, imageUrl);
  } else {
    await cacheNegativeResult(wineName, winery);
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
