import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, { ok: boolean; latencyMs: number; error?: string }> = {};

  // Supabase connectivity
  const dbStart = Date.now();
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('wines').select('id').limit(1);
    checks.supabase = {
      ok: !error,
      latencyMs: Date.now() - dbStart,
      ...(error ? { error: error.message } : {}),
    };
  } catch (err) {
    checks.supabase = {
      ok: false,
      latencyMs: Date.now() - dbStart,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }

  // OpenAI API reachability (lightweight models endpoint)
  const aiStart = Date.now();
  try {
    const key = process.env.OPENAI_API_KEY?.trim();
    if (!key) {
      checks.openai = { ok: false, latencyMs: 0, error: 'OPENAI_API_KEY not set' };
    } else {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(5000),
      });
      checks.openai = {
        ok: res.ok,
        latencyMs: Date.now() - aiStart,
        ...(res.ok ? {} : { error: `HTTP ${res.status}` }),
      };
    }
  } catch (err) {
    checks.openai = {
      ok: false,
      latencyMs: Date.now() - aiStart,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }

  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    { status: allOk ? 'healthy' : 'degraded', checks },
    { status: allOk ? 200 : 503 },
  );
}
