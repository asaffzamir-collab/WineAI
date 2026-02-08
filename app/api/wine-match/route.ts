import { NextResponse } from 'next/server';
import type { WineData } from '@/lib/openai';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { matchWineToProfile } = await import('@/lib/openai');
    const { wine, tasteProfiles } = await request.json();
    if (!wine || typeof wine !== 'object') {
      return NextResponse.json(
        { error: 'Wine object required' },
        { status: 400 }
      );
    }
    if (!tasteProfiles || typeof tasteProfiles !== 'object' || Object.keys(tasteProfiles).length === 0) {
      return NextResponse.json({ match: null });
    }
    const relevantProfile =
      tasteProfiles[(wine as WineData).wine_type ?? ''] ||
      tasteProfiles.white ||
      tasteProfiles.rose ||
      tasteProfiles.red ||
      {};
    const p = relevantProfile as Record<string, unknown>;
    const hasProfileContent =
      typeof p === 'object' &&
      p !== null &&
      (Array.isArray(p.liked_wines_detail) && p.liked_wines_detail.length > 0 ||
        Array.isArray(p.liked_wines) && p.liked_wines.length > 0 ||
        (Array.isArray(p.recommended_grapes) && p.recommended_grapes.length > 0) ||
        (typeof p.overall_style === 'string' && p.overall_style.length > 0) ||
        (typeof p.summary === 'string' && p.summary.length > 0));
    if (!hasProfileContent) {
      return NextResponse.json({ match: null });
    }
    const match = await matchWineToProfile(wine as WineData, p);
    return NextResponse.json({ match });
  } catch (error) {
    console.error('Wine match error:', error);
    return NextResponse.json(
      { error: 'Match failed' },
      { status: 500 }
    );
  }
}
