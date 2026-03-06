/**
 * Server-side wine image fetcher.
 *
 * DB-first strategy: checks the `wines` table for a cached image_url before
 * hitting external sources. Once fetched, the URL is persisted to the DB
 * so subsequent requests never hit external APIs again.
 *
 * Strategy: Serper.dev image search (licensed Google Images API) finds
 * wine bottle product images from across the web.
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

const SERPER_TIMEOUT_MS = 10_000;
const MIN_IMAGE_BYTES = 5_000;

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

function normalizeImageUrl(url: string): string {
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('http://')) return url.replace('http://', 'https://');
  return url;
}

const HEBREW_RE = /[\u0590-\u05FF]/;

function containsHebrew(text: string): boolean {
  return HEBREW_RE.test(text);
}

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

// ───────────── Image validation ─────────────

const TRUSTED_IMAGE_HOSTS = [
  'images.vivino.com',
  'images.wine-searcher.net',
  'wineenthusiast.com',
  'jamesuckling.com',
  'winespectator.com',
];

function isTrustedImageHost(url: string): boolean {
  const lower = url.toLowerCase();
  return TRUSTED_IMAGE_HOSTS.some((host) => lower.includes(host));
}

function looksHallucinated(url: string): boolean {
  const pathOnly = url.replace(/^https?:\/\/[^/]+/, '');
  if (/(.{2,4})\1{10,}/.test(pathOnly)) return true;
  if (pathOnly.length > 300) return true;
  if (/\/0{5,}\./.test(pathOnly)) return true;
  return false;
}

async function validateImageUrl(url: string): Promise<string | null> {
  if (looksHallucinated(url)) {
    console.warn(`[wine-image] Rejected hallucinated/placeholder URL: ${url.slice(0, 120)}`);
    return null;
  }
  if (isTrustedImageHost(url)) return url;

  for (const method of ['HEAD', 'GET'] as const) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5_000);
      const res = await fetch(url, {
        method,
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'User-Agent': USER_AGENT, ...(method === 'GET' ? { Range: 'bytes=0-0' } : {}) },
      });
      clearTimeout(timeout);

      if (!res.ok) {
        if (method === 'HEAD') continue;
        console.warn(`[wine-image] URL validation failed (${res.status}): ${url}`);
        return null;
      }

      const contentType = res.headers.get('content-type') || '';
      if (method === 'GET' && contentType && !contentType.startsWith('image/')) {
        console.warn(`[wine-image] Not an image (${contentType}): ${url}`);
        return null;
      }

      const contentLength = Number(res.headers.get('content-length') || 0);
      if (contentLength > 0 && contentLength < MIN_IMAGE_BYTES) {
        console.warn(`[wine-image] Image too small (${contentLength}B): ${url}`);
        return null;
      }

      return url;
    } catch {
      if (method === 'HEAD') continue;
      console.warn(`[wine-image] URL validation error: ${url}`);
      return null;
    }
  }
  return null;
}

// ───────────── Image filtering ─────────────

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

// ───────────── Serper.dev image search ─────────────

interface SerperImage {
  imageUrl?: string;
  title?: string;
  source?: string;
}

async function searchViaSerper(query: string): Promise<WineImageResult | null> {
  const apiKey = process.env.SERPER_API_KEY?.trim();
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SERPER_TIMEOUT_MS);

  try {
    const res = await fetch('https://google.serper.dev/images', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        q: `${query} wine bottle`,
        num: 10,
      }),
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.error(`[wine-image] Serper returned ${res.status} for: "${query}"`);
      return null;
    }

    const data = await res.json();
    const images: SerperImage[] = data?.images ?? [];

    for (const img of images) {
      const rawUrl = img.imageUrl;
      if (!rawUrl) continue;

      const url = normalizeImageUrl(rawUrl);
      if (isUnwantedImage(url)) continue;
      if (looksHallucinated(url)) continue;

      const validated = await validateImageUrl(url);
      if (validated) {
        return { url: validated, source: detectSource(validated) };
      }
    }

    console.warn(`[wine-image] Serper: no valid image for: "${query}"`);
    return null;
  } catch (err: unknown) {
    clearTimeout(timeout);
    const isAbort =
      (err instanceof DOMException && err.name === 'AbortError') ||
      (err instanceof Error && err.name === 'AbortError');
    console.error(
      `[wine-image] Serper ${isAbort ? 'timed out' : 'failed'} for: "${query}"`,
      isAbort ? '' : err,
    );
    return null;
  }
}

// ───────────── Combined fetch ─────────────

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

  const result = await searchViaSerper(query);
  if (result) {
    await cacheImageUrl(wineName, winery, result.url, result.source);
    return result;
  }

  // Retry with just the wine name for broader results
  if (containsHebrew(wineName)) {
    const transliteratedName = await transliterateHebrew(wineName);
    if (transliteratedName !== query) {
      const retry = await searchViaSerper(transliteratedName);
      if (retry) {
        await cacheImageUrl(wineName, winery, retry.url, retry.source);
        return retry;
      }
    }
  }

  await cacheNegativeResult(wineName, winery);
  return null;
}

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
