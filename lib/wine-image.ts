/**
 * Server-side wine image fetcher.
 *
 * DB-first strategy: checks the `wines` table for a cached image_url before
 * fetching from Vivino. Once fetched, the URL is persisted to the DB
 * so subsequent requests never hit Vivino again.
 *
 * Primary: Vivino JSON search API (less likely to be CAPTCHA-blocked).
 * Fallback: HTML scraping with challenge detection.
 */

import { findCachedImageUrl, cacheImageUrl } from '@/lib/wine-cache';

const FETCH_TIMEOUT_MS = 15_000;

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
];

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function normalizeImageUrl(url: string): string {
  if (url.startsWith('//')) return `https:${url}`;
  return url;
}

// ───────────── Strategy 1: Vivino JSON API ─────────────

interface VivinoExploreMatch {
  vintage?: {
    image?: {
      location?: string;
      variations?: { bottle_large?: string; bottle_medium?: string; large?: string; medium?: string };
    };
  };
}

async function fetchVivinoJsonApi(query: string): Promise<string | null> {
  const url = `https://www.vivino.com/api/explore/explore?q=${encodeURIComponent(query)}&limit=3`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': randomUA(),
        Accept: 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.error(`[wine-image] Vivino JSON API returned ${res.status} for: "${query}"`);
      return null;
    }

    const data = await res.json();
    const matches: VivinoExploreMatch[] =
      data?.explore_vintage?.matches || data?.matches || [];

    for (const match of matches) {
      const image = match?.vintage?.image;
      if (!image) continue;
      const loc =
        image.variations?.bottle_large ||
        image.variations?.bottle_medium ||
        image.variations?.large ||
        image.variations?.medium ||
        image.location;
      if (typeof loc === 'string' && loc.length > 10) {
        return normalizeImageUrl(loc);
      }
    }

    console.warn(`[wine-image] Vivino JSON API: no image in ${matches.length} matches for: "${query}"`);
    return null;
  } catch (err: unknown) {
    clearTimeout(timeout);
    const isAbort =
      (err instanceof DOMException && err.name === 'AbortError') ||
      (err instanceof Error && err.name === 'AbortError');
    console.error(
      `[wine-image] Vivino JSON API ${isAbort ? 'timed out' : 'failed'} for: "${query}"`,
      isAbort ? '' : err,
    );
    return null;
  }
}

// ───────────── Strategy 2: HTML scraping (fallback) ─────────────

function detectChallengePage(html: string): boolean {
  const markers = ['cf-challenge', 'Checking your browser', 'cf-turnstile', 'challenge-platform'];
  return markers.some((m) => html.includes(m));
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
        return normalizeImageUrl(location);
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
    return normalizeImageUrl(url);
  }
  return null;
}

async function scrapeVivinoHtml(query: string): Promise<string | null> {
  const searchUrl = `https://www.vivino.com/search/wines?q=${encodeURIComponent(query)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(searchUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': randomUA(),
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`[wine-image] Vivino HTML returned ${response.status} for: "${query}"`);
      return null;
    }

    const html = await response.text();

    if (detectChallengePage(html)) {
      console.error(`[wine-image] CAPTCHA/challenge page detected for: "${query}" — Vivino is blocking server IPs`);
      return null;
    }

    if (!html || html.length < 500) {
      console.error(`[wine-image] Vivino HTML too short (${html.length} chars) for: "${query}"`);
      return null;
    }

    const imageUrl = extractImageFromPreloadedState(html) || extractImageFromHtml(html);
    if (!imageUrl) {
      console.warn(`[wine-image] No image in Vivino HTML for: "${query}" (${html.length} chars)`);
    }
    return imageUrl;
  } catch (err: unknown) {
    clearTimeout(timeout);
    const isAbort =
      (err instanceof DOMException && err.name === 'AbortError') ||
      (err instanceof Error && err.name === 'AbortError');
    console.error(
      `[wine-image] Vivino HTML ${isAbort ? 'timed out' : 'failed'} for: "${query}"`,
      isAbort ? '' : err,
    );
    return null;
  }
}

// ───────────── Combined fetch with retry ─────────────

async function fetchFromVivino(wineName: string, winery: string): Promise<string | null> {
  const query = `${winery} ${wineName}`.trim();
  if (!query) return null;

  // Strategy 1: JSON API (fast, structured, less likely to be blocked)
  const jsonResult = await fetchVivinoJsonApi(query);
  if (jsonResult) return jsonResult;

  // Strategy 2: HTML scraping (fallback)
  const htmlResult = await scrapeVivinoHtml(query);
  if (htmlResult) return htmlResult;

  // Retry JSON API once with just the wine name (broader search)
  if (wineName !== query) {
    const retryResult = await fetchVivinoJsonApi(wineName);
    if (retryResult) return retryResult;
  }

  return null;
}

/**
 * Fetch a wine bottle image URL. Checks the DB first; falls back to
 * Vivino and persists the result for future use.
 */
export async function fetchWineImageUrl(
  wineName: string,
  winery: string,
): Promise<string | null> {
  const cached = await findCachedImageUrl(wineName, winery);
  if (cached) return cached;

  const imageUrl = await fetchFromVivino(wineName, winery);

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
