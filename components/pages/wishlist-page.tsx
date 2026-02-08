'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Heart, Star, Trash2, ShoppingCart, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BottomNav } from '@/components/bottom-nav';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface WineData {
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
  wines: WineData | WineData[] | null;
}

interface WishlistPageProps {
  userId: string;
  initialItems: WishlistItem[];
}

export function WishlistPage({ userId, initialItems }: WishlistPageProps) {
  const t = useTranslations('wishlist');
  const tCellar = useTranslations('cellar');
  const tCommon = useTranslations('common');
  const tWineCard = useTranslations('wineCard');
  const [items, setItems] = useState<WishlistItem[]>(initialItems);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [purchaseModalItem, setPurchaseModalItem] = useState<WishlistItem | null>(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [purchasePriceNis, setPurchasePriceNis] = useState('');
  const [isSubmittingPurchase, setIsSubmittingPurchase] = useState(false);

  const wineTypeColors: Record<string, string> = {
    red: 'bg-red-900',
    white: 'bg-amber-100',
    rose: 'bg-pink-300',
    sparkling: 'bg-amber-50',
    dessert: 'bg-amber-600',
  };

  const handleDelete = async (itemId: string) => {
    setIsDeleting(itemId);
    try {
      await fetch(`/api/wishlist?id=${itemId}`, {
        method: 'DELETE',
      });
      setItems((prev) => prev.filter((item) => item.id !== itemId));
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setIsDeleting(null);
    }
  };

  const openMarkPurchasedModal = (item: WishlistItem) => {
    setPurchaseModalItem(item);
    setPurchaseQuantity(1);
    setPurchasePriceNis('');
  };

  const handleConfirmMarkPurchased = async () => {
    if (!purchaseModalItem) return;
    const wine = Array.isArray(purchaseModalItem.wines) ? purchaseModalItem.wines[0] : purchaseModalItem.wines;
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
      await fetch(`/api/wishlist?id=${purchaseModalItem.id}`, {
        method: 'DELETE',
      });
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
                <a href="/search">Search Wines</a>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Wishlist Items */}
        <div className="-mt-4 space-y-4">
          {items.map((item) => {
            const wine = Array.isArray(item.wines) ? item.wines[0] : item.wines;
            return (
            <Card key={item.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'h-12 w-12 flex-shrink-0 rounded-lg',
                      wineTypeColors[wine?.wine_type || ''] || 'bg-gray-200'
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base line-clamp-1">
                      {wine?.name || 'Unknown Wine'}
                    </CardTitle>
                    <p className="text-sm text-gray-500">{wine?.winery}</p>
                    {wine?.vivino_rating && (
                      <div className="mt-1 flex items-center gap-1">
                        <Star className="h-3 w-3 fill-gold-500 text-gold-500" />
                        <span className="text-xs text-gray-500">
                          {wine.vivino_rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                  {item.priority && (
                    <div className="flex items-center gap-1 rounded-full bg-pink-100 px-2 py-1 text-xs text-pink-700">
                      <Heart className="h-3 w-3" />
                      {item.priority}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {wine?.country && (
                  <p className="text-gray-600">
                    {wine.country}
                    {wine.region && ` · ${wine.region}`}
                  </p>
                )}
                {item.notes && (
                  <p className="italic text-gray-400">{item.notes}</p>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openMarkPurchasedModal(item)}
                    className="text-green-600 hover:bg-green-50 hover:text-green-700"
                  >
                    <ShoppingCart className="me-1 h-4 w-4" />
                    {t('markPurchased')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                    disabled={isDeleting === item.id}
                    className="text-red-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
          })}
        </div>
      </div>

      {/* Modal: Mark as purchased — quantity + optional price (NIS) */}
      <Dialog
        open={!!purchaseModalItem}
        onOpenChange={(open) => {
          if (!open) setPurchaseModalItem(null);
        }}
      >
        <DialogContent
          onClose={() => setPurchaseModalItem(null)}
          className="max-w-sm"
        >
          {purchaseModalItem && (() => {
            const w = Array.isArray(purchaseModalItem.wines) ? purchaseModalItem.wines[0] : purchaseModalItem.wines;
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
