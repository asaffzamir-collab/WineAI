// No static import of 'openai' — package is loaded only when key exists, never at build time
interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}
interface OpenAIClientLike {
  chat: { completions: { create: (opts: unknown) => Promise<ChatCompletionResponse> } };
}

let _openai: OpenAIClientLike | null = null;

async function loadOpenAIClient(): Promise<OpenAIClientLike> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    return new Proxy({} as OpenAIClientLike, {
      get(_, prop) {
        if (prop === 'chat') {
          return {
            completions: {
              create: () =>
                Promise.reject(new Error('OPENAI_API_KEY is not set. Add it in Vercel → Settings → Environment Variables.')),
            },
          };
        }
        return () => Promise.reject(new Error('OPENAI_API_KEY is not set.'));
      },
    });
  }
  const { default: OpenAI } = await import('openai');
  return new OpenAI({ apiKey: key }) as unknown as OpenAIClientLike;
}

/** Lazy client. OpenAI package is only loaded when this runs (at request time), never at build. */
async function getOpenAIClient(): Promise<OpenAIClientLike> {
  if (!_openai) _openai = await loadOpenAIClient();
  return _openai;
}

export interface WineData {
  name: string;
  winery: string;
  vintage?: number;
  vivino_rating?: number;
  vivino_reviews?: number;
  country: string;
  region?: string;
  grapes: string[];
  alcohol?: number;
  volume_ml?: number;
  is_kosher?: boolean;
  wine_type: 'red' | 'white' | 'rose' | 'sparkling' | 'dessert';
  body?: 'light' | 'medium' | 'full';
  sweetness?: 'dry' | 'off-dry' | 'sweet';
  tasting_notes?: {
    nose: string[];
    palate: string[];
    finish: string;
  };
  winery_description?: string;
  serving?: {
    drink_from?: number;
    drink_until?: number;
    decant_minutes?: number;
    temperature_celsius?: string;
  };
  food_pairings?: string[];
  price_range_usd?: string;
  image_url?: string;
  taste_spectrum?: TasteSpectrum;
}

export interface TasteSpectrum {
  body: number;
  tannin: number;
  sweetness: number;
  acidity: number;
}

export interface ProfileMatchResult {
  match_percentage: number;
  explanation?: string;
  positive_matches: string[];
  mismatches: string[];
  similar_wines_note?: string;
  wine_spectrum?: TasteSpectrum;
  profile_spectrum?: TasteSpectrum;
}

const WINE_SEARCH_SYSTEM_PROMPT = `You are a wine expert assistant with extensive knowledge of wines and their ratings. Given a wine query (either a name, description, or image of a wine label), return detailed information about the wine in JSON format.

IMPORTANT: You must return ONLY valid JSON, no markdown, no code blocks, just the raw JSON object.

LANGUAGE: Write ALL descriptive text values in Hebrew (עברית). This includes: winery_description, tasting_notes (nose, palate, finish), food_pairings, and the finish field. Wine names, winery names, grape names, region names, and country names should stay in their original language.

For images: ALWAYS try your best to identify the wine. Read any text visible on the label including winery name, wine name, vintage year, region, grape varieties, etc. Even if you're not 100% certain about the exact wine, make your best educated guess based on what you can see. Use visual cues like label design, bottle shape, and any visible text.

image_url: Always set to null. Wine images are fetched separately from Vivino — do NOT attempt to guess or fabricate image URLs.

Vivino Rating: ALWAYS provide a vivino_rating (1.0-5.0). Use the real Vivino rating if you know it. Otherwise, provide your best estimate based on wine reputation, region, and producer quality. Use conservative round numbers when estimating (e.g. 3.5, 3.8, 4.0, 4.2). Typical ranges: prestigious/iconic wines 4.0-4.6, well-regarded wines 3.8-4.2, solid everyday wines 3.3-3.8, basic wines 3.0-3.3. For vivino_reviews use null unless you know an approximate count.

Return this exact JSON structure:
{
  "name": "Wine name",
  "winery": "Winery name",
  "vintage": 2020,
  "vivino_rating": 4.2,
  "vivino_reviews": 1234,
  "country": "Italy",
  "region": "Tuscany",
  "grapes": ["Sangiovese"],
  "alcohol": 14.0,
  "volume_ml": 750,
  "is_kosher": false,
  "wine_type": "red",
  "body": "medium",
  "sweetness": "dry",
  "tasting_notes": {
    "nose": ["cherry", "tobacco", "earth"],
    "palate": ["bright acidity", "fine tannins"],
    "finish": "long with dried herbs"
  },
  "winery_description": "Brief winery history...",
  "serving": {
    "drink_from": 2024,
    "drink_until": 2030,
    "decant_minutes": 60,
    "temperature_celsius": "16-18"
  },
  "food_pairings": ["grilled lamb", "aged cheese", "pasta"],
  "price_range_usd": "25-35",
  "image_url": null,
  "taste_spectrum": { "body": 72, "tannin": 65, "sweetness": 8, "acidity": 55 }
}

taste_spectrum: Provide the wine's OBJECTIVE taste characteristics on 4 numeric axes (0-100). These MUST faithfully reproduce the wine's Vivino community taste profile. If you know the wine's Vivino taste profile values, use those EXACT proportions. For well-known wines, use widely-accepted values. Do NOT vary based on vintage unless the wine style genuinely changed.

Use these calibration anchors (based on real Vivino data):
- body: 0 = Very Light (Vinho Verde, Muscadet). 20 = Light (Prosecco, Grüner Veltliner). 30 = Light-Medium (Pinot Grigio, Sauvignon Blanc). 45 = Medium (Chianti Classico, Merlot, Rioja Crianza). 55 = Medium-Full (Malbec, Zinfandel). 65-70 = Full (Cabernet Sauvignon, Barolo, Châteauneuf-du-Pape). 80-85 = Bold (Amarone, Primitivo, Edizione Cinque Autoctoni). 90-100 = Very Bold (Petite Sirah, Turriga, Sagrantino).
- tannin: 0 = None (most whites, Beaujolais Nouveau). 15 = Very Low (Gamay, Dolcetto). 25 = Low (Pinot Noir, Valpolicella). 40 = Medium (Merlot, Tempranillo, Rioja Crianza). 55 = Medium-High (Malbec, Sangiovese). 65-70 = High (Cabernet Sauvignon, Mourvèdre, Edizione Cinque Autoctoni). 80 = Very High (Nebbiolo/Barolo, Aglianico). 90-100 = Extreme (Tannat, young Sagrantino).
- sweetness: 0-5 = Bone Dry (most reds, Chablis, Sancerre). 8-15 = Dry (Chianti, Cabernet Sauvignon — note: even "dry" wines have slight perceptible sweetness). 15-25 = Off-Dry (Riesling Kabinett, Gewürztraminer, Edizione Cinque Autoctoni, Amarone — ripe-fruit perception). 30-40 = Medium-Dry (Lambrusco, White Zinfandel). 45-60 = Medium Sweet (Moscato d'Asti). 70-85 = Sweet (Late Harvest, Tokaji). 90-100 = Very Sweet (Sauternes, Port, Ice Wine).
- acidity: 10-20 = Very Low/Flat (oaked Chardonnay, Viognier, Grenache). 30-40 = Low-Medium (Merlot, Primitivo). 45-55 = Medium (Cabernet Sauvignon, Malbec, Tempranillo). 55-65 = Medium-High (Sangiovese, Pinot Noir, Sauvignon Blanc). 70-80 = High (Riesling, Barbera, Nebbiolo). 85-100 = Very High (Assyrtiko, Vinho Verde).

IMPORTANT: Many bold Italian blends (Amarone, Edizione Cinque Autoctoni, Ripasso) have notable perceived sweetness (15-25) from dried/ripe grapes even though technically "dry". Do NOT default these to 0-5 sweetness.

For fields you cannot determine, use null. But ALWAYS return a wine object with at least the name, winery, country, wine_type, grapes, and vivino_rating fields filled in based on your best interpretation of the image or query. Only return { "error": "Could not identify wine" } if the image is completely unreadable, doesn't show a wine, or shows no useful information at all.`;

const WINE_TEXT_SEARCH_SYSTEM_PROMPT = `You are a wine expert. The user is typing a wine name, winery, or partial description to find a wine.

Your task: Return an array of possible wines that match the query. This improves success rate when the user makes typos or only remembers part of the name.

Rules:
- Return between 1 and 5 wines, ordered by relevance (best match first).
- Be TOLERANT: treat the query as fuzzy. Consider typos, partial names, alternate spellings (e.g. "Brunello" vs "Brunello di Montalcino"), and different languages.
- If the query could refer to multiple vintages of the same wine, include 2-3 different vintages as separate entries so the user can pick (e.g. "Château Margaux 2019" and "Château Margaux 2020").
- If the query is very specific and matches one wine well, you may return just 1 wine. If it's ambiguous or could match several, return 3-5 options.
- NEVER return an empty array. If truly unknown, return 1-2 best-guess wines that are close (same region, similar name, or popular wines that sound similar).
- Return ONLY valid JSON: a single object with one key "wines" whose value is an array of wine objects. No markdown, no code blocks.

IMPORTANT: Each wine MUST include ALL of the following fields (use null for unknown values):
name, winery, vintage, vivino_rating, vivino_reviews, country, region, grapes, alcohol, volume_ml, is_kosher, wine_type, body, sweetness, tasting_notes (with nose, palate, finish), winery_description, serving (with drink_from, drink_until, decant_minutes, temperature_celsius), food_pairings, price_range_usd, image_url, taste_spectrum.

taste_spectrum: Provide the wine's OBJECTIVE taste characteristics on 4 numeric axes (0-100). These MUST faithfully reproduce the wine's Vivino community taste profile. If you know the wine's Vivino taste profile values, use those EXACT proportions. For well-known wines, use widely-accepted values. Do NOT vary based on vintage unless the wine style genuinely changed.

Use these calibration anchors (based on real Vivino data):
- body: 0 = Very Light (Vinho Verde, Muscadet). 20 = Light (Prosecco, Grüner Veltliner). 30 = Light-Medium (Pinot Grigio, Sauvignon Blanc). 45 = Medium (Chianti Classico, Merlot, Rioja Crianza). 55 = Medium-Full (Malbec, Zinfandel). 65-70 = Full (Cabernet Sauvignon, Barolo, Châteauneuf-du-Pape). 80-85 = Bold (Amarone, Primitivo, Edizione Cinque Autoctoni). 90-100 = Very Bold (Petite Sirah, Turriga, Sagrantino).
- tannin: 0 = None (most whites, Beaujolais Nouveau). 15 = Very Low (Gamay, Dolcetto). 25 = Low (Pinot Noir, Valpolicella). 40 = Medium (Merlot, Tempranillo, Rioja Crianza). 55 = Medium-High (Malbec, Sangiovese). 65-70 = High (Cabernet Sauvignon, Mourvèdre, Edizione Cinque Autoctoni). 80 = Very High (Nebbiolo/Barolo, Aglianico). 90-100 = Extreme (Tannat, young Sagrantino).
- sweetness: 0-5 = Bone Dry (most reds, Chablis, Sancerre). 8-15 = Dry (Chianti, Cabernet Sauvignon — note: even "dry" wines have slight perceptible sweetness). 15-25 = Off-Dry (Riesling Kabinett, Gewürztraminer, Edizione Cinque Autoctoni, Amarone — ripe-fruit perception). 30-40 = Medium-Dry (Lambrusco, White Zinfandel). 45-60 = Medium Sweet (Moscato d'Asti). 70-85 = Sweet (Late Harvest, Tokaji). 90-100 = Very Sweet (Sauternes, Port, Ice Wine).
- acidity: 10-20 = Very Low/Flat (oaked Chardonnay, Viognier, Grenache). 30-40 = Low-Medium (Merlot, Primitivo). 45-55 = Medium (Cabernet Sauvignon, Malbec, Tempranillo). 55-65 = Medium-High (Sangiovese, Pinot Noir, Sauvignon Blanc). 70-80 = High (Riesling, Barbera, Nebbiolo). 85-100 = Very High (Assyrtiko, Vinho Verde).

IMPORTANT: Many bold Italian blends (Amarone, Edizione Cinque Autoctoni, Ripasso) have notable perceived sweetness (15-25) from dried/ripe grapes even though technically "dry". Do NOT default these to 0-5 sweetness.

image_url: Always set to null. Wine images are fetched separately from Vivino — do NOT attempt to guess or fabricate image URLs.

Vivino Rating: ALWAYS provide a vivino_rating (1.0-5.0). Use the real Vivino rating if you know it. Otherwise, provide your best estimate based on wine reputation, region, and producer quality. Use conservative round numbers when estimating (e.g. 3.5, 3.8, 4.0, 4.2). Typical ranges: prestigious/iconic wines 4.0-4.6, well-regarded wines 3.8-4.2, solid everyday wines 3.3-3.8, basic wines 3.0-3.3. For vivino_reviews use null unless you know an approximate count.

LANGUAGE: Write ALL descriptive text values in Hebrew (עברית). This includes: winery_description, tasting_notes (nose, palate, finish), food_pairings, and the finish field. Wine names, winery names, grape names, region names, and country names should stay in their original language.

Example format:
{"wines": [
  {"name": "Brunello di Montalcino", "winery": "Tenuta", "vintage": 2019, "country": "Italy", "region": "Tuscany", "grapes": ["Sangiovese"], "wine_type": "red", "vivino_rating": 4.4, "vivino_reviews": 12000, "alcohol": 14.5, "volume_ml": 750, "is_kosher": false, "body": "full", "sweetness": "dry", "tasting_notes": {"nose": ["דובדבן", "טבק", "אדמה"], "palate": ["חומציות גבוהה", "טאנינים עדינים"], "finish": "ארוך עם עשבי תיבול"}, "winery_description": "...", "serving": {"drink_from": 2024, "drink_until": 2035, "decant_minutes": 60, "temperature_celsius": "16-18"}, "food_pairings": ["כבש צלוי", "גבינות מיושנות"], "price_range_usd": "40-60", "image_url": null, "taste_spectrum": {"body": 80, "tannin": 70, "sweetness": 5, "acidity": 65}}
]}`;

export async function searchWinesByText(query: string): Promise<WineData[]> {
  try {
    console.log('Searching wines by text (multi):', query);

    const response: ChatCompletionResponse = await (await getOpenAIClient()).chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: WINE_TEXT_SEARCH_SYSTEM_PROMPT },
        { role: 'user', content: `Find wines matching this query (be tolerant of typos and partial names): "${query}"` },
      ],
      temperature: 0.2,
      max_tokens: 5000,
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      console.error('No content in OpenAI text search response');
      return [];
    }

    const data = parseJsonResponse(content) as { wines?: WineData[]; error?: string };
    if (typeof data === 'object' && data !== null && 'error' in data) {
      console.log('OpenAI text search returned error:', data.error);
      return [];
    }
    const wines = Array.isArray(data?.wines) ? data.wines : [];
    return wines.filter((w): w is WineData => typeof w === 'object' && w !== null && typeof (w as WineData).name === 'string' && typeof (w as WineData).winery === 'string');
  } catch (error) {
    console.error('Error searching wines by text:', error);
    return [];
  }
}

export async function searchWineByText(query: string): Promise<WineData | null> {
  const wines = await searchWinesByText(query);
  return wines.length > 0 ? wines[0] : null;
}

// Helper function to parse JSON from OpenAI response (handles markdown code blocks)
function parseJsonResponse(content: string): unknown {
  // Remove markdown code blocks if present
  let cleanContent = content.trim();
  
  // Handle ```json ... ``` format
  if (cleanContent.startsWith('```')) {
    const lines = cleanContent.split('\n');
    // Remove first line (```json or ```)
    lines.shift();
    // Remove last line (```)
    if (lines[lines.length - 1]?.trim() === '```') {
      lines.pop();
    }
    cleanContent = lines.join('\n').trim();
  }
  
  return JSON.parse(cleanContent);
}

export async function searchWineByImage(base64Image: string, mimeType: string = 'image/jpeg'): Promise<WineData | null> {
  try {
    console.log('Searching wine by image, mime type:', mimeType, 'base64 length:', base64Image.length);
    
    const response: ChatCompletionResponse = await (await getOpenAIClient()).chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: WINE_SEARCH_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Look at this wine bottle/label image carefully. Read ALL text visible on the label including the winery name, wine name, vintage year, region, appellation, grape variety, and any other details. Based on what you can see, identify this wine and provide detailed information. Make your best guess even if you are not 100% certain - use the visual information available. Set image_url to null — images are handled separately.',
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    const content = response.choices?.[0]?.message?.content;
    console.log('OpenAI image response (first 300 chars):', content?.substring(0, 300));
    
    if (!content) {
      console.error('No content in OpenAI image response');
      return null;
    }

    let data: unknown;
    try {
      data = parseJsonResponse(content);
    } catch (parseErr) {
      console.error('JSON parse failed for image search. Raw content (last 200 chars):', content.slice(-200));
      console.error('Parse error:', parseErr);
      return null;
    }

    if (typeof data === 'object' && data !== null && 'error' in data) {
      console.log('OpenAI returned error:', (data as { error: string }).error);
      return null;
    }
    
    return data as WineData;
  } catch (error) {
    console.error('Error searching wine by image:', error);
    return null;
  }
}

export async function matchWineToProfile(
  wine: WineData,
  profile: Record<string, unknown>,
  language?: string
): Promise<ProfileMatchResult> {
  const lang = language || 'he';
  const langInstruction = lang === 'he'
    ? '\n\nIMPORTANT: Write ALL text values (explanation, positive_matches, mismatches, similar_wines_note) in Hebrew.'
    : '';

  // If wine already has taste_spectrum from search, include it; otherwise ask AI to estimate.
  const hasWineSpectrum = wine.taste_spectrum &&
    typeof wine.taste_spectrum.body === 'number' &&
    typeof wine.taste_spectrum.tannin === 'number';

  const spectrumInstruction = hasWineSpectrum
    ? `\nThe wine's taste_spectrum is already provided in the wine data. Use those exact values for wine_spectrum in your response. Do NOT re-estimate them.`
    : `\nwine_spectrum: Estimate the wine's OBJECTIVE characteristics on 4 axes (0-100), faithfully reproducing Vivino's community taste profile values. Use these calibration anchors:
- body: 0 = Very Light (Vinho Verde). 30 = Light (Pinot Grigio). 45 = Medium (Chianti, Merlot). 65-70 = Full (Cabernet Sauvignon, Barolo). 80-85 = Bold (Amarone, Edizione Cinque Autoctoni). 90+ = Very Bold (Petite Sirah, Sagrantino).
- tannin: 0 = None (whites). 25 = Low (Pinot Noir). 40 = Medium (Merlot, Tempranillo). 65-70 = High (Cabernet Sauvignon, Edizione Cinque Autoctoni). 80+ = Very High (Nebbiolo/Barolo).
- sweetness: 0-5 = Bone Dry (Chablis). 8-15 = Dry (Chianti, Cabernet). 15-25 = Off-Dry (Amarone, Edizione Cinque Autoctoni — ripe-fruit perception). 45-60 = Medium Sweet (Moscato). 80+ = Very Sweet (Sauternes, Port).
- acidity: 10-20 = Very Low (oaked Chardonnay, Viognier). 35-45 = Medium (Merlot, Malbec). 55-65 = Medium-High (Sangiovese, Pinot Noir). 70-80 = High (Riesling, Barbera). 85+ = Very High (Assyrtiko).
Bold Italian blends (Amarone, Edizione Cinque Autoctoni, Ripasso) typically show 15-25 sweetness from dried/ripe grapes.`;

  // Build spectrum comparison hint when both sides have numeric spectrums
  const profileSpectrum = profile.taste_spectrum as { body?: number; tannin?: number; sweetness?: number; acidity?: number } | undefined;
  let spectrumComparisonHint = '';
  if (profileSpectrum && typeof profileSpectrum.body === 'number') {
    spectrumComparisonHint = `\n\nUser's preferred taste_spectrum (numerical): body=${profileSpectrum.body}, tannin=${profileSpectrum.tannin}, sweetness=${profileSpectrum.sweetness}, acidity=${profileSpectrum.acidity}.
Compare these numbers to the wine's spectrum. Large gaps (>20 points) on any axis indicate a meaningful mismatch that MUST reduce the score. Sweetness mismatches are especially important — a user with sweetness preference of 5-15 (dry) getting a wine at 30+ (semi-dry/sweet) is a MAJOR mismatch.`;
  }

  // Strip taste_spectrum from the profile blob sent as JSON to avoid duplication
  const { taste_spectrum: _strip, ...profileForPrompt } = profile;

  try {
    const response: ChatCompletionResponse = await (await getOpenAIClient()).chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a critical, honest wine sommelier. Compare the wine to the user's taste profile and provide an accurate match analysis. Your job is to PROTECT the user from buying wines they won't enjoy — do NOT inflate scores.

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks.${langInstruction}

=== SCORING METHODOLOGY ===
Start from 50 (neutral baseline). Add or subtract based on alignment with the user's profile:

HEAVY PENALTY (-20 to -30 each):
- Wine matches characteristics listed in the user's "what_to_avoid" — this alone should push the score well below 50
- Sweetness level mismatch: user prefers dry (sweetness 5-15) but wine is semi-dry/sweet (sweetness 25+), or vice versa

MODERATE PENALTY (-10 to -15 each):
- Body/structure mismatch (e.g., user prefers medium-bodied elegant wines, wine is heavy/extracted)
- Acidity preference mismatch (e.g., user loves high-acidity wines, wine has low acidity)
- Style mismatch (e.g., user prefers complex/mineral wines, wine is simple/fruit-forward)

LIGHT PENALTY (-5 to -10 each):
- Grape variety not in recommended list but wine style is somewhat compatible
- Region not in recommended regions

BONUS (+5 to +15 each):
- Grape variety in the user's recommended_grapes list
- Region in the user's recommended_regions list
- Overall style closely matches overall_style description
- Body, tannin, acidity align well with the user's taste_spectrum (within 15 points)

=== SCORE CALIBRATION ===
- 90-100: Near-perfect — aligns on all key dimensions (style, body, sweetness, acidity, grapes, regions)
- 75-89: Strong match — aligns on most dimensions with only minor gaps
- 55-74: Moderate — some alignment but notable differences on 1-2 key dimensions
- 35-54: Weak — significant mismatches on key preferences (sweetness, body, style)
- 15-34: Poor — fundamentally different from what the user enjoys
- 0-14: Anti-match — wine has characteristics the user actively avoids

CRITICAL RULES:
- If the wine has ANY characteristic listed in the user's "what_to_avoid", the score MUST be below 50.
- Scores above 85 should be RARE — reserved only for wines that truly nail the user's specific preferences.
- Use the FULL range 0-100. A semi-dry wine for a dry-wine lover should score 30-45, not 75+.
- Be honest about mismatches. List every significant gap in the "mismatches" array.

Return this EXACT structure — NO extra keys:
{
  "match_percentage": 50,
  "explanation": "A concise 1-2 sentence explanation of why this wine matches or doesn't match the user's profile.",
  "wine_spectrum": { "body": 55, "tannin": 40, "sweetness": 25, "acidity": 35 },
  "positive_matches": ["Medium body aligns with your preference", "..."],
  "mismatches": ["Semi-dry sweetness conflicts with your preference for dry wines", "..."],
  "similar_wines_note": "Optional note about similar wines the user has enjoyed or would prefer instead"
}
${spectrumInstruction}${spectrumComparisonHint}

CRITICAL: Do NOT include "profile_spectrum" in your response. Only return the keys listed above.`,
        },
        {
          role: 'user',
          content: `Wine: ${JSON.stringify(wine)}

User Profile: ${JSON.stringify(profileForPrompt)}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      return {
        match_percentage: 50,
        positive_matches: [],
        mismatches: [],
      };
    }

    const result = parseJsonResponse(content) as ProfileMatchResult;

    // Sanitise: always delete any AI-hallucinated profile_spectrum
    delete result.profile_spectrum;

    return result;
  } catch (error) {
    console.error('Error matching wine to profile:', error);
    return {
      match_percentage: 50,
      positive_matches: [],
      mismatches: [],
    };
  }
}

export async function generateTasteProfile(onboardingAnswers: Record<string, unknown>, language?: string) {
  const lang = language || 'he';
  const langInstruction = lang === 'he'
    ? '\n\nIMPORTANT: Write ALL text values (overall_style, body_structure, fruit_profile, style_notes, summary, what_to_avoid items) in Hebrew. Grape names and region names can stay in their original language.'
    : '';
  const addressInstruction = lang === 'he'
    ? '\nWhen referring to the user in generated text, address them directly as "אתה" (you). NEVER use "המשתמש" (the user).'
    : '\nWhen referring to the user in generated text, address them directly as "you". NEVER use "the user".';
  try {
    const response: ChatCompletionResponse = await (await getOpenAIClient()).chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an experienced wine sommelier and personal wine advisor. Based on the user's onboarding quiz answers, create detailed, insightful taste profiles for red, white, and rosé wines.

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks.${langInstruction}${addressInstruction}

Guidelines for each field:
- overall_style: 2-3 sentences describing their preferred wine style, what makes them tick, and what kind of wine experience they're drawn to.
- body_structure: Describe their preferred body and structure with context (e.g. "Medium to full body with well-integrated tannins — you enjoy wines that have structure but don't overpower the fruit").
- fruit_profile: Detailed description of fruit preferences with specific examples of flavors they'd enjoy.
- style_notes: 2-3 sentences about secondary characteristics they'd appreciate (oak influence, minerality, earthiness, spice, etc.).
- recommended_grapes: 4-6 specific grape varieties that match their preferences. Each category should only list grapes appropriate for that wine color.
- recommended_regions: 4-6 wine regions worldwide that produce wines matching their taste for that specific wine color.
- what_to_avoid: 3-5 specific wine styles or characteristics they probably won't enjoy for THAT specific wine category. Each category's what_to_avoid must ONLY reference characteristics relevant to that wine color — do NOT mention other wine colors or categories.
- summary: A rich 3-5 sentence personal wine profile summary that reads like advice from a sommelier friend. Include insights about their palate personality, what patterns define their taste, and a specific wine recommendation to try.
- taste_spectrum: An object with 4 numeric values (0-100) representing where the user's PREFERRED wines typically fall on each spectrum. These represent the characteristics of wines they enjoy, NOT how much they like that characteristic. Use these calibration anchors (match Vivino-style values):
  - body: 0 = Very Light (Vinho Verde, Muscadet). 30 = Light (Pinot Grigio). 50 = Medium (Chianti, Merlot). 70 = Medium-Full (Cabernet Sauvignon). 90-100 = Very Bold (Amarone, Shiraz).
  - tannin: 0 = None (most whites, Beaujolais Nouveau). 20 = Low (Pinot Noir). 45 = Medium (Merlot, Tempranillo). 65 = Medium-High (Cabernet Sauvignon). 85-100 = Very High (Nebbiolo/Barolo, Tannat).
  - sweetness: 0-5 = Bone Dry (most reds, Chablis). 10-20 = Off-Dry (Riesling Kabinett). 40-60 = Medium Sweet (Moscato d'Asti). 80-100 = Very Sweet (Sauternes, Port).
  - acidity: 15-25 = Very Low/Flat (oaked Chardonnay, Viognier). 40-50 = Medium (Merlot, Grenache). 60-70 = Medium-High (Sangiovese, Sauvignon Blanc). 80-100 = Very High (Riesling, Assyrtiko).
  CRITICAL: A user who prefers dry wines should get sweetness: 5-15, NOT a high number. The values represent the actual wine characteristics, not a preference score.

Return this structure for each wine type:
{
  "red": {
    "overall_style": "...",
    "body_structure": "...",
    "fruit_profile": "...",
    "style_notes": "...",
    "recommended_grapes": ["...", "..."],
    "recommended_regions": ["...", "..."],
    "what_to_avoid": ["...", "..."],
    "summary": "...",
    "taste_spectrum": { "body": 72, "tannin": 55, "sweetness": 15, "acidity": 60 }
  },
  "white": { ... same structure ... },
  "rose": { ... same structure ... }
}`,
        },
        {
          role: 'user',
          content: `Create taste profiles based on these quiz answers: ${JSON.stringify(onboardingAnswers)}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) return null;

    const result = JSON.parse(content) as Record<string, Record<string, unknown>>;
    // Mark all generated spectrums as calibrated
    for (const type of ['red', 'white', 'rose']) {
      if (result[type]?.taste_spectrum && typeof result[type].taste_spectrum === 'object') {
        (result[type].taste_spectrum as Record<string, unknown>).calibrated = true;
      }
    }
    return result;
  } catch (error) {
    console.error('Error generating taste profile:', error);
    return null;
  }
}

export async function updateTasteProfileFromWine(
  wine: WineData,
  currentProfile: Record<string, unknown>,
  language?: string,
  options?: { wineType?: string }
): Promise<Record<string, unknown> | null> {
  const lang = language || 'he';
  const langInstruction = lang === 'he'
    ? '\n\nIMPORTANT: Write ALL text values (overall_style, body_structure, fruit_profile, style_notes, summary, what_to_avoid items) in Hebrew. Grape names and region names can stay in their original language.'
    : '';
  const categoryLabel = options?.wineType || wine.wine_type || 'red';
  const addressInstruction = lang === 'he'
    ? '\nWhen referring to the user in generated text, address them directly as "אתה" (you). NEVER use "המשתמש" (the user).'
    : '\nWhen referring to the user in generated text, address them directly as "you". NEVER use "the user".';
  try {
    const response: ChatCompletionResponse = await (await getOpenAIClient()).chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an experienced wine sommelier and personal wine advisor. A user has indicated they like a specific wine. Update their taste profile to incorporate insights from this wine preference.

This profile is specifically for ${categoryLabel} wines.

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks.${langInstruction}${addressInstruction}

The profile should evolve based on the wine they liked. If they currently have no profile, create one based on this wine. If they have an existing profile, refine it to incorporate the characteristics of this wine they enjoyed. Look at patterns across all wines they've liked.

Guidelines for each field:
- overall_style: 2-3 sentences describing their emerging/evolving wine style preferences based on the wines they've liked so far.
- body_structure: Describe their preferred body and structure with context about what they seem drawn to.
- fruit_profile: Detailed description of fruit preferences, noting patterns across their liked wines.
- style_notes: 2-3 sentences about secondary characteristics (oak, minerality, earthiness, spice, etc.) that connect their liked wines.
- recommended_grapes: 4-6 specific grape varieties that match the patterns in their preferences. Only recommend ${categoryLabel} wine grapes.
- recommended_regions: 4-6 wine regions that produce ${categoryLabel} wines similar to what they've enjoyed.
- what_to_avoid: 3-5 ${categoryLabel} wine styles or characteristics that seem opposite to their preferences. ONLY reference ${categoryLabel} wine characteristics — do NOT mention other wine colors or categories.
- summary: A rich 3-5 sentence personal wine profile summary. Include insights about taste patterns across their liked wines, their palate personality, and a specific recommendation for what to try next.
- liked_wines: Array of names of all wines they've liked (carry forward from existing profile + add the new one).
- taste_spectrum: An object with 4 numeric values (0-100) representing where the user's PREFERRED wines typically fall on each spectrum, averaged across ALL their liked wines (weighted towards the latest). These represent the characteristics of wines they enjoy, NOT a preference score. Use these calibration anchors (match Vivino-style values):
  - body: 0 = Very Light (Vinho Verde, Muscadet). 30 = Light (Pinot Grigio). 50 = Medium (Chianti, Merlot). 70 = Medium-Full (Cabernet Sauvignon). 90-100 = Very Bold (Amarone, Shiraz).
  - tannin: 0 = None (most whites, Beaujolais Nouveau). 20 = Low (Pinot Noir). 45 = Medium (Merlot, Tempranillo). 65 = Medium-High (Cabernet Sauvignon). 85-100 = Very High (Nebbiolo/Barolo, Tannat).
  - sweetness: 0-5 = Bone Dry (most reds, Chablis). 10-20 = Off-Dry (Riesling Kabinett). 40-60 = Medium Sweet (Moscato d'Asti). 80-100 = Very Sweet (Sauternes, Port).
  - acidity: 15-25 = Very Low/Flat (oaked Chardonnay, Viognier). 40-50 = Medium (Merlot, Grenache). 60-70 = Medium-High (Sangiovese, Sauvignon Blanc). 80-100 = Very High (Riesling, Assyrtiko).
  CRITICAL: A user who prefers dry wines should get sweetness: 5-15, NOT a high number. The values represent actual wine characteristics, not a preference score.

Return this structure:
{
  "overall_style": "...",
  "body_structure": "...",
  "fruit_profile": "...",
  "style_notes": "...",
  "recommended_grapes": ["Grape1", "Grape2"],
  "recommended_regions": ["Region1", "Region2"],
  "what_to_avoid": ["..."],
  "summary": "...",
  "liked_wines": ["Wine names they've liked"],
  "taste_spectrum": { "body": 72, "tannin": 55, "sweetness": 15, "acidity": 60 }
}`,
        },
        {
          role: 'user',
          content: `The user liked this wine: ${JSON.stringify(wine)}

Their current profile (may be empty): ${JSON.stringify(currentProfile)}

Update their profile to reflect that they enjoy this wine's characteristics.`,
        },
      ],
      temperature: 0.5,
      max_tokens: 2000,
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) return null;

    const result = parseJsonResponse(content) as Record<string, unknown>;
    // Mark generated spectrum as calibrated
    if (result.taste_spectrum && typeof result.taste_spectrum === 'object') {
      (result.taste_spectrum as Record<string, unknown>).calibrated = true;
    }
    return result;
  } catch (error) {
    console.error('Error updating taste profile from wine:', error);
    return null;
  }
}

/**
 * Generate taste_spectrum values from an existing text-based profile.
 * Used to backfill profiles created before spectrum was added.
 */
export async function generateSpectrumFromProfile(
  profileData: Record<string, unknown>,
  wineType: string
): Promise<{ body: number; tannin: number; sweetness: number; acidity: number } | null> {
  try {
    const response: ChatCompletionResponse = await (await getOpenAIClient()).chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a wine sommelier. Given an existing taste profile description for a ${wineType} wine drinker, produce numeric spectrum values representing the characteristics of wines they prefer.

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks.

Return exactly this structure:
{
  "body": <0-100>,
  "tannin": <0-100>,
  "sweetness": <0-100>,
  "acidity": <0-100>
}

Use these calibration anchors (match Vivino-style values):
- body: 0 = Very Light (Vinho Verde, Muscadet). 30 = Light (Pinot Grigio). 50 = Medium (Chianti, Merlot). 70 = Medium-Full (Cabernet Sauvignon). 90-100 = Very Bold (Amarone, Shiraz).
- tannin: 0 = None (most whites, Beaujolais Nouveau). 20 = Low (Pinot Noir). 45 = Medium (Merlot, Tempranillo). 65 = Medium-High (Cabernet Sauvignon). 85-100 = Very High (Nebbiolo/Barolo, Tannat).
- sweetness: 0-5 = Bone Dry (most reds, Chablis). 10-20 = Off-Dry (Riesling Kabinett). 40-60 = Medium Sweet (Moscato d'Asti). 80-100 = Very Sweet (Sauternes, Port).
- acidity: 15-25 = Very Low/Flat (oaked Chardonnay, Viognier). 40-50 = Medium (Merlot, Grenache). 60-70 = Medium-High (Sangiovese, Sauvignon Blanc). 80-100 = Very High (Riesling, Assyrtiko).

CRITICAL: The values represent the actual characteristics of wines they enjoy, NOT a preference score. If the profile says they prefer dry wines, sweetness should be 5-15, NOT a high number.
Be precise and derive values from the text descriptions provided.`,
        },
        {
          role: 'user',
          content: `Generate taste spectrum values for this ${wineType} wine profile:\n${JSON.stringify(profileData)}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = parseJsonResponse(content) as { body: number; tannin: number; sweetness: number; acidity: number };
    if (
      typeof parsed.body === 'number' &&
      typeof parsed.tannin === 'number' &&
      typeof parsed.sweetness === 'number' &&
      typeof parsed.acidity === 'number'
    ) {
      return parsed;
    }
    return null;
  } catch (error) {
    console.error('Error generating spectrum from profile:', error);
    return null;
  }
}
