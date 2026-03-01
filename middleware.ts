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
  const { supabaseResponse, user, supabase } = await updateSession(request);

  // --- Locale fallback: restore cookie from DB when missing (e.g. PWA relaunch) ---
  if (!request.cookies.get('locale')?.value && user) {
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('preferred_language')
        .eq('id', user.id)
        .single();
      if (data?.preferred_language) {
        supabaseResponse.cookies.set('locale', data.preferred_language, {
          path: '/',
          maxAge: 31536000,
        });
      }
    } catch {
      // best-effort — don't block the request
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|sw\\.js\\.map|swe-worker[^.]*\\.js|api/cron/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
