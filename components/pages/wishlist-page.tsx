'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Heart, Star, Trash2, ShoppingCart, Loader2, Wine, MapPin, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BottomNav } from '@/components/bottom-nav';
import { WineCard } from '@/components/wine-card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { WineData } from '@/lib/openai';

interface WineRowData {
  id: string;
  name: string;
  winery: string;
  wine_type: string;
  country?: string;
  region?: string;
  grapes?: string[];
  vivino_rating?: number;
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

/** Convert the DB row to the WineData shape that WineCard expects */
function toWineData(wine: WineRowData): WineData {
  return {
    name: wine.name,
    winery: wine.winery,
    wine_type: (wine.wine_type || 'red') as WineData['wine_type'],
    country: wine.country || '',
    region: wine.region,
    grapes: wine.grapes || [],
    vivino_rating: wine.vivino_rating,
  };
}

const wineTypeColors: Record<string, string> = {
  red: 'bg-red-900',
  white: 'bg-amber-100',
  rose: 'bg-pink-300',
  sparkling: 'bg-amber-50',
  dessert: 'bg-amber-600',
};

export function WishlistPage({ userId, initialItems }: WishlistPageProps) {
  const t = useTranslations('wishlist');
  const tCellar = useTranslations('cellar');
  const tCommon = useTranslations('common');
  const tSearch = useTranslations('search');
  const tWineCard = useTranslations('wineCard');
  const [items, setItems] = useState<WishlistItem[]>(initialItems);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Detail modal state
  const [selectedItem, setSelectedItem] = useState<WishlistItem | null>(null);
  const [detailWine, setDetailWine] = useState<WineData | null>(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  // Purchase modal state
  const [purchaseModalItem, setPurchaseModalItem] = useState<WishlistItem | null>(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [purchasePriceNis, setPurchasePriceNis] = useState('');
  const [isSubmittingPurchase, setIsSubmittingPurchase] = useState(false);

  // When an item is selected, fetch full wine details via the search API (same as cellar)
  useEffect(() => {
    if (!selectedItem) {
      setDetailWine(null);
      return;
    }
    const wine = getWine(selectedItem);
    if (!wine) return;

    let cancelled = false;
    setIsFetchingDetails(true);
    setDetailWine(null);

    const query = `${wine.name} ${wine.winery}`;
    fetch('/api/wine-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, userId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.wine) {
          setDetailWine(data.wine);
        } else {
          setDetailWine(toWineData(wine));
        }
      })
      .catch(() => {
        if (!cancelled) setDetailWine(toWineData(wine));
      })
      .finally(() => {
        if (!cancelled) setIsFetchingDetails(false);
      });

    return () => { cancelled = true; };
  }, [selectedItem, userId]);

  const handleDelete = async (itemId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsDeleting(itemId);
    try {
      await fetch(`/api/wishlist?id=${itemId}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      if (selectedItem?.id === itemId) {
        setSelectedItem(null);
      }
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
    <div className="min-h-screen bg-cream-50 pb-20">
      {/* Header */}
      <header className="bg-gradient-to-r from-wine-900 to-wine-800 px-4 pb-8 pt-8">
        <div className="mx-auto max-w-lg">
          <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4">
        {/* Empty State */}
        {items.length === 0 && (
          <Card className="mt-8">
            <CardContent className="py-12 text-center">
              <Heart className="mx-auto h-16 w-16 text-gray-300" />
              <h3 className="mt-4 text-lg font-semibold text-gray-600">
                {t('empty')}
              </h3>
              <p className="mt-1 text-sm text-gray-400">
                {t('emptyDescription')}
              </p>
              <Button className="mt-4" asChild>
                <a href="/search">{tSearch('title')}</a>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Wishlist Items — clickable rows (same pattern as cellar) */}
        <div className="-mt-4 space-y-3">
          {items.map((item) => {
            const wine = getWine(item);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedItem(item)}
                className={cn(
                  'w-full rounded-xl border border-wine-100 bg-white p-3 text-left shadow-sm',
                  'hover:border-wine-300 hover:bg-wine-50/50 transition-colors',
                  'flex items-center gap-3'
                )}
              >
                {/* Wine color swatch */}
                <div
                  className={cn(
                    'flex h-14 w-10 flex-shrink-0 items-center justify-center rounded-lg',
                    wineTypeColors[wine?.wine_type || ''] || 'bg-gray-200'
                  )}
                >
                  <Wine className={cn(
                    'h-5 w-5',
                    wine?.wine_type === 'white' || wine?.wine_type === 'sparkling'
                      ? 'text-gray-600' : 'text-white/70'
                  )} />
                </div>

                {/* Wine info */}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-wine-900 line-clamp-1">
                    {wine?.name || 'Unknown Wine'}
                  </p>
                  <p className="text-sm text-gray-500 line-clamp-1">{wine?.winery}</p>
                  {(wine?.region || wine?.country) && (
                    <p className="mt-0.5 text-xs text-gray-400 line-clamp-1 flex items-center gap-0.5">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      {[wine?.region, wine?.country].filter(Boolean).join(', ')}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                    {wine?.vivino_rating != null && (
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-gold-500 text-gold-500" />
                        {Number(wine.vivino_rating).toFixed(1)}
                      </span>
                    )}
                    {wine?.grapes && wine.grapes.length > 0 && (
                      <span className="line-clamp-1">{wine.grapes.join(', ')}</span>
                    )}
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 flex-shrink-0 text-wine-400" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail Modal — full WineCard with actions */}
      <Dialog
        open={!!selectedItem}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedItem(null);
            setDetailWine(null);
            setIsFetchingDetails(false);
          }
        }}
      >
        <DialogContent
          onClose={() => {
            setSelectedItem(null);
            setDetailWine(null);
            setIsFetchingDetails(false);
          }}
          className="max-w-lg"
        >
          {selectedItem && (
            <>
              {isFetchingDetails && !detailWine ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-10 w-10 animate-spin text-wine-600" />
                  <p className="mt-4 text-sm text-gray-500">{tSearch('analyzing')}</p>
                </div>
              ) : detailWine ? (
                <div className="space-y-4">
                  <WineCard wine={detailWine} />

                  {/* Wishlist actions below the wine card */}
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => openMarkPurchasedModal(selectedItem)}
                    >
                      <ShoppingCart className="me-2 h-4 w-4" />
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
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Mark as purchased — quantity + optional price */}
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
                <h3 className="text-lg font-semibold text-wine-900">
                  {tCellar('addWine')}: {w?.name ?? 'Unknown'}
                </h3>
                <p className="text-sm text-gray-500">{w?.winery}</p>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
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
                    <label className="mb-1 block text-sm font-medium text-gray-700">
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
                    <p className="mt-1 text-xs text-gray-500">{tCellar('priceOptional')}</p>
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
