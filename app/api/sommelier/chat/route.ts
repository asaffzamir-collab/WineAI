import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateChatResponse, generateFoodPairing, generateWineDiscovery, type ChatHistoryMessage } from '@/lib/sommelier-ai';
import { requirePremium } from '@/lib/require-premium';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const premiumBlock = await requirePremium(user.id, 'sommelier_chat');
    if (premiumBlock) return premiumBlock;

    const { message, history } = (await request.json()) as {
      message: string;
      history?: ChatHistoryMessage[];
    };
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('preferred_language, display_name')
      .eq('id', user.id)
      .single();
    const lang = userProfile?.preferred_language || 'he';

    const [profileResult, cellarResult, wishlistResult, sommelierProfileResult] = await Promise.all([
      supabase.from('taste_profiles').select('profile_data, wine_type').eq('user_id', user.id),
      supabase
        .from('cellar_items')
        .select('wine_name, winery, wine_type, country, region, grapes, purchase_price, drink_from, drink_until, quantity')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('wishlist_items')
        .select('wine_name, winery, wine_type')
        .eq('user_id', user.id)
        .limit(20),
      supabase
        .from('sommelier_profiles')
        .select('discovery_data, phase, taste_precision')
        .eq('user_id', user.id)
        .single(),
    ]);

    const combinedProfile = profileResult.data?.reduce(
      (acc, p) => ({ ...acc, ...(p.profile_data as object) }),
      {} as Record<string, unknown>
    ) || {};

    const cellarWines = cellarResult.data || [];
    const wishlist = wishlistResult.data || [];
    const sommelierProfile = (sommelierProfileResult.data as Record<string, unknown>) || {};

    const chatResult = await generateChatResponse(
      message,
      history || [],
      {
        profile: combinedProfile,
        cellarWines,
        wishlist,
        language: lang,
        userName: userProfile?.display_name || undefined,
        sommelierProfile,
      }
    );

    interface ToolResultWine {
      name: string;
      winery: string;
      region?: string;
      grape?: string;
      wine_type?: string;
      country?: string;
      match?: number;
      reason?: string;
      tasting_note?: string;
      image_url?: string;
    }
    interface ToolResult {
      id: string;
      name: string;
      result: string;
      wines: ToolResultWine[];
    }

    if (chatResult.toolCalls && chatResult.toolCalls.length > 0) {
      const toolResults: ToolResult[] = await Promise.all(
        chatResult.toolCalls.map(async (tc): Promise<ToolResult> => {
          switch (tc.name) {
            case 'search_wine': {
              try {
                const { searchWinesByText } = await import('@/lib/openai');
                const wines = await searchWinesByText(tc.arguments.query as string);
                return {
                  id: tc.id,
                  name: tc.name,
                  result: JSON.stringify(wines.slice(0, 5)),
                  wines: wines.slice(0, 5).map(w => ({
                    name: w.name,
                    winery: w.winery,
                    region: w.region,
                    grape: w.grapes?.join(', '),
                    wine_type: w.wine_type,
                    country: w.country,
                    image_url: w.image_url,
                  })),
                };
              } catch {
                return { id: tc.id, name: tc.name, result: '[]', wines: [] };
              }
            }

            case 'check_cellar': {
              const filter = tc.arguments.filter as string | undefined;
              let filtered = cellarWines;
              if (filter === 'ready') {
                const now = new Date().getFullYear();
                filtered = cellarWines.filter((w: Record<string, unknown>) => {
                  const from = Number(w.drink_from) || 0;
                  const until = Number(w.drink_until) || 9999;
                  return now >= from && now <= until;
                });
              } else if (filter) {
                filtered = cellarWines.filter((w: Record<string, unknown>) =>
                  String(w.wine_type).toLowerCase() === filter.toLowerCase()
                );
              }
              return {
                id: tc.id,
                name: tc.name,
                result: JSON.stringify(filtered.slice(0, 20)),
                wines: filtered.slice(0, 5).map((w: Record<string, unknown>) => ({
                  name: w.wine_name as string,
                  winery: w.winery as string,
                  wine_type: w.wine_type as string,
                  country: w.country as string,
                  region: w.region as string,
                })),
              };
            }

            case 'recommend_wines': {
              try {
                const recentNames = cellarWines.slice(0, 10).map((w: Record<string, unknown>) => w.wine_name as string);
                const result = await generateWineDiscovery(combinedProfile, recentNames, lang) as {
                  wines?: Array<{
                    name: string;
                    winery: string;
                    region?: string;
                    grape?: string;
                    wine_type?: string;
                    country?: string;
                    match?: number;
                    reason?: string;
                    tasting_note?: string;
                  }>;
                };
                return {
                  id: tc.id,
                  name: tc.name,
                  result: JSON.stringify(result),
                  wines: result.wines?.slice(0, 4).map(w => ({
                    name: w.name,
                    winery: w.winery,
                    region: w.region,
                    grape: w.grape,
                    wine_type: w.wine_type,
                    country: w.country,
                    match: w.match,
                    reason: w.reason,
                    tasting_note: w.tasting_note,
                  })) || [],
                };
              } catch {
                return { id: tc.id, name: tc.name, result: '{}', wines: [] };
              }
            }

            case 'pair_food': {
              try {
                const result = await generateFoodPairing(
                  tc.arguments.meal as string,
                  combinedProfile,
                  cellarWines,
                  lang
                ) as {
                  suggestions?: Array<{
                    wine: string;
                    winery: string;
                    region?: string;
                    grape?: string;
                    wine_type?: string;
                    reason?: string;
                  }>;
                };
                return {
                  id: tc.id,
                  name: tc.name,
                  result: JSON.stringify(result),
                  wines: result.suggestions?.map(s => ({
                    name: s.wine,
                    winery: s.winery,
                    region: s.region,
                    grape: s.grape,
                    wine_type: s.wine_type,
                    reason: s.reason,
                  })) || [],
                };
              } catch {
                return { id: tc.id, name: tc.name, result: '{}', wines: [] };
              }
            }

            default:
              return { id: tc.id, name: tc.name, result: '{}', wines: [] };
          }
        })
      );

      const allWines = toolResults.flatMap(tr => tr.wines);

      const { continueChatAfterToolCall } = await import('@/lib/sommelier-ai');
      const systemPrompt = `You are "Pier", a warm, knowledgeable personal wine sommelier. Respond naturally based on the tool results provided. Recommend wines, explain pairings, and help with their cellar. Always speak as Pier — with warmth, charm, and genuine passion for wine.
${lang === 'he' ? '\nIMPORTANT: Write ALL text in Hebrew (עברית). Wine names and regions can stay in original language.' : ''}`;

      const msgs = [
        { role: 'system', content: systemPrompt },
        ...(history || []).slice(-10).map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: message },
      ];

      const finalResult = await continueChatAfterToolCall(
        msgs,
        toolResults[0].id,
        toolResults[0].name,
        toolResults.map(tr => tr.result).join('\n'),
        { profile: combinedProfile, language: lang }
      );

      const finalMessage = typeof finalResult === 'object' && finalResult !== null
        ? (finalResult as Record<string, unknown>).message as string || JSON.stringify(finalResult)
        : String(finalResult);

      return NextResponse.json({
        message: finalMessage,
        wines: allWines,
        actions: [],
      });
    }

    return NextResponse.json({
      message: chatResult.content,
      wines: [],
      actions: [],
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 });
  }
}
