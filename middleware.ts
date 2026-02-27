import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { rateLimit } from '@/lib/rate-limit';

/** Routes that call OpenAI or are otherwise expensive / abuse-prone. */
const RATE_LIMITED_ROUTES: Record<string, { limit: number; windowMs: number }> = {
  '/api/wine-search':  { limit: 15, windowMs: 60_000 },   // 15 req/min
  '/api/onboarding':   { limit: 5,  windowMs: 60_000 },   // 5 req/min
  '/api/auth/register': { limit: 5,  windowMs: 60_000 },   // 5 req/min
};

export async function middleware(request: NextRequest) {
  // --- Rate limiting for expensive API routes ---
  const path = request.nextUrl.pathname;
  const config = RATE_LIMITED_ROUTES[path];

  if (config) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip')
      ?? 'unknown';
    const key = `${ip}:${path}`;
    const { limited, retryAfterMs } = await rateLimit(key, config);

    if (limited) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment and try again.' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) },
        }
      );
    }
  }

  // --- Session refresh ---
  const { supabaseResponse } = await updateSession(request);
  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|sw\\.js\\.map|swe-worker[^.]*\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
