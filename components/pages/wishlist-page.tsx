'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Heart, Star, Trash2, ShoppingCart, Loader2, Wine, MapPin, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { ImageAttribution } from '@/components/ui/image-attribution';
import { LocationPickerModal } from '@/components/cellar/location-picker/location-picker-modal';
import type { Rack, Placement, SlotId } from '@/lib/cellar/types';
import { trackCellar } from '@/lib/cellar/analytics';
import dynamic from 'next/dynamic';

const WineCard = dynamic(() => import('@/components/wine-card').then((m) => m.WineCard), {
  loading: () => <div className="flex items-center justify-center py-12"><div className="h-10 w-10 animate-spin rounded-full border-2 border-bordeaux-200 border-t-bordeaux-500" /></div>,
});
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { WineData, ProfileMatchResult } from '@/lib/openai';
import { getCachedMatch, setCachedMatch, clearMatchCache, invalidateAllMatchCaches } from '@/lib/match-cache';

interface WineRowData {
  id: string;
  name: string;
  winery: string;
  wine_type: string;
  country?: string;
  region?: string;
  grapes?: string[];
  vivino_rating?: number;
  vivino_reviews?: number;
  alcohol?: number;
  tasting_notes?: {
    nose?: string[];
    palate?: string[];
    finish?: string;
  } | null;
  ai_description?: string | null;
  image_url?: string;
  serving?: {
    drink_from?: number;
    drink_until?: number;
    decant_minutes?: number;
    temperature_celsius?: string;
  } | null;
  food_pairings?: string[] | null;
}

interface WishlistItem {
  id: string;
  priority?: number;
  notes?: string;
  wines: WineRowData | WineRowData[] | null;
}

interface WishlistPageProps {
  userId: string;
  initialItems: WishlistItem[];
}

function getWine(item: WishlistItem): WineRowData | null {
  return Array.isArray(item.wines) ? item.wines[0] ?? null : item.wines;
}

function toWineData(wine: WineRowData): WineData {
  return {
    name: wine.name,
    winery: wine.winery,
    wine_type: (wine.wine_type || 'red') as WineData['wine_type'],
    country: wine.country || '',
    region: wine.region,
    grapes: wine.grapes || [],
    vivino_rating: wine.vivino_rating,
    vivino_reviews: wine.vivino_reviews,
    alcohol: wine.alcohol,
    tasting_notes: wine.tasting_notes
      ? {
          nose: wine.tasting_notes.nose || [],
          palate: wine.tasting_notes.palate || [],
          finish: wine.tasting_notes.finish || '',
        }
      : undefined,
    winery_description: wine.ai_description || undefined,
    image_url: wine.image_url,
    serving: wine.serving || undefined,
    food_pairings: wine.food_pairings || undefined,
  };
}

const wineTypeColors: Record<string, string> = {
  red: 'bg-bordeaux-600',
  white: 'bg-gold-100',
  rose: 'bg-bordeaux-200',
  sparkling: 'bg-gold-50',
  dessert: 'bg-copper-400',
};

function WishlistItemImage({ wine }: { wine: WineRowData }) {
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
        <div className="h-14 w-10 overflow-hidden rounded-xl bg-ivory-300 dark:bg-charcoal-700">
          <img src={src} alt={wine.name} className="h-full w-full object-contain" loading="lazy" onError={() => setImgError(true)} />
        </div>
        <ImageAttribution source={lazySource} />
      </div>
    );
  }
  if (loading) {
    return (
      <div className="h-14 w-10 flex-shrink-0 overflow-hidden rounded-xl bg-ivory-300 dark:bg-charcoal-700">
        <div className="h-full w-full animate-pulse bg-gradient-to-b from-ivory-200 to-ivory-400 dark:from-charcoal-600 dark:to-charcoal-800" />
      </div>
    );
  }
  return (
    <div className={cn('flex h-14 w-10 flex-shrink-0 items-center justify-center rounded-xl', wineTypeColors[wine.wine_type || ''] || 'bg-ivory-400')}>
      <Wine className={cn('h-5 w-5', wine.wine_type === 'white' || wine.wine_type === 'sparkling' ? 'text-stone-600' : 'text-white/80')} strokeWidth={1.5} />
    </div>
  );
}

export function WishlistPage({ userId, initialItems }: WishlistPageProps) {
  const t = useTranslations('wishlist');
  const tCellar = useTranslations('cellar');
  const tCommon = useTranslations('common');
  const tSearch = useTranslations('search');
  const tWineCard = useTranslations('wineCard');
  const [items, setItems] = useState<WishlistItem[]>(initialItems);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const [selectedItem, setSelectedItem] = useState<WishlistItem | null>(null);
  const [detailWine, setDetailWine] = useState<WineData | null>(null);
  const [detailMatch, setDetailMatch] = useState<ProfileMatchResult | null>(null);
  const [isFetchingMatch, setIsFetchingMatch] = useState(false);

  const [isAddingToProfile, setIsAddingToProfile] = useState(false);

  const updateLocalItem = useCallback((itemId: string, enriched: Partial<WineData>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const wine = getWine(item);
        if (!wine) return item;
        const updated: WineRowData = {
          ...wine,
          ...(enriched.vivino_rating != null ? { vivino_rating: enriched.vivino_rating } : {}),
          ...(enriched.vivino_reviews != null ? { vivino_reviews: enriched.vivino_reviews } : {}),
          ...(enriched.alcohol != null ? { alcohol: enriched.alcohol } : {}),
          ...(enriched.country && !wine.country ? { country: enriched.country } : {}),
          ...(enriched.region && !wine.region ? { region: enriched.region } : {}),
          ...(enriched.grapes?.length && !wine.grapes?.length ? { grapes: enriched.grapes } : {}),
          ...(enriched.tasting_notes ? { tasting_notes: enriched.tasting_notes } : {}),
          ...(enriched.winery_description ? { ai_description: enriched.winery_description } : {}),
          ...(enriched.image_url && !wine.image_url ? { image_url: enriched.image_url } : {}),
          ...(enriched.serving ? { serving: enriched.serving } : {}),
          ...(enriched.food_pairings ? { food_pairings: enriched.food_pairings } : {}),
        };
        return { ...item, wines: updated };
      }),
    );
  }, []);

  const [purchaseModalItem, setPurchaseModalItem] = useState<WishlistItem | null>(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [purchasePriceNis, setPurchasePriceNis] = useState('');
  const [isSubmittingPurchase, setIsSubmittingPurchase] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationRacks, setLocationRacks] = useState<Rack[]>([]);
  const [locationPlacements, setLocationPlacements] = useState<Map<SlotId, Placement>>(new Map());
  const [lastCellarItemId, setLastCellarItemId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedItem) {
      setDetailWine(null);
      setDetailMatch(null);
      setIsFetchingMatch(false);
      setIsAddingToProfile(false);
      return;
    }
    const wine = getWine(selectedItem);
    if (!wine) return;

    let wineData = toWineData(wine);
    setDetailWine(wineData);

    const sparse = !wine.vivino_rating && !wine.tasting_notes && !wine.serving && !wine.food_pairings;

    let cancelled = false;

    const fetchMatch = (wd: WineData) => {
      const cached = getCachedMatch(userId, wd);
      const isComplete = cached && cached.profile_spectrum && cached.wine_spectrum;
      if (isComplete) {
        setDetailMatch(cached);
        setIsFetchingMatch(false);
        return;
      }
      setDetailMatch(null);
      setIsFetchingMatch(true);
      fetch('/api/wine-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wine: wd, userId }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (!cancelled) {
            const match = data.match ?? null;
            setDetailMatch(match);
            if (match) setCachedMatch(userId, wd, match);
          }
        })
        .catch(() => {})
        .finally(() => { if (!cancelled) setIsFetchingMatch(false); });
    };

    if (sparse) {
      setIsFetchingMatch(true);
      fetch('/api/wine-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: wine.name, winery: wine.winery, wineId: wine.id }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (!cancelled && data.wine) {
            wineData = { ...wineData, ...data.wine };
            setDetailWine(wineData);
            updateLocalItem(selectedItem.id, data.wine);
          }
        })
        .catch(() => {})
        .finally(() => { if (!cancelled) fetchMatch(wineData); });
    } else {
      fetchMatch(wineData);
    }

    return () => { cancelled = true; };
  }, [selectedItem, userId]);

  const enrichedRef = useRef(new Set<string>());
  useEffect(() => {
    const sparse = items.filter((item) => {
      const w = getWine(item);
      if (!w || enrichedRef.current.has(item.id)) return false;
      return !w.vivino_rating && !w.tasting_notes && !w.serving && !w.food_pairings;
    });
    if (sparse.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const item of sparse) {
        if (cancelled) break;
        const w = getWine(item);
        if (!w) continue;
        enrichedRef.current.add(item.id);
        try {
          const res = await fetch('/api/wine-enrich', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: w.name, winery: w.winery, wineId: w.id }),
          });
          const data = await res.json();
          if (!cancelled && data.wine) updateLocalItem(item.id, data.wine);
        } catch { /* best-effort */ }
      }
    })();
    return () => { cancelled = true; };
  }, [items.length]);

  useEffect(() => {
    const handler = () => clearMatchCache(userId);
    window.addEventListener('wine-profile-updated', handler);
    return () => window.removeEventListener('wine-profile-updated', handler);
  }, [userId]);

  const handleDelete = async (itemId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsDeleting(itemId);
    try {
      await fetch(`/api/wishlist?id=${itemId}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      if (selectedItem?.id === itemId) setSelectedItem(null);
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleAddToProfile = async () => {
    if (!selectedItem || isAddingToProfile) return;
    const wine = getWine(selectedItem);
    if (!wine) return;
    setIsAddingToProfile(true);
    try {
      const res = await fetch('/api/profile/add-wine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, wine: toWineData(wine), liked: true }),
      });
      if (res.ok) {
        invalidateAllMatchCaches(userId);
      } else {
        setIsAddingToProfile(false);
      }
    } catch {
      setIsAddingToProfile(false);
    }
  };

  const openMarkPurchasedModal = (item: WishlistItem) => {
    setSelectedItem(null);
    setPurchaseModalItem(item);
    setPurchaseQuantity(1);
    setPurchasePriceNis('');
  };

  const handleConfirmMarkPurchased = async () => {
    if (!purchaseModalItem) return;
    const wine = getWine(purchaseModalItem);
    if (!wine) return;
    setIsSubmittingPurchase(true);
    try {
      const quantity = Math.max(1, Math.floor(purchaseQuantity) || 1);
      const purchasePrice = purchasePriceNis.trim() === ''
        ? undefined
        : parseFloat(purchasePriceNis.replace(/,/g, '.'));
      const body: { userId: string; wine: Record<string, unknown>; quantity: number; purchasePrice?: number } = {
        userId,
        wine: wine as unknown as Record<string, unknown>,
        quantity,
      };
      if (purchasePrice != null && !Number.isNaN(purchasePrice) && purchasePrice >= 0) {
        body.purchasePrice = purchasePrice;
      }
      const cellarRes = await fetch('/api/cellar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const cellarData = await cellarRes.json().catch(() => ({}));
      const newCellarItemId = cellarData?.cellarItemId as string | undefined;
      await fetch(`/api/wishlist?id=${purchaseModalItem.id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((i) => i.id !== purchaseModalItem.id));
      setPurchaseModalItem(null);
      window.dispatchEvent(new Event('cellar-updated'));

      // Offer to choose rack location
      if (newCellarItemId) setLastCellarItemId(newCellarItemId);
      try {
        const raw = localStorage.getItem(`cellar-racks:${userId}`);
        const racks: Rack[] = raw ? JSON.parse(raw) : [];
        if (racks.length > 0) {
          setLocationRacks(racks);
          const slotsRaw = localStorage.getItem(`cellar-slots:${userId}`);
          const assignments: Record<string, string> = slotsRaw ? JSON.parse(slotsRaw) : {};
          const map = new Map<SlotId, Placement>();
          for (const [, slotId] of Object.entries(assignments)) {
            if (slotId) map.set(slotId, { slotId, wineType: 'other' } as Placement);
          }
          setLocationPlacements(map);
          setShowLocationPicker(true);
          trackCellar('location_picker_opened');
        }
      } catch { /* silent */ }
    } catch (error) {
      console.error('Failed to mark as purchased:', error);
    } finally {
      setIsSubmittingPurchase(false);
    }
  };

  const handleLocationSelected = (slotId: SlotId) => {
    if (slotId && lastCellarItemId) {
      try {
        const slotsRaw = localStorage.getItem(`cellar-slots:${userId}`);
        const slots: Record<string, string> = slotsRaw ? JSON.parse(slotsRaw) : {};
        slots[lastCellarItemId] = slotId;
        localStorage.setItem(`cellar-slots:${userId}`, JSON.stringify(slots));
        trackCellar('bottle_added_to_slot');
      } catch { /* silent */ }
      // Persist slot assignment to database
      fetch('/api/cellar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: lastCellarItemId, slotId }),
      }).catch(() => {});
      window.dispatchEvent(new Event('cellar-updated'));
    }
    setShowLocationPicker(false);
    setLastCellarItemId(null);
  };

  return (
    <AppShell>
      <div className="animate-page pt-[max(1.5rem,calc(env(safe-area-inset-top)+0.75rem))] pb-6 md:pt-8 md:pb-8 lg:pt-10 lg:pb-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <PageHeader title={t('title')} />
        {/* Empty State */}
        {items.length === 0 && (
          <EmptyState
            icon={Heart}
            title={t('empty')}
            description={t('emptyDescription')}
            actionLabel={tSearch('title')}
            actionHref="/search"
          />
        )}

        {/* Wishlist Items */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {items.map((item) => {
            const wine = getWine(item);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedItem(item)}
                className={cn(
                  'w-full rounded-2xl bg-card p-3.5 text-start shadow-soft',
                  'card-hover',
                  'flex items-center gap-3',
                )}
              >
                {wine ? (
                  <WishlistItemImage wine={wine} />
                ) : (
                  <div className={cn('flex h-14 w-10 flex-shrink-0 items-center justify-center rounded-xl', 'bg-ivory-400')}>
                    <Wine className="h-5 w-5 text-white/80" strokeWidth={1.5} />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="text-heading text-base text-foreground line-clamp-1">
                    {wine?.name || 'Unknown Wine'}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-1">{wine?.winery}</p>
                  {(wine?.region || wine?.country) && (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1 flex items-center gap-0.5">
                      <MapPin className="h-3 w-3 flex-shrink-0" strokeWidth={1.5} />
                      {[wine?.region, wine?.country].filter(Boolean).join(', ')}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {wine?.vivino_rating != null && (() => {
                      const r = Number(wine.vivino_rating);
                      const lo = Math.max(1.0, r - 0.2);
                      const hi = Math.min(5.0, r + 0.2);
                      return (
                        <span className="flex items-center gap-0.5">
                          <Star className="h-3 w-3 fill-copper-400 text-copper-400" />
                          {lo.toFixed(1)}-{hi.toFixed(1)}
                        </span>
                      );
                    })()}
                    {wine?.grapes && wine.grapes.length > 0 && (
                      <span className="line-clamp-1">{wine.grapes.join(', ')}</span>
                    )}
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 flex-shrink-0 text-bordeaux-300 dark:text-bordeaux-400" strokeWidth={1.5} />
              </button>
            );
          })}
        </div>

      {/* Detail Modal */}
      <Dialog
        open={!!selectedItem}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedItem(null);
            setDetailWine(null);
            setDetailMatch(null);
          }
        }}
      >
        <DialogContent
          onClose={() => {
            setSelectedItem(null);
            setDetailWine(null);
            setDetailMatch(null);
          }}
          className="max-w-lg"
        >
          {selectedItem && detailWine && (
            <div className="space-y-4">
              <WineCard
                wine={detailWine}
                matchResult={detailMatch || undefined}
                matchLoading={isFetchingMatch}
                onAddToProfile={handleAddToProfile}
                isAddingToProfile={isAddingToProfile}
              />
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => openMarkPurchasedModal(selectedItem)}
                >
                  <ShoppingCart className="me-2 h-4 w-4" strokeWidth={1.5} />
                  {t('markPurchased')}
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleDelete(selectedItem.id)}
                  disabled={isDeleting === selectedItem.id}
                >
                  {isDeleting === selectedItem.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Purchase Modal */}
      <Dialog
        open={!!purchaseModalItem}
        onOpenChange={(open) => {
          if (!open) setPurchaseModalItem(null);
        }}
      >
        <DialogContent
          onClose={() => setPurchaseModalItem(null)}
          className="max-w-sm z-[100]"
        >
          {purchaseModalItem && (() => {
            const w = getWine(purchaseModalItem);
            return (
              <>
                <h3 className="text-heading text-lg text-foreground">
                  {tCellar('addWine')}: {w?.name ?? 'Unknown'}
                </h3>
                <p className="text-sm text-muted-foreground">{w?.winery}</p>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-muted-foreground">
                      {tCellar('quantity')}
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={purchaseQuantity}
                      onChange={(e) => setPurchaseQuantity(parseInt(e.target.value, 10) || 1)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-muted-foreground">
                      {tCellar('purchasePriceNis')}
                    </label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      value={purchasePriceNis}
                      onChange={(e) => setPurchasePriceNis(e.target.value)}
                      className="w-full"
                    />
                    <p className="mt-1 text-xs text-muted-foreground/70">{tCellar('priceOptional')}</p>
                  </div>
                </div>
                <div className="mt-6 flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setPurchaseModalItem(null)}
                  >
                    {tCommon('cancel')}
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleConfirmMarkPurchased}
                    disabled={isSubmittingPurchase}
                  >
                    {isSubmittingPurchase ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t('markPurchased')
                    )}
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
        </div>
      </div>

      <LocationPickerModal
        open={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onSelectSlot={handleLocationSelected}
        racks={locationRacks}
        placementMap={locationPlacements}
      />
    </AppShell>
  );
}
