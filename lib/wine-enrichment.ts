/**
 * Vivino data enrichment via direct API.
 *
 * Two-step approach:
 *   1. Find the Vivino wine ID (Google scrape → OpenAI web search fallback)
 *   2. Call Vivino's JSON API at /api/wines/{id}/tastes for real taste data
 *
 * This replaces the previous approach of asking OpenAI to read Vivino's
 * client-rendered taste sliders, which produced hallucinated values.
 */

import type { WineData, TasteSpectrum } from '@/lib/openai';
import { cacheEnrichmentData } from '@/lib/wine-cache';

const FETCH_TIMEOUT_MS = 15_000;
const HEBREW_RE = /[\u0590-\u05FF]/;

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
];

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function browserHeaders(): Record<string, string> {
  return {
    'User-Agent': randomUA(),
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
  };
}

// In-memory caches — prevent redundant lookups within a serverless invocation
const enrichedKeys = new Set<string>();
const wineIdCache = new Map<string, number | null>();

function enrichmentKey(name: string, winery: string): string {
  return `${name}|||${winery}`.toLowerCase();
}

// ───────────── Step 1: Find Vivino Wine ID ─────────────

/**
 * Transliterate Hebrew text to English for search queries.
 */
async function transliterateIfHebrew(text: string): Promise<string> {
  if (!HEBREW_RE.test(text)) return text;
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
              'Transliterate the following Hebrew wine name/winery to English. Keep grape variety names in their standard English form. Return ONLY the English transliteration, nothing else.',
          },
          { role: 'user', content: text },
        ],
      }),
    });
    clearTimeout(timeout);
    if (!res.ok) return text;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() || text;
  } catch {
    return text;
  }
}

const WINE_ID_RE = /\/w\/(\d+)/;

/**
 * Extract Vivino wine IDs from a block of text/HTML by matching /w/{digits} patterns.
 */
function extractWineIds(text: string): number[] {
  const ids = new Set<number>();
  const re = /\/w\/(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    ids.add(Number(m[1]));
  }
  return Array.from(ids);
}

/**
 * Search Google for a Vivino wine page and extract the wine ID.
 */
async function findViaGoogle(query: string): Promise<number | null> {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(`site:vivino.com ${query} wine`)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(searchUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        ...browserHeaders(),
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[wine-enrichment] Google returned ${res.status} for: "${query}"`);
      return null;
    }

    const html = await res.text();
    if (html.length < 500) return null;

    const ids = extractWineIds(html);
    if (ids.length > 0) {
      console.log(`[wine-enrichment] Google found Vivino wine ID ${ids[0]} for: "${query}"`);
      return ids[0];
    }

    return null;
  } catch (err: unknown) {
    clearTimeout(timeout);
    const isAbort =
      (err instanceof DOMException && err.name === 'AbortError') ||
      (err instanceof Error && err.name === 'AbortError');
    console.warn(`[wine-enrichment] Google search ${isAbort ? 'timed out' : 'failed'} for: "${query}"`);
    return null;
  }
}

/**
 * Fallback: use OpenAI web search to find the Vivino wine URL.
 * Only asks for the URL (not taste data), which is reliable.
 */
async function findViaOpenAI(query: string): Promise<number | null> {
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
        input: `Find the Vivino.com wine page URL for: "${query}". The URL contains "/w/" followed by a numeric ID. Return ONLY the full Vivino URL, nothing else. Example: https://www.vivino.com/en/some-wine/w/12345`,
      }),
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = await res.json();
    const text: string =
      data?.output?.find((o: { type: string }) => o.type === 'message')?.content
        ?.find((c: { type: string }) => c.type === 'output_text')?.text
      ?? '';

    const match = text.match(WINE_ID_RE);
    if (match) {
      const id = Number(match[1]);
      console.log(`[wine-enrichment] OpenAI found Vivino wine ID ${id} for: "${query}"`);
      return id;
    }

    return null;
  } catch (err: unknown) {
    clearTimeout(timeout);
    const isAbort =
      (err instanceof DOMException && err.name === 'AbortError') ||
      (err instanceof Error && err.name === 'AbortError');
    console.warn(`[wine-enrichment] OpenAI search ${isAbort ? 'timed out' : 'failed'} for: "${query}"`);
    return null;
  }
}

/**
 * Find the Vivino wine ID for a given wine name + winery.
 * Tries Google first, then falls back to OpenAI web search.
 */
async function findVivinoWineId(name: string, winery: string): Promise<number | null> {
  const key = enrichmentKey(name, winery);
  if (wineIdCache.has(key)) return wineIdCache.get(key)!;

  const rawQuery = `${winery} ${name}`.trim();
  const query = await transliterateIfHebrew(rawQuery);

  let id = await findViaGoogle(query);

  if (!id) {
    // Retry Google with just the wine name for broader results
    const nameOnly = await transliterateIfHebrew(name);
    if (nameOnly !== query) {
      id = await findViaGoogle(nameOnly);
    }
  }

  if (!id) {
    id = await findViaOpenAI(query);
  }

  wineIdCache.set(key, id);
  return id;
}

// ───────────── Step 2: Fetch Real Taste Data from Vivino API ─────────────

interface VivinoStructure {
  acidity: number | null;
  fizziness: number | null;
  intensity: number | null;
  sweetness: number | null;
  tannin: number | null;
}

/**
 * Convert a Vivino 1-5 scale value to our 0-100 scale.
 * Returns 0 for null values (e.g. tannin for white wines).
 */
function vivinoToPercent(value: number | null): number {
  if (value == null) return 0;
  return Math.round(((value - 1) / 4) * 100);
}

/**
 * Call Vivino's tastes API and return the taste spectrum.
 */
async function fetchVivinoTastes(wineId: number): Promise<TasteSpectrum | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(`https://www.vivino.com/api/wines/${wineId}/tastes`, {
      signal: controller.signal,
      headers: { 'User-Agent': randomUA() },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[wine-enrichment] Vivino tastes API returned ${res.status} for wine ${wineId}`);
      return null;
    }

    const data = await res.json();
    const structure: VivinoStructure | undefined = data?.tastes?.structure;

    if (!structure) {
      console.warn(`[wine-enrichment] No taste structure in Vivino response for wine ${wineId}`);
      return null;
    }

    // Vivino needs at least some data to be useful
    if (structure.intensity == null && structure.acidity == null) {
      console.warn(`[wine-enrichment] Vivino has no taste data for wine ${wineId}`);
      return null;
    }

    const spectrum: TasteSpectrum = {
      body: vivinoToPercent(structure.intensity),
      tannin: vivinoToPercent(structure.tannin),
      sweetness: vivinoToPercent(structure.sweetness),
      acidity: vivinoToPercent(structure.acidity),
    };

    console.log(`[wine-enrichment] Vivino API taste data for wine ${wineId}:`, JSON.stringify(spectrum));
    return spectrum;
  } catch (err: unknown) {
    clearTimeout(timeout);
    const isAbort =
      (err instanceof DOMException && err.name === 'AbortError') ||
      (err instanceof Error && err.name === 'AbortError');
    console.warn(
      `[wine-enrichment] Vivino API ${isAbort ? 'timed out' : 'failed'} for wine ${wineId}`,
      isAbort ? '' : err,
    );
    return null;
  }
}

// ───────────── Public API ─────────────

/**
 * Enrich a WineData object with real Vivino taste data.
 * Mutates the wine in-place and caches enriched data to DB.
 * Returns the same wine object (enriched or unchanged on failure).
 */
export async function enrichWineData(wine: WineData): Promise<WineData> {
  const key = enrichmentKey(wine.name, wine.winery);
  if (enrichedKeys.has(key)) return wine;

  const wineId = await findVivinoWineId(wine.name, wine.winery);
  enrichedKeys.add(key);

  if (!wineId) {
    console.log(`[wine-enrichment] Could not find Vivino ID for: "${wine.winery} ${wine.name}"`);
    return wine;
  }

  const spectrum = await fetchVivinoTastes(wineId);
  if (!spectrum) return wine;

  wine.taste_spectrum = spectrum;

  cacheEnrichmentData(wine.name, wine.winery, { taste_spectrum: spectrum }).catch(() => {});

  return wine;
}
