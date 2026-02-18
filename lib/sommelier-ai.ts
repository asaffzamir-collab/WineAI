interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}
interface OpenAIClientLike {
  chat: { completions: { create: (opts: unknown) => Promise<ChatCompletionResponse> } };
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
  return JSON.parse(c);
}

async function ask(systemPrompt: string, userPrompt: string, opts?: { temperature?: number; maxTokens?: number }) {
  const client = await getClient();
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
  if (!content) throw new Error('Empty AI response');
  return parseJson(content);
}

function langInstr(lang: string) {
  return lang === 'he'
    ? '\nIMPORTANT: Write ALL text values in Hebrew (עברית). Wine names, grape names, and region names can stay in their original language.'
    : '';
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
  const system = `You are a wine sommelier. The user chose option "${choice}" in a taste refinement exercise. Generate an insight about what this reveals about their palate.
Return JSON: { "insight": "1-2 sentence insight about what this choice reveals" }
${langInstr(language)}`;

  return await ask(system, `User profile: ${JSON.stringify(profile)}\nChoice: ${choice}`);
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
  const system = `You are a wine sommelier helping choose a wine for tonight.
${hasCellar ? 'Prioritize wines from the user\'s cellar.' : 'Suggest a general wine recommendation.'}
Return JSON: { "wine": "wine name", "why": "2-3 sentence explanation", "match": 0-100, "reasons": ["reason1", "reason2", "reason3"] }
${langInstr(language)}`;

  return await ask(system, `Occasion: ${params.occasion}\nFood: ${params.food || 'not specified'}\nMood: ${params.mood}\nCellar: ${JSON.stringify(cellarWines.slice(0, 20))}\nProfile: ${JSON.stringify(profile)}`);
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
  language = 'he'
) {
  const hasCellar = cellarWines.length > 0;
  const system = `You are a wine sommelier. Suggest 2-3 wines that pair well with the described meal.
${hasCellar ? 'Prioritize wines from the user\'s cellar if they match.' : ''}
Return JSON: { "suggestions": [{ "wine": "name", "reason": "brief pairing reason" }, ...] }
${langInstr(language)}`;

  return await ask(system, `Meal: "${meal}"\nProfile: ${JSON.stringify(profile)}\nCellar: ${JSON.stringify(cellarWines.slice(0, 20))}`);
}

export async function generateWineDiscovery(
  profile: Record<string, unknown>,
  recentWines: string[],
  language = 'he'
) {
  const system = `You are a wine sommelier. Recommend 4 wines the user would love based on their profile. Avoid wines they've already tried. Mix familiar styles with one adventurous pick.
Return JSON: { "wines": [{ "name": "...", "region": "...", "grape": "...", "match": 0-100, "reason": "brief reason" }, ...] }
${langInstr(language)}`;

  return await ask(system, `Profile: ${JSON.stringify(profile)}\nRecent/liked wines: ${JSON.stringify(recentWines)}`);
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
