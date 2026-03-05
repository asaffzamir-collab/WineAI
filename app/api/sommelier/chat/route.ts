import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateChatResponse, generateFoodPairing, generateWineDiscovery, type ChatHistoryMessage } from '@/lib/sommelier-ai';
import { requirePremium } from '@/lib/require-premium';
import { requireUsage } from '@/lib/require-usage';
import { incrementUsage } from '@/lib/usage';
import { notifyAdminUsageThreshold } from '@/lib/notify-admin';
import { fetchWineImagesForMany } from '@/lib/wine-image';
import { findCachedWines } from '@/lib/wine-cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const premiumBlock = await requirePremium(user.id, 'sommelier_chat');
    if (premiumBlock) return premiumBlock;

    const usageBlock = await requireUsage(user.id, 'pier_message');
    if (usageBlock) return usageBlock;

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

    const combinedProfile = profileResult.data?.reduce((acc, p) => {
      acc[p.wine_type] = p.profile_data;
      return acc;
    }, {} as Record<string, unknown>) || {};

    let likedWinesCount = 0;
    for (const tp of (profileResult.data || [])) {
      const pd = tp.profile_data as Record<string, unknown> | null;
      if (pd && Array.isArray(pd.liked_wines)) likedWinesCount += pd.liked_wines.length;
    }

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
        hasFullAccess: likedWinesCount >= 2,
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
      food_pairings?: string[];
      alcohol?: string;
      vivino_rating?: number;
      vivino_reviews?: number;
      tasting_notes?: { nose?: string[]; palate?: string[]; finish?: string };
      serving?: { drink_from?: number; drink_until?: number; decant_minutes?: number; temperature_celsius?: number };
      positive_matches?: string[];
      mismatches?: string[];
      wine_spectrum?: { body: number; tannin: number; sweetness: number; acidity: number };
      profile_spectrum?: { body: number; tannin: number; sweetness: number; acidity: number };
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
                const query = tc.arguments.query as string;
                const cached = await findCachedWines(query);
                const { searchWinesByText, matchWineToProfile } = await import('@/lib/openai');
                const wines = cached.length > 0 ? cached : await searchWinesByText(query);
                const top = wines.slice(0, 5);

                const enriched = await Promise.all(
                  top.map(async (w) => {
                    let matchData: { match_percentage?: number; explanation?: string; positive_matches?: string[]; mismatches?: string[]; wine_spectrum?: { body: number; tannin: number; sweetness: number; acidity: number }; profile_spectrum?: { body: number; tannin: number; sweetness: number; acidity: number } } = {};
                    try {
                      if (Object.keys(combinedProfile).length > 0) {
                        const raw = await matchWineToProfile(w, combinedProfile);
                        matchData = {
                          match_percentage: raw.match_percentage,
                          explanation: raw.explanation,
                          positive_matches: raw.positive_matches,
                          mismatches: raw.mismatches,
                          wine_spectrum: raw.wine_spectrum ? { body: raw.wine_spectrum.body, tannin: raw.wine_spectrum.tannin, sweetness: raw.wine_spectrum.sweetness, acidity: raw.wine_spectrum.acidity } : undefined,
                          profile_spectrum: raw.profile_spectrum ? { body: raw.profile_spectrum.body, tannin: raw.profile_spectrum.tannin, sweetness: raw.profile_spectrum.sweetness, acidity: raw.profile_spectrum.acidity } : undefined,
                        };
                      }
                    } catch {}
                    return {
                      name: w.name,
                      winery: w.winery,
                      region: w.region,
                      grape: w.grapes?.join(', '),
                      wine_type: w.wine_type,
                      country: w.country,
                      image_url: w.image_url,
                      food_pairings: w.food_pairings,
                      alcohol: w.alcohol != null ? String(w.alcohol) : undefined,
                      vivino_rating: w.vivino_rating,
                      vivino_reviews: w.vivino_reviews,
                      tasting_notes: w.tasting_notes,
                      serving: w.serving ? {
                        drink_from: w.serving.drink_from,
                        drink_until: w.serving.drink_until,
                        decant_minutes: w.serving.decant_minutes,
                        temperature_celsius: w.serving.temperature_celsius ? Number(w.serving.temperature_celsius) : undefined,
                      } : undefined,
                      match: matchData.match_percentage,
                      reason: matchData.explanation,
                      positive_matches: matchData.positive_matches,
                      mismatches: matchData.mismatches,
                      wine_spectrum: matchData.wine_spectrum as ToolResultWine['wine_spectrum'],
                      profile_spectrum: matchData.profile_spectrum as ToolResultWine['profile_spectrum'],
                    };
                  }),
                );

                return {
                  id: tc.id,
                  name: tc.name,
                  result: JSON.stringify(top),
                  wines: enriched,
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
                    food_pairings?: string[];
                    positive_matches?: string[];
                    mismatches?: string[];
                    wine_spectrum?: { body: number; tannin: number; sweetness: number; acidity: number };
                  }>;
                };

                const { searchWinesByText, matchWineToProfile } = await import('@/lib/openai');
                const top = result.wines?.slice(0, 4) || [];

                const enriched = await Promise.all(
                  top.map(async (w) => {
                    const base: ToolResultWine = {
                      name: w.name,
                      winery: w.winery,
                      region: w.region,
                      grape: w.grape,
                      wine_type: w.wine_type,
                      country: w.country,
                      match: w.match,
                      reason: w.reason,
                      tasting_note: w.tasting_note,
                      food_pairings: w.food_pairings,
                      positive_matches: w.positive_matches,
                      mismatches: w.mismatches,
                      wine_spectrum: w.wine_spectrum,
                    };
                    try {
                      const found = await searchWinesByText(`${w.name} ${w.winery}`);
                      const fullWine = found?.[0];
                      if (fullWine && Object.keys(combinedProfile).length > 0) {
                        const raw = await matchWineToProfile(fullWine, combinedProfile);
                        base.match = raw.match_percentage;
                        base.reason = raw.explanation || base.reason;
                        base.positive_matches = raw.positive_matches;
                        base.mismatches = raw.mismatches;
                        base.wine_spectrum = raw.wine_spectrum ? { body: raw.wine_spectrum.body, tannin: raw.wine_spectrum.tannin, sweetness: raw.wine_spectrum.sweetness, acidity: raw.wine_spectrum.acidity } : base.wine_spectrum;
                        base.profile_spectrum = raw.profile_spectrum ? { body: raw.profile_spectrum.body, tannin: raw.profile_spectrum.tannin, sweetness: raw.profile_spectrum.sweetness, acidity: raw.profile_spectrum.acidity } : undefined;
                        if (fullWine.tasting_notes) base.tasting_notes = fullWine.tasting_notes as ToolResultWine['tasting_notes'];
                        if (fullWine.vivino_rating) base.vivino_rating = fullWine.vivino_rating;
                        if (fullWine.vivino_reviews) base.vivino_reviews = fullWine.vivino_reviews;
                        if (fullWine.alcohol) base.alcohol = String(fullWine.alcohol);
                        if (fullWine.image_url) base.image_url = fullWine.image_url;
                        if (fullWine.serving) {
                          base.serving = {
                            drink_from: fullWine.serving.drink_from,
                            drink_until: fullWine.serving.drink_until,
                            decant_minutes: fullWine.serving.decant_minutes,
                            temperature_celsius: fullWine.serving.temperature_celsius ? Number(fullWine.serving.temperature_celsius) : undefined,
                          };
                        }
                      }
                    } catch {}
                    return base;
                  }),
                );

                return {
                  id: tc.id,
                  name: tc.name,
                  result: JSON.stringify(result),
                  wines: enriched,
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

      // Batch-fetch images for wines that don't already have one
      const winesMissingImages = allWines
        .map((w, i) => ({ w, i }))
        .filter(({ w }) => !w.image_url);
      if (winesMissingImages.length > 0) {
        const imgResults = await fetchWineImagesForMany(
          winesMissingImages.map(({ w }) => ({ name: w.name, winery: w.winery })),
        );
        winesMissingImages.forEach(({ i }, mapIdx) => {
          const result = imgResults.get(`${mapIdx}`);
          if (result) allWines[i].image_url = result.url;
        });
      }

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

      incrementUsage(user.id, 'pier_message').then(({ thresholdHit }) => {
        if (thresholdHit) notifyAdminUsageThreshold(user.id, 'pier_message', thresholdHit);
      }).catch(() => {});
      return NextResponse.json({
        message: finalMessage,
        wines: allWines,
        actions: [],
      });
    }

    incrementUsage(user.id, 'pier_message').then(({ thresholdHit }) => {
      if (thresholdHit) notifyAdminUsageThreshold(user.id, 'pier_message', thresholdHit);
    }).catch(() => {});
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
