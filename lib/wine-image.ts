/**
 * Server-side wine image fetcher.
 *
 * DB-first strategy: checks the `wines` table for a cached image_url before
 * hitting external sources. Once fetched, the URL is persisted to the DB
 * so subsequent requests never hit external APIs again.
 *
 * Strategy 0: Vivino-targeted Google search (site:vivino.com).
 * Strategy 1: Google Image Search (extracts wine-retailer image URLs).
 * Strategy 2: Wine-Searcher scraping (independent CDN).
 * Strategy 3: OpenAI web search fallback (costs API credits, last resort).
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
import { createAdminClient } from '@/lib/supabase/server';

const FETCH_TIMEOUT_MS = 15_000;
const MIN_IMAGE_BYTES = 5_000;

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
      headers: { 'User-Agent': randomUA() },
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
  // Social media
  'instagram.com', 'facebook.com', 'fbcdn.net', 'twitter.com', 'x.com/pic',
  'pinterest.com', 'pinimg.com', 'reddit.com', 'redditmedia.com',
  'tiktok.com', 'youtube.com', 'ytimg.com',
  // Stock photo sites
  'shutterstock.com', 'gettyimages.com', 'alamy.com', 'istockphoto.com',
  'dreamstime.com', 'depositphotos.com', 'stock.adobe.com',
  // Common non-product patterns in URLs
  'profile_image', 'user_photo', 'banner', 'header', 'background',
  'thumbnail_small', 'emoji', 'sticker', 'badge',
];

function isUnwantedImage(url: string): boolean {
  const lower = url.toLowerCase();
  return UNWANTED_URL_PATTERNS.some((p) => lower.includes(p));
}

// ───────────── Strategy 0 & 1: Google Image Search ─────────────

async function scrapeGoogleImages(query: string, siteRestrict?: string): Promise<string | null> {
  const searchQuery = siteRestrict
    ? `${query} wine bottle site:${siteRestrict}`
    : `${query} wine bottle product`;
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

    const generalRegex = /https?:\/\/[^\s"'<>&\\]+\.(?:jpg|jpeg|png|webp)/gi;
    const allImages = Array.from(new Set(html.match(generalRegex) ?? []));

    const candidates = allImages.filter((img) => {
      const lower = img.toLowerCase();
      if (lower.includes('google.com') || lower.includes('gstatic.com') || lower.includes('googleapis.com')) return false;
      if (isUnwantedImage(img)) return false;
      return true;
    });

    // Prioritize known wine retailer CDN URLs
    const priority = candidates.filter((u) => WINE_IMAGE_HOSTS.some((h) => u.toLowerCase().includes(h)));
    const others = candidates.filter((u) => !WINE_IMAGE_HOSTS.some((h) => u.toLowerCase().includes(h)));
    const ordered = [...priority, ...others];

    for (const img of ordered.slice(0, 5)) {
      const validated = await validateImageUrl(normalizeImageUrl(img));
      if (validated) return validated;
    }

    console.warn(`[wine-image] Google Images: no valid image in ${ordered.length} candidates for: "${query}"`);
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
      const validated = await validateImageUrl(normalizeImageUrl(url));
      if (validated) return validated;
    }

    const ogMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)
      || html.match(/<meta\s+content="([^"]+)"\s+property="og:image"/i);
    if (ogMatch?.[1] && !isUnwantedImage(ogMatch[1])) {
      const validated = await validateImageUrl(normalizeImageUrl(ogMatch[1]));
      if (validated) return validated;
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
      const validated = await validateImageUrl(normalizeImageUrl(urlMatch[0]));
      if (validated) return validated;
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
  const rawQuery = `${winery} ${wineName}`.trim();
  if (!rawQuery) return null;

  // Transliterate Hebrew to English for better search results
  const query = await transliterateHebrew(rawQuery);

  // Strategy 0: Vivino-targeted Google search (most reliable product images)
  const vivinoResult = await scrapeGoogleImages(query, 'vivino.com');
  if (vivinoResult) return vivinoResult;

  // Strategy 1: General Google Image Search with enhanced filtering
  const googleResult = await scrapeGoogleImages(query);
  if (googleResult) return googleResult;

  // Strategy 2: Wine-Searcher scraping
  const wsResult = await scrapeWineSearcher(query);
  if (wsResult) return wsResult;

  // Retry Google with just the wine name for broader results
  const transliteratedName = await transliterateHebrew(wineName);
  if (transliteratedName !== query) {
    const retryGoogle = await scrapeGoogleImages(transliteratedName);
    if (retryGoogle) return retryGoogle;
  }

  // Strategy 3: OpenAI web search (last resort, costs API credits)
  const aiResult = await searchViaOpenAI(query);
  if (aiResult) return aiResult;

  return null;
}

// ───────────── Self-host: upload to Supabase Storage ─────────────

const STORAGE_BUCKET = 'wine-images';
let bucketVerified = false;

function imageStoragePath(wineName: string, winery: string, ext: string): string {
  const slug = `${winery}_${wineName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
  return `${slug}.${ext}`;
}

async function uploadToStorage(externalUrl: string, wineName: string, winery: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch(externalUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': randomUA() },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const bytes = await res.arrayBuffer();
    if (bytes.byteLength < MIN_IMAGE_BYTES) return null;

    const supabase = createAdminClient();
    const path = imageStoragePath(wineName, winery, ext);

    if (!bucketVerified) {
      const { error: bucketErr } = await supabase.storage.getBucket(STORAGE_BUCKET);
      if (bucketErr) {
        await supabase.storage.createBucket(STORAGE_BUCKET, { public: true });
      }
      bucketVerified = true;
    }

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, bytes, { contentType, upsert: true });

    if (error) {
      console.error(`[wine-image] Storage upload failed for "${wineName}":`, error.message);
      return null;
    }

    const { data: publicUrl } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    console.log(`[wine-image] Self-hosted: ${publicUrl.publicUrl}`);
    return publicUrl.publicUrl;
  } catch (err) {
    console.error(`[wine-image] Storage upload error for "${wineName}":`, err);
    return null;
  }
}

/**
 * Fetch a wine bottle image URL. Checks the DB first (positive and negative
 * cache); falls back to external sources, self-hosts the image in Supabase
 * Storage, and persists the self-hosted URL.
 */
export async function fetchWineImageUrl(
  wineName: string,
  winery: string,
): Promise<string | null> {
  const cached = await findCachedImageUrl(wineName, winery);
  if (cached) {
    const valid = await validateImageUrl(cached);
    if (valid) return valid;
    await clearCachedImageUrl(wineName, winery);
    console.warn(`[wine-image] Cleared stale cached URL for: "${wineName}" / "${winery}"`);
  }

  if (await isNegativelyCached(wineName, winery)) return null;

  const externalUrl = await fetchWineImage(wineName, winery);

  if (externalUrl) {
    const selfHostedUrl = await uploadToStorage(externalUrl, wineName, winery);
    const finalUrl = selfHostedUrl || externalUrl;
    await cacheImageUrl(wineName, winery, finalUrl);
    return finalUrl;
  } else {
    await cacheNegativeResult(wineName, winery);
  }

  return null;
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
