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
}

export interface ProfileMatchResult {
  match_percentage: number;
  positive_matches: string[];
  mismatches: string[];
  similar_wines_note?: string;
}

const WINE_SEARCH_SYSTEM_PROMPT = `You are a wine expert assistant with extensive knowledge of wines and their ratings. Given a wine query (either a name, description, or image of a wine label), return detailed information about the wine in JSON format.

IMPORTANT: You must return ONLY valid JSON, no markdown, no code blocks, just the raw JSON object.

For images: ALWAYS try your best to identify the wine. Read any text visible on the label including winery name, wine name, vintage year, region, grape varieties, etc. Even if you're not 100% certain about the exact wine, make your best educated guess based on what you can see. Use visual cues like label design, bottle shape, and any visible text.

PRIORITY - Image URL: Try hard to provide a working bottle image in image_url. Vivino hosts images at images.vivino.com (e.g. https://images.vivino.com/thumbs/...). If you know this wine's Vivino listing or a direct image URL from any reliable source, include it. Only set image_url to null when you truly cannot find a usable image URL.

Vivino Rating: For vivino_rating, ONLY provide a specific rating (1.0-5.0) if you are genuinely confident you know the real Vivino rating for this specific wine and vintage. Most wines on Vivino rate between 3.5-4.5. Do NOT invent or guess ratings — if you're not confident about the exact rating, set vivino_rating to null. It is better to return null than a wrong number. For very well-known wines (e.g. Opus One, Sassicaia, Château Margaux) where you're confident about the approximate Vivino rating, provide it. For lesser-known or regional wines, use null. For vivino_reviews, always use null unless you're very confident about the approximate number.

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
  "image_url": "https://images.vivino.com/thumbs/..."
}

For fields you cannot determine, use null. But ALWAYS return a wine object with at least the name, winery, country, wine_type, grapes, vivino_rating, and image_url fields filled in based on your best interpretation of the image or query. Only return { "error": "Could not identify wine" } if the image is completely unreadable, doesn't show a wine, or shows no useful information at all.`;

const WINE_TEXT_SEARCH_SYSTEM_PROMPT = `You are a wine expert. The user is typing a wine name, winery, or partial description to find a wine.

Your task: Return an array of possible wines that match the query. This improves success rate when the user makes typos or only remembers part of the name.

Rules:
- Return between 1 and 5 wines, ordered by relevance (best match first).
- Be TOLERANT: treat the query as fuzzy. Consider typos, partial names, alternate spellings (e.g. "Brunello" vs "Brunello di Montalcino"), and different languages.
- If the query could refer to multiple vintages of the same wine, include 2-3 different vintages as separate entries so the user can pick (e.g. "Château Margaux 2019" and "Château Margaux 2020").
- If the query is very specific and matches one wine well, you may return just 1 wine. If it's ambiguous or could match several, return 3-5 options.
- NEVER return an empty array. If truly unknown, return 1-2 best-guess wines that are close (same region, similar name, or popular wines that sound similar).
- Each wine must have: name, winery, vintage (if known), country, region (if known), grapes, wine_type. Include image_url when you know a Vivino or other bottle image URL (e.g. images.vivino.com); otherwise null.
- For vivino_rating: ONLY include a rating if you're genuinely confident about the real Vivino rating for this specific wine. Set to null if unsure — it is much better to return null than an inaccurate number. For vivino_reviews, always use null unless you're very confident.
- Return ONLY valid JSON: a single object with one key "wines" whose value is an array of wine objects. No markdown, no code blocks.

Example format:
{"wines": [
  {"name": "Brunello di Montalcino", "winery": "Tenuta", "vintage": 2019, "country": "Italy", "region": "Tuscany", "grapes": ["Sangiovese"], "wine_type": "red", "vivino_rating": 4.4, "vivino_reviews": 12000, ...},
  {"name": "Brunello di Montalcino", "winery": "Tenuta", "vintage": 2018, ...}
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
      temperature: 0.4,
      max_tokens: 3000,
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
              text: 'Look at this wine bottle/label image carefully. Read ALL text visible on the label including the winery name, wine name, vintage year, region, appellation, grape variety, and any other details. Based on what you can see, identify this wine and provide detailed information. Make your best guess even if you are not 100% certain - use the visual information available. When you identify the wine, try to provide a bottle image URL (e.g. from Vivino, images.vivino.com) in the image_url field if you know one.',
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
      max_tokens: 1500,
    });

    const content = response.choices?.[0]?.message?.content;
    console.log('OpenAI image response:', content?.substring(0, 200));
    
    if (!content) {
      console.error('No content in OpenAI response');
      return null;
    }

    const data = parseJsonResponse(content);
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
    ? '\n\nIMPORTANT: Write ALL text values (positive_matches, mismatches, similar_wines_note) in Hebrew.'
    : '';
  try {
    const response: ChatCompletionResponse = await (await getOpenAIClient()).chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a wine sommelier. Compare the wine to the user's taste profile and provide a match analysis.
          
IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks.${langInstruction}

Return this exact structure:
{
  "match_percentage": 85,
  "positive_matches": ["High acidity matches your preference", "..."],
  "mismatches": ["Dark fruit notes - you typically prefer red fruit", "..."],
  "similar_wines_note": "Similar to wines you've enjoyed before"
}`,
        },
        {
          role: 'user',
          content: `Wine: ${JSON.stringify(wine)}

User Profile: ${JSON.stringify(profile)}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 800,
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      return {
        match_percentage: 75,
        positive_matches: ['Matches your general preferences'],
        mismatches: [],
      };
    }

    return JSON.parse(content) as ProfileMatchResult;
  } catch (error) {
    console.error('Error matching wine to profile:', error);
    return {
      match_percentage: 75,
      positive_matches: ['Matches your general preferences'],
      mismatches: [],
    };
  }
}

export async function generateTasteProfile(onboardingAnswers: Record<string, unknown>, language?: string) {
  const lang = language || 'he';
  const langInstruction = lang === 'he'
    ? '\n\nIMPORTANT: Write ALL text values (overall_style, body_structure, fruit_profile, style_notes, summary, what_to_avoid items) in Hebrew. Grape names and region names can stay in their original language.'
    : '';
  try {
    const response: ChatCompletionResponse = await (await getOpenAIClient()).chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an experienced wine sommelier and personal wine advisor. Based on the user's onboarding quiz answers, create detailed, insightful taste profiles for red, white, and rosé wines.

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks.${langInstruction}

Guidelines for each field:
- overall_style: 2-3 sentences describing their preferred wine style, what makes them tick, and what kind of wine experience they're drawn to.
- body_structure: Describe their preferred body and structure with context (e.g. "Medium to full body with well-integrated tannins — you enjoy wines that have structure but don't overpower the fruit").
- fruit_profile: Detailed description of fruit preferences with specific examples of flavors they'd enjoy.
- style_notes: 2-3 sentences about secondary characteristics they'd appreciate (oak influence, minerality, earthiness, spice, etc.).
- recommended_grapes: 4-6 specific grape varieties that match their preferences.
- recommended_regions: 4-6 wine regions worldwide that produce wines matching their taste.
- what_to_avoid: 3-5 specific wine styles or characteristics they probably won't enjoy, with brief explanations.
- summary: A rich 3-5 sentence personal wine profile summary that reads like advice from a sommelier friend. Include insights about their palate personality, what patterns define their taste, and a specific wine recommendation to try.

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
    "summary": "..."
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

    return JSON.parse(content);
  } catch (error) {
    console.error('Error generating taste profile:', error);
    return null;
  }
}

export async function updateTasteProfileFromWine(
  wine: WineData,
  currentProfile: Record<string, unknown>,
  language?: string
): Promise<Record<string, unknown> | null> {
  const lang = language || 'he';
  const langInstruction = lang === 'he'
    ? '\n\nIMPORTANT: Write ALL text values (overall_style, body_structure, fruit_profile, style_notes, summary, what_to_avoid items) in Hebrew. Grape names and region names can stay in their original language.'
    : '';
  try {
    const response: ChatCompletionResponse = await (await getOpenAIClient()).chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an experienced wine sommelier and personal wine advisor. A user has indicated they like a specific wine. Update their taste profile to incorporate insights from this wine preference.

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks.${langInstruction}

The profile should evolve based on the wine they liked. If they currently have no profile, create one based on this wine. If they have an existing profile, refine it to incorporate the characteristics of this wine they enjoyed. Look at patterns across all wines they've liked.

Guidelines for each field:
- overall_style: 2-3 sentences describing their emerging/evolving wine style preferences based on the wines they've liked so far.
- body_structure: Describe their preferred body and structure with context about what they seem drawn to.
- fruit_profile: Detailed description of fruit preferences, noting patterns across their liked wines.
- style_notes: 2-3 sentences about secondary characteristics (oak, minerality, earthiness, spice, etc.) that connect their liked wines.
- recommended_grapes: 4-6 specific grape varieties that match the patterns in their preferences.
- recommended_regions: 4-6 wine regions that produce wines similar to what they've enjoyed.
- what_to_avoid: 3-5 wine styles or characteristics that seem opposite to their preferences, with brief explanations.
- summary: A rich 3-5 sentence personal wine profile summary. Include insights about taste patterns across their liked wines, their palate personality, and a specific recommendation for what to try next.
- liked_wines: Array of names of all wines they've liked (carry forward from existing profile + add the new one).

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
  "liked_wines": ["Wine names they've liked"]
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

    return parseJsonResponse(content) as Record<string, unknown>;
  } catch (error) {
    console.error('Error updating taste profile from wine:', error);
    return null;
  }
}
