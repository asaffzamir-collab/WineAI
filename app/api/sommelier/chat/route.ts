import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateChatResponse, generateFoodPairing, generateWineDiscovery, type ChatHistoryMessage } from '@/lib/sommelier-ai';
import { requirePremium } from '@/lib/require-premium';
import { requireUsage } from '@/lib/require-usage';
import { incrementUsage } from '@/lib/usage';
import { notifyAdminUsageThreshold } from '@/lib/notify-admin';
import { fetchWineImagesForMany } from '@/lib/wine-image';
import { findCachedWines } from '@/lib/wine-cache';
import { enrichWines, enrichSearchedWines, type EnrichedWine } from '@/lib/enrich-wines';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const premiumBlock = await requirePremium(user.id, 'sommelier_chat');
    if (premiumBlock) return premiumBlock;

    const usageBlock = await requireUsage(user.id, 'pier_message');
    if (usageBlock) return usageBlock;

    const { message, history, stream: wantsStream } = (await request.json()) as {
      message: string;
      history?: ChatHistoryMessage[];
      stream?: boolean;
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
        .select('*, wines(*)')
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

    const cellarWines = (cellarResult.data || []).map((item: Record<string, unknown>) => {
      const w = (item.wines || {}) as Record<string, unknown>;
      return {
        wine_name: w.name,
        winery: w.winery,
        wine_type: w.wine_type,
        country: w.country,
        region: w.region,
        grapes: w.grapes,
        purchase_price: item.purchase_price,
        drink_from: item.drink_from,
        drink_until: item.drink_until,
        quantity: item.quantity,
      };
    });
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

    interface ToolResult {
      id: string;
      name: string;
      result: string;
      wines: EnrichedWine[];
    }

    // ---------- helper: execute a single tool call ----------
    const executeToolCall = async (tc: { id: string; name: string; arguments: Record<string, unknown> }): Promise<ToolResult> => {
      switch (tc.name) {
        case 'search_wine': {
          try {
            const query = tc.arguments.query as string;
            const cached = await findCachedWines(query);
            const { searchWinesByText } = await import('@/lib/openai');
            const wines = cached.length > 0 ? cached : await searchWinesByText(query);
            const top = wines.slice(0, 5);
            const enriched = await enrichSearchedWines(top, combinedProfile, { language: lang });
            return { id: tc.id, name: tc.name, result: JSON.stringify(top), wines: enriched };
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
                name: string; winery: string; region?: string; grape?: string;
                wine_type?: string; country?: string; match?: number; reason?: string;
                tasting_note?: string; food_pairings?: string[];
                positive_matches?: string[]; mismatches?: string[];
                wine_spectrum?: { body: number; tannin: number; sweetness: number; acidity: number };
              }>;
            };
            const top = result.wines?.slice(0, 4) || [];
            const enriched = await enrichWines(top, combinedProfile, {
              language: lang,
              maxFullMatch: 0,
              dbCacheOnly: true,
            });
            return { id: tc.id, name: tc.name, result: JSON.stringify(result), wines: enriched };
          } catch {
            return { id: tc.id, name: tc.name, result: '{}', wines: [] };
          }
        }

        case 'pair_food': {
          try {
            const result = await generateFoodPairing(
              tc.arguments.meal as string, combinedProfile, cellarWines, lang,
            ) as {
              suggestions?: Array<{
                wine: string; winery: string; region?: string;
                grape?: string; wine_type?: string; reason?: string;
              }>;
            };
            const pairWines = result.suggestions?.map(s => ({
              name: s.wine, winery: s.winery, region: s.region,
              grape: s.grape, wine_type: s.wine_type, reason: s.reason,
            })) || [];
            return { id: tc.id, name: tc.name, result: JSON.stringify(result), wines: pairWines };
          } catch {
            return { id: tc.id, name: tc.name, result: '{}', wines: [] };
          }
        }

        default:
          return { id: tc.id, name: tc.name, result: '{}', wines: [] };
      }
    };

    // ---------- helper: batch-fetch missing wine images ----------
    const fillMissingImages = async (allWines: EnrichedWine[]) => {
      const missing = allWines
        .map((w, i) => ({ w, i }))
        .filter(({ w }) => !w.image_url);
      if (missing.length === 0) return;
      const imgResults = await fetchWineImagesForMany(
        missing.map(({ w }) => ({ name: w.name, winery: w.winery })),
      );
      missing.forEach(({ i }, mapIdx) => {
        const result = imgResults.get(`${mapIdx}`);
        if (result) allWines[i].image_url = result.url;
      });
    };

    // ---------- helper: system prompt for follow-up ----------
    const followUpSystemPrompt = `You are "Pier", a warm, knowledgeable personal wine sommelier. Respond naturally based on the tool results provided. Recommend wines, explain pairings, and help with their cellar. Always speak as Pier — with warmth, charm, and genuine passion for wine.
${lang === 'he' ? '\nIMPORTANT: Write ALL text in Hebrew (עברית). Wine names and regions can stay in original language.' : ''}`;

    const msgs = [
      { role: 'system', content: followUpSystemPrompt },
      ...(history || []).slice(-10).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    // ================================================================
    //  STREAMING PATH: tool calls present, client wants SSE
    //  Return Response IMMEDIATELY, process tools inside the stream.
    // ================================================================
    if (chatResult.toolCalls && chatResult.toolCalls.length > 0 && wantsStream) {
      const toolCalls = chatResult.toolCalls;
      const encoder = new TextEncoder();

      const readable = new ReadableStream({
        async start(controller) {
          const send = (event: string, data: unknown) => {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          };
          const keepalive = setInterval(() => {
            try { controller.enqueue(encoder.encode(`: keepalive\n\n`)); } catch { /* closed */ }
          }, 5_000);

          try {
            send('status', { phase: 'processing' });

            // Execute tool calls (inside the stream so bytes flow early)
            const toolResults: ToolResult[] = await Promise.all(
              toolCalls.map(tc => executeToolCall(tc)),
            );
            const allWines = toolResults.flatMap(tr => tr.wines);
            await fillMissingImages(allWines);

            send('wines', allWines);

            // Stream the follow-up text from GPT
            try {
              const { streamChatText } = await import('@/lib/sommelier-ai');
              for await (const text of streamChatText(
                msgs,
                toolResults.map(tr => ({ id: tr.id, name: tr.name, result: tr.result })),
              )) {
                send('text', text);
              }
            } catch (streamErr) {
              console.error('Stream text error, falling back:', streamErr);
              try {
                const { continueChatAfterToolCall } = await import('@/lib/sommelier-ai');
                const fallback = await continueChatAfterToolCall(
                  msgs,
                  toolResults[0].id,
                  toolResults[0].name,
                  toolResults.map(tr => tr.result).join('\n'),
                  { profile: combinedProfile, language: lang },
                );
                const fallbackMsg = typeof fallback === 'object' && fallback !== null
                  ? (fallback as Record<string, unknown>).message as string || JSON.stringify(fallback)
                  : String(fallback);
                send('text', fallbackMsg);
              } catch { /* last resort */ }
            }
          } catch (err) {
            console.error('Tool processing error in stream:', err);
            send('text', lang === 'he' ? 'מצטער, משהו השתבש. נסה שוב.' : 'Sorry, something went wrong. Please try again.');
          } finally {
            clearInterval(keepalive);
          }

          send('done', {});
          controller.close();

          incrementUsage(user.id, 'pier_message').then(({ thresholdHit }) => {
            if (thresholdHit) notifyAdminUsageThreshold(user.id, 'pier_message', thresholdHit);
          }).catch(() => {});
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // ================================================================
    //  NON-STREAMING PATH: tool calls present, JSON response
    // ================================================================
    if (chatResult.toolCalls && chatResult.toolCalls.length > 0) {
      const toolResults: ToolResult[] = await Promise.all(
        chatResult.toolCalls.map(tc => executeToolCall(tc)),
      );
      const allWines = toolResults.flatMap(tr => tr.wines);
      await fillMissingImages(allWines);

      const { continueChatAfterToolCall } = await import('@/lib/sommelier-ai');
      const finalResult = await continueChatAfterToolCall(
        msgs,
        toolResults[0].id,
        toolResults[0].name,
        toolResults.map(tr => tr.result).join('\n'),
        { profile: combinedProfile, language: lang },
      );

      const finalMessage = typeof finalResult === 'object' && finalResult !== null
        ? (finalResult as Record<string, unknown>).message as string || JSON.stringify(finalResult)
        : String(finalResult);

      incrementUsage(user.id, 'pier_message').then(({ thresholdHit }) => {
        if (thresholdHit) notifyAdminUsageThreshold(user.id, 'pier_message', thresholdHit);
      }).catch(() => {});
      return NextResponse.json({ message: finalMessage, wines: allWines, actions: [] });
    }

    // ================================================================
    //  NO TOOL CALLS — direct response
    // ================================================================
    if (wantsStream) {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        start(controller) {
          const send = (event: string, data: unknown) => {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          };
          send('text', chatResult.content);
          send('done', {});
          controller.close();

          incrementUsage(user.id, 'pier_message').then(({ thresholdHit }) => {
            if (thresholdHit) notifyAdminUsageThreshold(user.id, 'pier_message', thresholdHit);
          }).catch(() => {});
        },
      });
      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    incrementUsage(user.id, 'pier_message').then(({ thresholdHit }) => {
      if (thresholdHit) notifyAdminUsageThreshold(user.id, 'pier_message', thresholdHit);
    }).catch(() => {});
    return NextResponse.json({ message: chatResult.content, wines: [], actions: [] });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 });
  }
}
