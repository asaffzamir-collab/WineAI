'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Wine, MapPin, ChevronRight, Calendar, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { AppShell } from '@/components/app-shell';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import { ImageAttribution } from '@/components/ui/image-attribution';
import dynamic from 'next/dynamic';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { WineData, ProfileMatchResult } from '@/lib/openai';
import { getCachedMatch, setCachedMatch, clearMatchCache } from '@/lib/match-cache';

const WineCard = dynamic(() => import('@/components/wine-card').then((m) => m.WineCard), {
  loading: () => <div className="flex items-center justify-center py-12"><div className="h-10 w-10 animate-spin rounded-full border-2 border-bordeaux-200 border-t-bordeaux-500" /></div>,
});

interface WineRowData {
  id: string;
  name: string;
  winery: string;
  wine_type: string;
  country?: string;
  region?: string;
  grapes?: string[];
  vivino_rating?: number;
  image_url?: string;
  tasting_notes?: { nose?: string[]; palate?: string[]; finish?: string } | null;
  serving?: { drink_from?: string; drink_until?: string; decant_minutes?: number; temperature_celsius?: number } | null;
  food_pairings?: string[] | null;
  ai_description?: string | null;
  alcohol?: number | null;
  vivino_reviews?: number | null;
}

interface ConsumedItem {
  id: string;
  quantity: number;
  purchase_price?: number;
  purchase_date?: string;
  notes?: string;
  drink_from?: string | null;
  drink_until?: string | null;
  consumed_at?: string | null;
  wines: WineRowData | WineRowData[] | null;
}

interface ConsumedWinesPageProps {
  items: ConsumedItem[];
  userId: string;
}

const wineTypeColors: Record<string, string> = {
  red: 'bg-bordeaux-500',
  white: 'bg-gold-400',
  rose: 'bg-bordeaux-200',
  sparkling: 'bg-gold-50',
  dessert: 'bg-copper-400',
};

function getWine(item: ConsumedItem): WineRowData | null {
  return Array.isArray(item.wines) ? item.wines[0] ?? null : item.wines;
}

function ConsumedItemImage({ wine }: { wine: WineRowData }) {
  const [lazyUrl, setLazyUrl] = useState<string | null>(null);
  const [lazySource, setLazySource] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (wine.image_url || lazyUrl || loading || fetchedRef.current || !wine.name) return;
    let cancelled = false;
    setLoading(true);
    fetchedRef.current = true;
    fetch(`/api/wine-image?name=${encodeURIComponent(wine.name)}&winery=${encodeURIComponent(wine.winery)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.imageUrl) {
          setLazyUrl(data.imageUrl);
          if (data.imageSource) setLazySource(data.imageSource);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [wine.name, wine.winery, wine.image_url, lazyUrl, loading]);

  const src = imgError ? null : (wine.image_url || lazyUrl);

  if (src) {
    return (
      <div className="flex flex-shrink-0 flex-col items-center gap-0.5">
        <div className="h-12 w-9 overflow-hidden rounded-lg bg-ivory-300 dark:bg-charcoal-700">
          <img src={src} alt={wine.name} className="h-full w-full object-contain" loading="lazy" onError={() => setImgError(true)} />
        </div>
        <ImageAttribution source={lazySource} />
      </div>
    );
  }
  if (loading) {
    return (
      <div className="h-12 w-9 flex-shrink-0 overflow-hidden rounded-lg bg-ivory-300 dark:bg-charcoal-700">
        <div className="h-full w-full animate-pulse bg-gradient-to-b from-ivory-200 to-ivory-400 dark:from-charcoal-600 dark:to-charcoal-800" />
      </div>
    );
  }
  return (
    <div className={cn('flex h-12 w-9 flex-shrink-0 items-center justify-center rounded-lg', wineTypeColors[wine.wine_type || ''] || 'bg-ivory-400')}>
      <Wine className={cn('h-4 w-4', wine.wine_type === 'white' || wine.wine_type === 'sparkling' ? 'text-stone-600' : 'text-white/80')} strokeWidth={1.5} />
    </div>
  );
}

export function ConsumedWinesPage({ items, userId }: ConsumedWinesPageProps) {
  const t = useTranslations('consumed');
  const [selectedItem, setSelectedItem] = useState<ConsumedItem | null>(null);
  const [detailWine, setDetailWine] = useState<WineData | null>(null);
  const [matchResult, setMatchResult] = useState<ProfileMatchResult | null>(null);
  const [isFetchingMatch, setIsFetchingMatch] = useState(false);

  useEffect(() => {
    if (!selectedItem) {
      setDetailWine(null);
      setMatchResult(null);
      return;
    }
    const wine = getWine(selectedItem);
    if (!wine) return;

    const wineData: WineData = {
      name: wine.name,
      winery: wine.winery,
      wine_type: (wine.wine_type as WineData['wine_type']) || 'red',
      country: wine.country || '',
      region: wine.region || '',
      grapes: wine.grapes || [],
      vivino_rating: wine.vivino_rating,
      vivino_reviews: wine.vivino_reviews ?? undefined,
      alcohol: wine.alcohol ?? undefined,
      tasting_notes: wine.tasting_notes ? { nose: wine.tasting_notes.nose || [], palate: wine.tasting_notes.palate || [], finish: wine.tasting_notes.finish || '' } : undefined,
      serving: wine.serving ? { drink_from: Number(wine.serving.drink_from) || undefined, drink_until: Number(wine.serving.drink_until) || undefined, decant_minutes: wine.serving.decant_minutes, temperature_celsius: wine.serving.temperature_celsius != null ? String(wine.serving.temperature_celsius) : undefined } : undefined,
      food_pairings: wine.food_pairings ?? undefined,
      winery_description: wine.ai_description ?? undefined,
      image_url: wine.image_url ?? undefined,
    };
    setDetailWine(wineData);

    const cached = getCachedMatch(userId, wineData);
    if (cached) {
      setMatchResult(cached);
      setIsFetchingMatch(false);
      return;
    }

    let cancelled = false;
    setIsFetchingMatch(true);
    setMatchResult(null);
    fetch('/api/wine-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wine: wineData, userId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          const match = data.match ?? null;
          setMatchResult(match);
          if (match) setCachedMatch(userId, wineData, match);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsFetchingMatch(false); });
    return () => { cancelled = true; };
  }, [selectedItem, userId]);

  useEffect(() => {
    const handler = () => clearMatchCache(userId);
    window.addEventListener('wine-profile-updated', handler);
    return () => window.removeEventListener('wine-profile-updated', handler);
  }, [userId]);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <AppShell>
      <div className="animate-page">
        <header className="mb-6 md:mb-8 px-4 sm:px-6 lg:px-8 pt-[max(1rem,calc(env(safe-area-inset-top)+0.5rem))] md:pt-4">
          <div className="mx-auto max-w-3xl flex items-center gap-3">
            <Link href="/" className="flex h-8 w-8 items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors">
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            </Link>
            <h1 className="heading-serif text-xl text-foreground">{t('title')}</h1>
          </div>
        </header>

        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pb-24">
          {items.length === 0 ? (
            <EmptyState
              icon={Wine}
              title={t('empty')}
              description={t('emptyDescription')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map((item) => {
                const wine = getWine(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedItem(item)}
                    className={cn(
                      'w-full rounded-xl bg-card p-3 text-start shadow-soft',
                      'card-hover',
                      'flex items-center gap-3',
                    )}
                  >
                    {wine ? (
                      <ConsumedItemImage wine={wine} />
                    ) : (
                      <div className={cn('flex h-12 w-9 flex-shrink-0 items-center justify-center rounded-lg', 'bg-ivory-400')}>
                        <Wine className="h-4 w-4 text-white/80" strokeWidth={1.5} />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="text-heading text-sm text-foreground line-clamp-1">
                        {wine?.name || 'Unknown Wine'}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{wine?.winery}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                        {(wine?.region || wine?.country) && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="h-2.5 w-2.5 flex-shrink-0" strokeWidth={1.5} />
                            {[wine?.region, wine?.country].filter(Boolean).join(', ')}
                          </span>
                        )}
                        {item.consumed_at && (
                          <span className="flex items-center gap-0.5">
                            <Calendar className="h-2.5 w-2.5 flex-shrink-0" strokeWidth={1.5} />
                            {formatDate(item.consumed_at)}
                          </span>
                        )}
                        {item.purchase_price != null && item.purchase_price > 0 && (
                          <span>{formatCurrency(item.purchase_price)}</span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-bordeaux-300 dark:text-bordeaux-400" strokeWidth={1.5} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Dialog
          open={!!selectedItem}
          onOpenChange={(open) => { if (!open) setSelectedItem(null); }}
        >
          <DialogContent
            onClose={() => setSelectedItem(null)}
            className="max-w-lg max-h-[90vh] overflow-y-auto"
          >
            {detailWine && (
              <WineCard
                wine={detailWine}
                matchResult={matchResult || undefined}
                matchLoading={isFetchingMatch}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
