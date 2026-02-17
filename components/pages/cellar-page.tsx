'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Wine, MapPin, Calendar, Star, Trash2, Camera, Loader2, ChevronRight, Pencil, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppShell } from '@/components/app-shell';
import { PageShell } from '@/components/ui/page-shell';
import dynamic from 'next/dynamic';

const WineCard = dynamic(() => import('@/components/wine-card').then((m) => m.WineCard), {
  loading: () => <div className="flex items-center justify-center py-12"><div className="h-10 w-10 animate-spin rounded-full border-2 border-bordeaux-200 border-t-bordeaux-500" /></div>,
});
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { WineData } from '@/lib/openai';

interface CellarWineData {
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

export interface CellarItem {
  id: string;
  quantity: number;
  purchase_price?: number;
  purchase_date?: string;
  storage_location?: string;
  notes?: string;
  bottle_photo_url?: string | null;
  drink_from?: string | null;
  drink_until?: string | null;
  wines: CellarWineData | CellarWineData[] | null;
}

interface CellarPageProps {
  userId: string;
  initialItems: CellarItem[];
  initialFilter?: string;
}

const wineTypeColors: Record<string, string> = {
  red: 'bg-bordeaux-600',
  white: 'bg-gold-100',
  rose: 'bg-bordeaux-200',
  sparkling: 'bg-gold-50',
  dessert: 'bg-copper-400',
};

function getWine(item: CellarItem): CellarWineData | null {
  return Array.isArray(item.wines) ? item.wines[0] ?? null : item.wines;
}

function toWineData(wine: CellarWineData): WineData {
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

export function CellarPage({ userId, initialItems, initialFilter }: CellarPageProps) {
  const t = useTranslations('cellar');
  const tSearch = useTranslations('search');
  const [items, setItems] = useState<CellarItem[]>(initialItems);
  const [activeFilter, setActiveFilter] = useState<string | undefined>(initialFilter);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  const [selectedItem, setSelectedItem] = useState<CellarItem | null>(null);
  const [detailWine, setDetailWine] = useState<WineData | null>(null);
  const [detailMatch, setDetailMatch] = useState<import('@/lib/openai').ProfileMatchResult | null>(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editPrice, setEditPrice] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

  const refreshCellar = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const res = await fetch(
        `/api/cellar?userId=${encodeURIComponent(userId)}&_t=${Date.now()}`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.items)) {
          setItems(data.items);
        }
      }
    } catch {
    } finally {
      fetchingRef.current = false;
    }
  }, [userId]);

  useEffect(() => {
    refreshCellar();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshCellar();
    };
    const handleFocus = () => refreshCellar();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshCellar]);

  useEffect(() => {
    if (!selectedItem) {
      setDetailWine(null);
      setDetailMatch(null);
      return;
    }
    const wine = getWine(selectedItem);
    if (!wine) return;
    const wineData = toWineData(wine);
    setDetailWine(wineData);
    setDetailMatch(null);

    let cancelled = false;
    fetch('/api/wine-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wine: wineData, userId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setDetailMatch(data.match ?? null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selectedItem, userId]);

  const currentYear = new Date().getFullYear();

  const filteredItems = activeFilter === 'ready'
    ? items.filter((item) => {
        const drinkFrom = item.drink_from ? new Date(item.drink_from).getFullYear() : 0;
        const drinkUntil = item.drink_until ? new Date(item.drink_until).getFullYear() : 9999;
        return currentYear >= drinkFrom && currentYear <= drinkUntil;
      })
    : items;

  const totalBottles = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalValue = items.reduce(
    (sum, item) => sum + (item.purchase_price || 0) * (item.quantity || 0),
    0
  );

  const handleDelete = async (itemId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsDeleting(itemId);
    try {
      await fetch(`/api/cellar?id=${itemId}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      if (selectedItem?.id === itemId) setSelectedItem(null);
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleBottlePhoto = (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setIsUpdatingPhoto(itemId);
      try {
        const res = await fetch('/api/cellar', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: itemId, bottlePhotoUrl: dataUrl }),
        });
        if (res.ok) {
          setItems((prev) =>
            prev.map((item) =>
              item.id === itemId ? { ...item, bottle_photo_url: dataUrl } : item
            )
          );
          setBrokenImages((prev) => {
            const next = new Set(prev);
            next.delete(itemId);
            return next;
          });
        }
      } catch (err) {
        console.error('Failed to save bottle photo:', err);
      } finally {
        setIsUpdatingPhoto(null);
        e.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageError = (itemId: string) => {
    setBrokenImages((prev) => new Set(prev).add(itemId));
  };

  const startEditing = () => {
    if (!selectedItem) return;
    setEditPrice(selectedItem.purchase_price != null ? String(selectedItem.purchase_price) : '');
    setEditQuantity(String(selectedItem.quantity || 1));
    setEditNotes(selectedItem.notes || '');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const handleSaveDetails = async () => {
    if (!selectedItem) return;
    setIsSaving(true);
    try {
      const priceStr = editPrice.trim().replace(/,/g, '.');
      const purchasePrice = priceStr === '' ? null : parseFloat(priceStr);
      const quantity = Math.max(1, Math.floor(Number(editQuantity)) || 1);

      const res = await fetch('/api/cellar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedItem.id,
          purchasePrice: purchasePrice != null && !Number.isNaN(purchasePrice) ? purchasePrice : null,
          quantity,
          notes: editNotes.trim() || null,
        }),
      });

      if (res.ok) {
        const updated = {
          ...selectedItem,
          purchase_price: purchasePrice != null && !Number.isNaN(purchasePrice) ? purchasePrice : undefined,
          quantity,
          notes: editNotes.trim() || undefined,
        };
        setSelectedItem(updated);
        setItems((prev) =>
          prev.map((item) => (item.id === selectedItem.id ? updated : item))
        );
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Failed to update cellar item:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell>
      <PageShell>
        <PageHeader title={t('title')} />
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="heading-serif text-2xl text-foreground">{totalBottles}</p>
              <p className="text-sm text-muted-foreground">{t('totalBottles')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="heading-serif text-2xl text-foreground">
                {formatCurrency(totalValue)}
              </p>
              <p className="text-sm text-muted-foreground">{t('totalValue')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        {items.length > 0 && (
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() => setActiveFilter(undefined)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-all duration-200',
                !activeFilter
                  ? 'bg-bordeaux-600 text-white shadow-soft'
                  : 'bg-ivory-300 text-bordeaux-500 hover:bg-ivory-400 dark:bg-charcoal-800 dark:text-bordeaux-300'
              )}
            >
              {t('filterAll')}
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter(activeFilter === 'ready' ? undefined : 'ready')}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-all duration-200',
                activeFilter === 'ready'
                  ? 'bg-success text-success-foreground shadow-soft'
                  : 'bg-success-muted text-success hover:bg-success-muted/80 dark:bg-green-950 dark:text-green-400'
              )}
            >
              {t('filterReady')}
            </button>
          </div>
        )}

        {/* Empty State */}
        {filteredItems.length === 0 && items.length === 0 && (
          <EmptyState
            icon={Wine}
            title={t('empty')}
            description={t('emptyDescription')}
            actionLabel={t('addWine')}
            actionHref="/search"
          />
        )}

        {filteredItems.length === 0 && items.length > 0 && (
          <Card className="mt-4">
            <CardContent className="py-8 text-center">
              <p className="text-sm text-stone-600 dark:text-stone-400">{t('filterEmpty')}</p>
            </CardContent>
          </Card>
        )}

        {/* Cellar Items */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredItems.map((item) => {
            const wine = getWine(item);
            const imageUrl = item.bottle_photo_url || wine?.image_url;
            const isImageBroken = brokenImages.has(item.id);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedItem(item)}
                className={cn(
                  'w-full rounded-2xl bg-card p-3.5 text-left shadow-soft',
                  'card-hover',
                  'flex items-center gap-3',
                )}
              >
                <div className="relative flex-shrink-0">
                  {imageUrl && !isImageBroken ? (
                    <div className="h-16 w-12 overflow-hidden rounded-xl bg-ivory-300 dark:bg-charcoal-700">
                      <img
                        src={imageUrl}
                        alt={wine?.name || ''}
                        className="h-full w-full object-contain"
                        loading="lazy"
                        onError={() => handleImageError(item.id)}
                      />
                    </div>
                  ) : (
                    <div
                      className={cn(
                        'flex h-16 w-12 items-center justify-center rounded-xl',
                        wineTypeColors[wine?.wine_type || ''] || 'bg-ivory-400'
                      )}
                    >
                      <Wine className={cn(
                        'h-6 w-6',
                        wine?.wine_type === 'white' || wine?.wine_type === 'sparkling'
                          ? 'text-stone-600' : 'text-white/80'
                      )} strokeWidth={1.5} />
                    </div>
                  )}
                  <input
                    id={`cellar-photo-${item.id}`}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    aria-label={tSearch('takePhoto')}
                    onChange={(e) => handleBottlePhoto(item.id, e)}
                  />
                  <button
                    type="button"
                    className="absolute -bottom-1.5 -end-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-soft border border-ivory-300 dark:bg-charcoal-800 dark:border-charcoal-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      document.getElementById(`cellar-photo-${item.id}`)?.click();
                    }}
                    disabled={isUpdatingPhoto === item.id}
                    title={tSearch('takePhoto')}
                  >
                    <Camera className="h-3 w-3 text-stone-600 dark:text-stone-400" strokeWidth={1.5} />
                  </button>
                </div>

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
                  {wine?.grapes && wine.grapes.length > 0 && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {wine.grapes.join(', ')}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {wine?.vivino_rating != null && (
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-copper-400 text-copper-400" />
                        {Number(wine.vivino_rating).toFixed(1)}
                      </span>
                    )}
                    {wine?.alcohol != null && (
                      <span>{wine.alcohol}%</span>
                    )}
                    {item.purchase_price != null && item.purchase_price > 0 && (
                      <span>{formatCurrency(item.purchase_price)}</span>
                    )}
                    {item.purchase_date && (
                      <span className="flex items-center gap-0.5">
                        <Calendar className="h-3 w-3" strokeWidth={1.5} />
                        {formatDate(item.purchase_date)}
                      </span>
                    )}
                    {item.storage_location && (
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" strokeWidth={1.5} />
                        {item.storage_location}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1 rounded-full bg-bordeaux-50 px-2.5 py-1 dark:bg-bordeaux-900/30">
                    <Wine className="h-3.5 w-3.5 text-bordeaux-500 dark:text-bordeaux-300" strokeWidth={1.5} />
                    <span className="text-sm font-semibold text-primary">
                      {item.quantity}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-bordeaux-300 dark:text-bordeaux-400" strokeWidth={1.5} />
                </div>
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
            setIsEditing(false);
          }
        }}
      >
        <DialogContent
          onClose={() => {
            setSelectedItem(null);
            setDetailWine(null);
            setIsEditing(false);
          }}
          className="max-w-lg"
        >
          {selectedItem && (
            <>
              {isFetchingDetails && !detailWine ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="mt-4 text-sm text-muted-foreground">{tSearch('analyzing')}</p>
                </div>
              ) : detailWine ? (
                <div className="space-y-4">
                  <WineCard
                    wine={detailWine}
                    matchResult={detailMatch || undefined}
                    uploadedImageUrl={selectedItem.bottle_photo_url || undefined}
                  />

                  <Card className="border border-border">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">
                          {t('cellarDetails')}
                        </CardTitle>
                        {!isEditing ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={startEditing}
                            className="h-7 gap-1 text-xs text-bordeaux-400 hover:text-bordeaux-600"
                          >
                            <Pencil className="h-3 w-3" strokeWidth={1.5} />
                            {t('edit')}
                          </Button>
                        ) : (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelEditing}
                              disabled={isSaving}
                              className="h-7 text-xs text-stone-600"
                            >
                              {t('cancelEdit')}
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleSaveDetails}
                              disabled={isSaving}
                              className="h-7 gap-1 text-xs"
                            >
                              {isSaving ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3" strokeWidth={1.5} />
                              )}
                              {t('save')}
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {isEditing ? (
                        <>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                              {t('quantityLabel')}
                            </label>
                            <Input
                              type="number"
                              min={1}
                              value={editQuantity}
                              onChange={(e) => setEditQuantity(e.target.value)}
                              className="h-9"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                              {t('purchasePriceNis')}
                            </label>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="0"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              className="h-9"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                              {t('notes')}
                            </label>
                            <Input
                              type="text"
                              placeholder={t('notesPlaceholder')}
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              className="h-9"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">{t('quantityLabel')}</span>
                            <span className="font-semibold text-foreground">{selectedItem.quantity}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">{t('priceLabel')}</span>
                            <span className="font-medium">
                              {selectedItem.purchase_price != null && selectedItem.purchase_price > 0
                                ? formatCurrency(selectedItem.purchase_price)
                                : <button
                                    type="button"
                                    onClick={startEditing}
                                    className="text-bordeaux-400 hover:text-bordeaux-600 underline underline-offset-2 transition-colors"
                                  >
                                    {t('addPrice')}
                                  </button>
                              }
                            </span>
                          </div>
                          {selectedItem.purchase_date && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">{t('dateLabel')}</span>
                              <span className="font-medium">{formatDate(selectedItem.purchase_date)}</span>
                            </div>
                          )}
                          {selectedItem.storage_location && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">{t('locationLabel')}</span>
                              <span className="font-medium">{selectedItem.storage_location}</span>
                            </div>
                          )}
                          {selectedItem.notes && (
                            <p className="italic text-muted-foreground pt-1">{selectedItem.notes}</p>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>

                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => handleDelete(selectedItem.id)}
                    disabled={isDeleting === selectedItem.id}
                  >
                    {isDeleting === selectedItem.id ? (
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="me-2 h-4 w-4" strokeWidth={1.5} />
                    )}
                    {t('removeFromCellar')}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </DialogContent>
      </Dialog>
      </PageShell>
    </AppShell>
  );
}
