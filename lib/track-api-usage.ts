/**
 * Lightweight API usage tracking for cost monitoring.
 * Fire-and-forget — never blocks the main request.
 */

import { createAdminClient } from '@/lib/supabase/server';

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o':      { input: 2.50 / 1_000_000, output: 10.00 / 1_000_000 },
  'gpt-4o-mini': { input: 0.15 / 1_000_000, output: 0.60 / 1_000_000 },
};

const SERPER_COST_PER_CALL = 0.001;

function estimateCost(
  service: string,
  model: string | undefined,
  tokensIn: number | undefined,
  tokensOut: number | undefined,
): number {
  if (service === 'serper') return SERPER_COST_PER_CALL;
  if (!model || !tokensIn) return 0;
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;
  return (tokensIn * pricing.input) + ((tokensOut ?? 0) * pricing.output);
}

export interface TrackApiUsageParams {
  userId?: string | null;
  service: 'openai' | 'serper';
  model?: string;
  feature: string;
  tokensIn?: number;
  tokensOut?: number;
  durationMs?: number;
}

export function trackApiUsage(params: TrackApiUsageParams): void {
  const cost = estimateCost(params.service, params.model, params.tokensIn, params.tokensOut);

  try {
    const admin = createAdminClient();
    Promise.resolve(
      admin.from('api_usage_log').insert({
        user_id: params.userId || null,
        service: params.service,
        model: params.model || null,
        feature: params.feature,
        tokens_in: params.tokensIn || null,
        tokens_out: params.tokensOut || null,
        estimated_cost_usd: cost || null,
        duration_ms: params.durationMs || null,
      }),
    ).catch(() => {});
  } catch {
    // Swallow — tracking must never break the main request
  }
}
