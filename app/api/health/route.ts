import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  let dbOk = false;
  let aiOk = false;

  try {
    const supabase = await createClient();
    const { error } = await supabase.from('wines').select('id').limit(1);
    dbOk = !error;
  } catch { /* unhealthy */ }

  try {
    const key = process.env.OPENAI_API_KEY?.trim();
    if (key) {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(5000),
      });
      aiOk = res.ok;
    }
  } catch { /* unhealthy */ }

  const allOk = dbOk && aiOk;

  return NextResponse.json(
    { status: allOk ? 'healthy' : 'degraded' },
    { status: allOk ? 200 : 503 },
  );
}
