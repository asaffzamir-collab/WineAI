import { trackApiUsage } from '@/lib/track-api-usage';

interface ToolCall {
  id: string;
  function: { name: string; arguments: string };
}
interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string; tool_calls?: ToolCall[] }; finish_reason?: string }>;
}
interface StreamChunk {
  choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }>;
}
interface OpenAIClientLike {
  chat: { completions: { create: (opts: unknown) => Promise<ChatCompletionResponse> & AsyncIterable<StreamChunk> } };
}

let _openai: OpenAIClientLike | null = null;

async function getClient(): Promise<OpenAIClientLike> {
  if (_openai) return _openai;
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error('OPENAI_API_KEY is not set.');
  const { default: OpenAI } = await import('openai');
  _openai = new OpenAI({ apiKey: key }) as unknown as OpenAIClientLike;
  return _openai;
}

function parseJson(content: string): unknown {
  let c = content.trim();
  if (c.startsWith('```')) {
    const lines = c.split('\n');
    lines.shift();
    if (lines[lines.length - 1]?.trim() === '```') lines.pop();
    c = lines.join('\n').trim();
  }
  const jsonStart = c.indexOf('{');
  const jsonEnd = c.lastIndexOf('}');
  if (jsonStart > 0 && jsonEnd > jsonStart) {
    c = c.slice(jsonStart, jsonEnd + 1);
  }
  return JSON.parse(c);
}

async function ask(systemPrompt: string, userPrompt: string, opts?: { temperature?: number; maxTokens?: number }) {
  const client = await getClient();
  const startTime = Date.now();
  const res: ChatCompletionResponse = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: opts?.temperature ?? 0.6,
    max_tokens: opts?.maxTokens ?? 2000,
  });
  const content = res.choices?.[0]?.message?.content;
  await trackApiUsage({ service: 'openai', model: 'gpt-4o', feature: 'sommelier_ask', tokensIn: Math.ceil((systemPrompt.length + userPrompt.length) / 3), tokensOut: Math.ceil((content?.length || 0) / 3), durationMs: Date.now() - startTime });
  if (!content) throw new Error('Empty AI response');
  return parseJson(content);
}

const SAFETY_INSTRUCTIONS = `
SAFETY RULES (always follow):
- NEVER make health or medical claims about wine (e.g., "wine is good for your heart").
- NEVER provide allergen advice. If asked about allergens or sulfites, tell the user to check the bottle label or contact the producer.
- Do NOT recommend alcohol to manage stress, sleep, or any health condition.
- Encourage responsible consumption. If context is appropriate, remind the user to enjoy wine in moderation.`;

function langInstr(lang: string) {
  return (lang === 'he'
    ? '\nIMPORTANT: Write ALL text values in Hebrew (עברית). Wine names, grape names, and region names can stay in their original language.'
    : '') + SAFETY_INSTRUCTIONS;
}

export async function generateDiscoveryProfile(discoveryData: Record<string, unknown>, language = 'he') {
  const system = `You are an expert wine sommelier. Based on the user's taste calibration answers, generate a preliminary wine taste profile.
Return ONLY valid JSON:
{
  "traits": ["3 short trait labels"],
  "regions": ["2-3 wine regions"],
  "styles": ["2-3 wine styles"],
  "radar": { "body": 0-100, "tannin": 0-100, "sweetness": 0-100, "acidity": 0-100 },
  "wine_suggestion": { "name": "...", "winery": "...", "region": "...", "grape": "...", "description": "...", "why_match": "..." },
  "alternatives": [{ "name": "...", "winery": "...", "region": "...", "grape": "...", "description": "...", "why_match": "..." }, { "name": "...", "winery": "...", "region": "...", "grape": "...", "description": "...", "why_match": "..." }]
}
Use Vivino-style spectrum calibration for radar values.
IMPORTANT: All wine_suggestion and alternatives MUST be wines that are sold and available in Israel (Israeli wineries like Yarden, Recanati, Barkan, Galil Mountain, Carmel, Psagot, Tabor, Vitkin OR international wines widely distributed in Israeli wine shops). The user needs to be able to find and buy these wines locally in Israel.
${langInstr(language)}`;

  return await ask(system, `User calibration data: ${JSON.stringify(discoveryData)}`, { temperature: 0.7, maxTokens: 2000 });
}

export async function adjustDiscoveryProfile(
  currentProfile: Record<string, unknown>,
  feedback: string,
  discoveryData: Record<string, unknown>,
  language = 'he'
) {
  const system = `You are a wine sommelier. The user said their preliminary profile is "${feedback}" (close but not quite / not really). Adjust ONE trait and regenerate a wine suggestion.
Return the same JSON structure as before:
{ "traits": [...], "regions": [...], "styles": [...], "radar": {...}, "wine_suggestion": {...}, "alternatives": [{...}, {...}] }
IMPORTANT: All wine_suggestion and alternatives MUST be wines that are sold and available in Israel.
${langInstr(language)}`;

  return await ask(system, `Current profile: ${JSON.stringify(currentProfile)}\nOriginal calibration: ${JSON.stringify(discoveryData)}\nFeedback: ${feedback}`);
}

export async function generateRefinementChoices(profile: Record<string, unknown>, language = 'he') {
  const system = `You are a wine sommelier. Generate two contrasting wine style options for the user to choose between, to refine their taste profile.
Return JSON: { "choices": [{ "id": "a", "title": "...", "description": "..." }, { "id": "b", "title": "...", "description": "..." }] }
${langInstr(language)}`;

  return await ask(system, `User profile: ${JSON.stringify(profile)}`);
}

export async function processRefinementChoice(profile: Record<string, unknown>, choice: string, language = 'he') {
  const system = `You are a wine sommelier. The user chose option "${choice}" in a taste refinement exercise.
Based on this choice, generate:
1. An insight about what this reveals about their palate
2. Updated profile adjustments that should be applied

Return JSON:
{
  "insight": "1-2 sentence insight about what this choice reveals",
  "profile_updates": {
    "overall_style": "updated overall style description (refine existing, don't replace entirely)",
    "body_structure": "updated body structure preference",
    "style_notes": "updated style notes",
    "taste_spectrum": { "body": 0-100, "tannin": 0-100, "sweetness": 0-100, "acidity": 0-100 },
    "recommended_grapes": ["grape1", "grape2", "grape3"],
    "recommended_regions": ["region1", "region2"]
  }
}
The profile_updates should REFINE the existing profile based on what the choice reveals, not replace everything.
${langInstr(language)}`;

  return await ask(system, `User profile: ${JSON.stringify(profile)}\nChoice: ${choice}`, { maxTokens: 2500 });
}

export async function generatePalateGame(profile: Record<string, unknown>, language = 'he') {
  const system = `You are a wine sommelier. Generate 3 distinct wines for a "Test Your Palate" game. Each should test a different aspect of the user's preferences.
Return JSON: { "wines": [{ "id": "1", "name": "...", "description": "brief flavor description", "region": "..." }, ...] }
${langInstr(language)}`;

  return await ask(system, `User profile: ${JSON.stringify(profile)}`);
}

export async function processPalateGameChoice(profile: Record<string, unknown>, wineId: string, wines: unknown[], language = 'he') {
  const system = `You are a wine sommelier. The user picked wine #${wineId} in a palate game. Explain what this choice reveals about their taste in 2-3 sentences.
Return JSON: { "explanation": "..." }
${langInstr(language)}`;

  return await ask(system, `User profile: ${JSON.stringify(profile)}\nWines shown: ${JSON.stringify(wines)}\nChosen: ${wineId}`);
}

export async function generateTonightRecommendation(
  params: { occasion: string; food?: string; mood: string },
  cellarWines: unknown[],
  profile: Record<string, unknown>,
  language = 'he'
) {
  const hasCellar = cellarWines.length > 0;
  const system = `You are a wine sommelier helping the user choose a wine from their own cellar for tonight.
${hasCellar
    ? `You MUST choose ONLY from the wines listed in their cellar below. Do NOT suggest wines that are not in the cellar.
Consider each wine's readiness (drink_from/drink_until dates) — prefer wines that are ready to drink now.`
    : 'The user has no wines in the cellar. Suggest they add wines to their cellar first and return a helpful message.'}
Return JSON: { "wine": "exact wine name from cellar", "winery": "exact winery from cellar", "region": "region", "grape": "grape variety", "wine_type": "red"|"white"|"rose"|"sparkling", "why": "2-3 sentence explanation of why this cellar wine is the best choice for tonight", "match": 0-100, "reasons": ["reason1", "reason2", "reason3"], "image_url": "image_url from the cellar wine if available, or null" }
${langInstr(language)}`;

  return await ask(system, `Occasion: ${params.occasion}\nFood: ${params.food || 'not specified'}\nMood: ${params.mood}\nCellar wines: ${JSON.stringify(cellarWines.slice(0, 30))}\nTaste profile: ${JSON.stringify(profile)}`, { maxTokens: 1500 });
}

export async function generateBuyingIntelligence(
  wineQuery: string,
  profile: Record<string, unknown>,
  cellarWines: unknown[],
  language = 'he'
) {
  const system = `You are a wine sommelier analyzing if a wine is a good purchase for this user. Check match to profile and overlap with their cellar.
Return JSON: { "match": 0-100, "explanation": "2-3 sentences", "alternative": "optional better value wine name or null", "overlap_warning": "warning if too similar to cellar stock, or null", "confidence": "high"|"medium"|"early_learning" }
${langInstr(language)}`;

  return await ask(system, `Wine query: "${wineQuery}"\nProfile: ${JSON.stringify(profile)}\nCellar (first 20): ${JSON.stringify(cellarWines.slice(0, 20))}`);
}

export async function generateFoodPairing(
  meal: string,
  profile: Record<string, unknown>,
  cellarWines: unknown[],
  language = 'he',
  options?: { occasion?: string; mood?: string }
) {
  const hasCellar = cellarWines.length > 0;
  const occasionCtx = options?.occasion ? `\nOccasion: ${options.occasion}` : '';
  const moodCtx = options?.mood ? `\nMood: ${options.mood}` : '';
  const system = `You are a wine sommelier. Suggest 2-3 wines that pair well with the described meal or occasion.
${hasCellar ? `IMPORTANT: If the user has wines in their cellar that would be a great match, prioritize those wines FIRST.
For cellar wines, consider readiness (drink_from/drink_until dates) — prefer wines ready to drink now.
Mark cellar wines with "from_cellar": true in your response.
You can mix cellar wines with market suggestions if the cellar doesn't have a perfect match.` : ''}
IMPORTANT: All recommended wines MUST be wines that are sold and available in Israel (Israeli wineries or international wines distributed in Israeli wine shops).
Return JSON: { "suggestions": [{ "wine": "exact wine name", "winery": "winery name", "region": "region", "grape": "grape variety", "wine_type": "red"|"white"|"rose"|"sparkling", "reason": "brief pairing reason", "from_cellar": false }, ...] }
${langInstr(language)}`;

  return await ask(system, `Meal: "${meal}"${occasionCtx}${moodCtx}\nProfile: ${JSON.stringify(profile)}\nCellar: ${JSON.stringify(cellarWines.slice(0, 30))}`);
}

export async function generateWineDiscovery(
  profile: Record<string, unknown>,
  recentWines: string[],
  language = 'he'
) {
  const system = `You are a wine sommelier. Recommend 4 wines the user would love based on their profile. Avoid wines they've already tried. Mix familiar styles with one adventurous pick.
IMPORTANT: All recommended wines MUST be wines that are sold and available in Israel (Israeli wineries or international wines distributed in Israeli wine shops), so the user can find and buy them locally.
Return JSON: { "wines": [{ "name": "...", "winery": "...", "region": "...", "grape": "...", "wine_type": "red"|"white"|"rose"|"sparkling", "country": "...", "match": 0-100, "reason": "2-3 sentence explanation of why this wine matches the profile", "tasting_note": "1-2 sentence tasting description", "food_pairings": ["pairing1", "pairing2", "pairing3"], "positive_matches": ["what aligns with profile point 1", "point 2"], "mismatches": ["slight deviation from profile, if any"], "wine_spectrum": { "body": 0-100, "tannin": 0-100, "sweetness": 0-100, "acidity": 0-100 } }, ...] }
${langInstr(language)}`;

  return await ask(system, `Profile: ${JSON.stringify(profile)}\nRecent/liked wines: ${JSON.stringify(recentWines)}`, { maxTokens: 3000 });
}

export async function generateTasteEvolutionInsight(
  evolutionData: unknown[],
  currentProfile: Record<string, unknown>,
  language = 'he'
) {
  const system = `You are a wine sommelier analyzing how a user's taste has evolved. Provide trends and insight.
Return JSON: { "current": { "body": 0-100, "tannin": 0-100, "sweetness": 0-100, "acidity": 0-100 }, "insight": "2-3 sentence narrative", "trends": ["trend description 1", "trend description 2"] }
${langInstr(language)}`;

  return await ask(system, `Evolution snapshots: ${JSON.stringify(evolutionData)}\nCurrent profile: ${JSON.stringify(currentProfile)}`);
}

export async function generateCellarIntelligence(
  cellarWines: unknown[],
  profile: Record<string, unknown>,
  language = 'he'
) {
  const system = `You are a wine sommelier analyzing a user's cellar. Provide 2-3 actionable suggestions about peak drinking windows, diversity, and gaps.
Return JSON: { "suggestions": [{ "type": "peak_window"|"diversity"|"gap", "title": "short title", "description": "1-2 sentence suggestion" }, ...] }
${langInstr(language)}`;

  return await ask(system, `Cellar wines: ${JSON.stringify(cellarWines.slice(0, 30))}\nProfile: ${JSON.stringify(profile)}`);
}

export async function generateFreeformInsight(
  query: string,
  profile: Record<string, unknown>,
  language = 'he'
) {
  const system = `You are a personal wine sommelier. Answer the user's wine question concisely, using their taste profile for context.
Return JSON: { "title": "short title for the answer", "content": "2-4 sentence answer", "reasons": ["key point 1", "key point 2"] (optional), "confidence": "high"|"medium"|"early_learning" }
${langInstr(language)}`;

  return await ask(system, `Question: "${query}"\nProfile: ${JSON.stringify(profile)}`);
}

const CHAT_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'search_wine',
      description: 'Search for a specific wine by name, winery, grape, or region. Use when the user asks to find a wine.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Wine search query (name, winery, grape, or region)' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'recommend_wines',
      description: 'Recommend wines based on criteria like occasion, food pairing, mood, or style. Use when the user asks for suggestions.',
      parameters: {
        type: 'object',
        properties: {
          criteria: { type: 'string', description: 'What kind of wine the user is looking for' },
          occasion: { type: 'string', description: 'The occasion (dinner, party, gift, etc.)' },
          food: { type: 'string', description: 'Food to pair with, if mentioned' },
          budget: { type: 'string', description: 'Budget constraint if mentioned' },
        },
        required: ['criteria'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'check_cellar',
      description: 'Look at what wines the user has in their cellar. Use when asked about their collection or to suggest from their cellar.',
      parameters: {
        type: 'object',
        properties: {
          filter: { type: 'string', description: 'Optional filter: "ready" for ready-to-drink, "red"/"white" for type, etc.' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'pair_food',
      description: 'Suggest wine pairings for a specific meal or dish.',
      parameters: {
        type: 'object',
        properties: {
          meal: { type: 'string', description: 'The meal or dish to pair wine with' },
        },
        required: ['meal'],
      },
    },
  },
];

export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function generateChatResponse(
  message: string,
  history: ChatHistoryMessage[],
  context: {
    profile: Record<string, unknown>;
    cellarWines?: unknown[];
    wishlist?: unknown[];
    language?: string;
    userName?: string;
    sommelierProfile?: Record<string, unknown>;
    hasFullAccess?: boolean;
  }
) {
  const lang = context.language || 'he';
  const client = await getClient();

  const cellarSummary = context.cellarWines?.length
    ? `User has ${context.cellarWines.length} wines in cellar. Here are the wines:\n${JSON.stringify(context.cellarWines.slice(0, 30), null, 0)}`
    : 'User has no wines in cellar yet.';

  const wishlistSummary = context.wishlist?.length
    ? `User has ${context.wishlist.length} wines on wishlist:\n${JSON.stringify(context.wishlist, null, 0)}`
    : '';

  const discoveryData = context.sommelierProfile?.discovery_data
    ? `\nUser's discovery/onboarding answers: ${JSON.stringify(context.sommelierProfile.discovery_data)}`
    : '';

  const systemPrompt = `You are "Pier", a warm, knowledgeable, and charming personal wine sommelier in the WineJourney app. You have a conversational, friendly tone — like a trusted wine expert friend who has known the user for years.

Your personality:
- You introduce yourself as Pier on the first message of a conversation.
- You are passionate about wine and love helping people discover their taste.
- You speak with warmth, occasional wit, and genuine enthusiasm.
- You remember everything about the user — their taste profile, cellar, wishlist, and past preferences.
- When the user asks what you know about them, share a rich summary of their taste profile, preferences, cellar, and journey — you are their personal sommelier and should demonstrate deep familiarity.

You have access to the user's taste profile and can search for wines, check their cellar, recommend wines, and suggest food pairings using the provided tools.

Guidelines:
- Be conversational and natural. Use short, clear sentences.
- When recommending wines, always explain WHY based on the user's taste profile.
- Prefer wines available in Israel (Israeli wineries or international wines distributed locally) unless the user asks otherwise.
- When you use a tool, incorporate the results naturally into your response.
- You can suggest follow-up actions the user might want to take.
- Keep responses concise — 2-4 sentences for simple questions, more for detailed recommendations.
${!context.hasFullAccess ? `
IMPORTANT: The user has not yet built a full taste profile (they need to like at least 2 wines).
In this basic tier, focus on:
- Helping them find wines they might enjoy through conversation
- Encouraging them to search for wines they already know and like
- When they express interest in a wine, remind them to tap the heart icon to like it
- Be encouraging about their journey — they're just getting started!
Do NOT offer personalized recommendation features yet — explain these unlock after they like 2 wines.` : ''}
${langInstr(lang)}

${context.userName ? `User's name: ${context.userName}` : ''}
User's taste profile (organized by wine type — red, white, rose — each with its own preferences, liked wines, and taste spectrum):
${JSON.stringify(context.profile)}${discoveryData}
${cellarSummary}
${wishlistSummary}`;

  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  const recentHistory = history.slice(-10);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }
  messages.push({ role: 'user', content: message });

  const startTime = Date.now();
  const res: ChatCompletionResponse = await client.chat.completions.create({
    model: 'gpt-4o',
    messages,
    tools: CHAT_TOOLS,
    temperature: 0.7,
    max_tokens: 2000,
  });

  const choice = res.choices?.[0];
  await trackApiUsage({ service: 'openai', model: 'gpt-4o', feature: 'sommelier_chat', tokensIn: Math.ceil(JSON.stringify(messages).length / 4), tokensOut: Math.ceil((choice?.message?.content?.length || 0) / 3), durationMs: Date.now() - startTime });
  if (!choice?.message) throw new Error('Empty AI response');

  if (choice.message.tool_calls?.length) {
    return {
      content: choice.message.content || '',
      toolCalls: choice.message.tool_calls.map(tc => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments),
      })),
    };
  }

  return {
    content: choice.message.content || '',
    toolCalls: null,
  };
}

function buildToolCallMessages(
  originalMessages: Array<{ role: string; content: string }>,
  toolCalls: Array<{ id: string; name: string; result: string }>,
) {
  return [
    ...originalMessages,
    {
      role: 'assistant',
      content: null as string | null,
      tool_calls: toolCalls.map(tc => ({
        id: tc.id,
        type: 'function' as const,
        function: { name: tc.name, arguments: '{}' },
      })),
    },
    ...toolCalls.map(tc => ({
      role: 'tool' as const,
      tool_call_id: tc.id,
      content: tc.result,
    })),
  ];
}

export async function continueChatAfterToolCall(
  originalMessages: Array<{ role: string; content: string }>,
  toolCallId: string,
  toolName: string,
  toolResult: string,
  context: {
    profile: Record<string, unknown>;
    language?: string;
  }
) {
  const client = await getClient();

  const messages = buildToolCallMessages(originalMessages, [
    { id: toolCallId, name: toolName, result: toolResult },
  ]);

  const startTime = Date.now();
  const res: ChatCompletionResponse = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    temperature: 0.7,
    max_tokens: 2000,
  });

  void context.language;

  const content = res.choices?.[0]?.message?.content;
  await trackApiUsage({ service: 'openai', model: 'gpt-4o-mini', feature: 'sommelier_chat_tool', tokensIn: Math.ceil(JSON.stringify(messages).length / 4), tokensOut: Math.ceil((content?.length || 0) / 3), durationMs: Date.now() - startTime });
  if (!content) throw new Error('Empty AI response after tool call');

  try {
    return parseJson(content);
  } catch {
    return { message: content, wines: [], actions: [] };
  }
}

/**
 * Streaming follow-up after tool calls.
 * Async generator that yields text chunks from GPT as they arrive.
 */
export async function* streamChatText(
  originalMessages: Array<{ role: string; content: string }>,
  toolCalls: Array<{ id: string; name: string; result: string }>,
): AsyncGenerator<string> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error('OPENAI_API_KEY is not set.');
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey: key });

  const messages = buildToolCallMessages(originalMessages, toolCalls);

  const startTime = Date.now();
  let totalChars = 0;
  const stream = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: messages as any,
    temperature: 0.7,
    max_tokens: 2000,
    stream: true,
  });

  for await (const chunk of stream) {
    const text = chunk.choices?.[0]?.delta?.content;
    if (text) {
      yield text;
      totalChars += text.length;
    }
  }
  void trackApiUsage({ service: 'openai', model: 'gpt-4o-mini', feature: 'sommelier_chat_stream', tokensIn: Math.ceil(JSON.stringify(originalMessages).length / 4), tokensOut: Math.ceil(totalChars / 3), durationMs: Date.now() - startTime });
}
