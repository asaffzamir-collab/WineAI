'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Heart, Star, Trash2, ShoppingCart, Loader2, Wine, MapPin, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BottomNav } from '@/components/bottom-nav';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import dynamic from 'next/dynamic';

const WineCard = dynamic(() => import('@/components/wine-card').then((m) => m.WineCard), {
  loading: () => <div className="flex items-center justify-center py-12"><div className="h-10 w-10 animate-spin rounded-full border-2 border-bordeaux-200 border-t-bordeaux-500" /></div>,
});
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { WineData, ProfileMatchResult } from '@/lib/openai';

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

  const [purchaseModalItem, setPurchaseModalItem] = useState<WishlistItem | null>(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [purchasePriceNis, setPurchasePriceNis] = useState('');
  const [isSubmittingPurchase, setIsSubmittingPurchase] = useState(false);

  useEffect(() => {
    if (!selectedItem) {
      setDetailWine(null);
      setDetailMatch(null);
      return;
    }
    const wine = getWine(selectedItem);
    if (!wine) return;

    setDetailWine(toWineData(wine));
    setDetailMatch(null);

    let cancelled = false;
    fetch('/api/wine-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wine: toWineData(wine), userId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setDetailMatch(data.match ?? null);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [selectedItem, userId]);

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
      await fetch('/api/cellar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      await fetch(`/api/wishlist?id=${purchaseModalItem.id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((i) => i.id !== purchaseModalItem.id));
      setPurchaseModalItem(null);
    } catch (error) {
      console.error('Failed to mark as purchased:', error);
    } finally {
      setIsSubmittingPurchase(false);
    }
  };

  return (
    <div className="min-h-screen bg-ivory-200 pb-24 dark:bg-charcoal-900">
      <PageHeader title={t('title')} />

      <div className="mx-auto max-w-lg px-4 animate-page">
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
        <div className="-mt-4 space-y-3">
          {items.map((item) => {
            const wine = getWine(item);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedItem(item)}
                className={cn(
                  'w-full rounded-2xl bg-white p-3.5 text-left shadow-soft',
                  'hover:shadow-soft-lg hover:translate-y-[-1px] hover:bg-ivory-50 transition-all duration-200 ease-premium',
                  'flex items-center gap-3',
                  'dark:bg-charcoal-800 dark:hover:bg-charcoal-700'
                )}
              >
                {wine?.image_url ? (
                  <div className="h-14 w-10 flex-shrink-0 overflow-hidden rounded-xl bg-ivory-300 dark:bg-charcoal-700">
                    <img
                      src={wine.image_url}
                      alt={wine.name}
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div
                    className={cn(
                      'flex h-14 w-10 flex-shrink-0 items-center justify-center rounded-xl',
                      wineTypeColors[wine?.wine_type || ''] || 'bg-ivory-400'
                    )}
                  >
                    <Wine className={cn(
                      'h-5 w-5',
                      wine?.wine_type === 'white' || wine?.wine_type === 'sparkling'
                        ? 'text-stone-600' : 'text-white/80'
                    )} strokeWidth={1.5} />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="heading-serif text-base text-bordeaux-600 line-clamp-1 dark:text-ivory-200">
                    {wine?.name || 'Unknown Wine'}
                  </p>
                  <p className="text-sm text-stone-600 line-clamp-1 dark:text-stone-400">{wine?.winery}</p>
                  {(wine?.region || wine?.country) && (
                    <p className="mt-0.5 text-xs text-stone-600/80 line-clamp-1 flex items-center gap-0.5 dark:text-stone-400/80">
                      <MapPin className="h-3 w-3 flex-shrink-0" strokeWidth={1.5} />
                      {[wine?.region, wine?.country].filter(Boolean).join(', ')}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-600 dark:text-stone-400">
                    {wine?.vivino_rating != null && (
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-copper-400 text-copper-400" />
                        {Number(wine.vivino_rating).toFixed(1)}
                      </span>
                    )}
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
                <h3 className="heading-serif text-lg text-bordeaux-600 dark:text-ivory-200">
                  {tCellar('addWine')}: {w?.name ?? 'Unknown'}
                </h3>
                <p className="text-sm text-stone-600 dark:text-stone-400">{w?.winery}</p>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-400">
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
                    <label className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-400">
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
                    <p className="mt-1 text-xs text-stone-600/70 dark:text-stone-400/70">{tCellar('priceOptional')}</p>
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

      <BottomNav />
    </div>
  );
}
