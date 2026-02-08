import { type NextRequest, NextResponse } from 'next/server';

/** Auth disabled: all routes open. Enable auth later by restoring updateSession + protected paths. */
export async function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
