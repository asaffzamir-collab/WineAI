'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Wine, MapPin, Calendar, Star, Trash2, Camera, Loader2, ChevronRight, Pencil, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BottomNav } from '@/components/bottom-nav';
import { WineCard } from '@/components/wine-card';
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
}

export interface CellarItem {
  id: string;
  quantity: number;
  purchase_price?: number;
  purchase_date?: string;
  storage_location?: string;
  notes?: string;
  bottle_photo_url?: string | null;
  wines: CellarWineData | CellarWineData[] | null;
}

interface CellarPageProps {
  userId: string;
  initialItems: CellarItem[];
}

const wineTypeColors: Record<string, string> = {
  red: 'bg-red-900',
  white: 'bg-amber-100',
  rose: 'bg-pink-300',
  sparkling: 'bg-amber-50',
  dessert: 'bg-amber-600',
};

function getWine(item: CellarItem): CellarWineData | null {
  return Array.isArray(item.wines) ? item.wines[0] ?? null : item.wines;
}

/** Convert cellar wine DB row to the WineData shape that WineCard expects */
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
  };
}

export function CellarPage({ userId, initialItems }: CellarPageProps) {
  const t = useTranslations('cellar');
  const tSearch = useTranslations('search');
  const [items, setItems] = useState<CellarItem[]>(initialItems);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  // Detail modal state
  const [selectedItem, setSelectedItem] = useState<CellarItem | null>(null);
  const [detailWine, setDetailWine] = useState<WineData | null>(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  // Inline editing state for cellar details
  const [isEditing, setIsEditing] = useState(false);
  const [editPrice, setEditPrice] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Track broken images per item id
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

  // Fetch fresh cellar items from the server — always bypass cache
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
      // Keep current items on error
    } finally {
      fetchingRef.current = false;
    }
  }, [userId]);

  // Auto-refresh on mount and on visibility/focus changes
  useEffect(() => {
    refreshCellar();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshCellar();
      }
    };
    const handleFocus = () => {
      refreshCellar();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshCellar]);

  // When an item is selected, fetch full wine details via search API
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
          // Fallback to basic wine data from DB
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
      if (selectedItem?.id === itemId) {
        setSelectedItem(null);
      }
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
          // Clear broken image flag for this item
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
        // Update local state
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
    <div className="min-h-screen bg-cream-50 pb-20">
      {/* Header */}
      <header className="bg-gradient-to-r from-wine-900 to-wine-800 px-4 pb-8 pt-8">
        <div className="mx-auto max-w-lg">
          <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4">
        {/* Stats */}
        <div className="-mt-4 grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-wine-900">{totalBottles}</p>
              <p className="text-sm text-gray-500">{t('totalBottles')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-wine-900">
                {formatCurrency(totalValue)}
              </p>
              <p className="text-sm text-gray-500">{t('totalValue')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Empty State */}
        {items.length === 0 && (
          <Card className="mt-8">
            <CardContent className="py-12 text-center">
              <Wine className="mx-auto h-16 w-16 text-gray-300" />
              <h3 className="mt-4 text-lg font-semibold text-gray-600">
                {t('empty')}
              </h3>
              <p className="mt-1 text-sm text-gray-400">
                {t('emptyDescription')}
              </p>
              <Button className="mt-4" asChild>
                <a href="/search">{t('addWine')}</a>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Cellar Items */}
        <div className="mt-6 space-y-3">
          {items.map((item) => {
            const wine = getWine(item);
            const imageUrl = item.bottle_photo_url || wine?.image_url;
            const isImageBroken = brokenImages.has(item.id);

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
                {/* Wine image / color fallback */}
                <div className="relative flex-shrink-0">
                  {imageUrl && !isImageBroken ? (
                    <div className="h-16 w-12 overflow-hidden rounded-lg bg-gray-100">
                      <img
                        src={imageUrl}
                        alt={wine?.name || ''}
                        className="h-full w-full object-contain"
                        onError={() => handleImageError(item.id)}
                      />
                    </div>
                  ) : (
                    <div
                      className={cn(
                        'flex h-16 w-12 items-center justify-center rounded-lg',
                        wineTypeColors[wine?.wine_type || ''] || 'bg-gray-200'
                      )}
                    >
                      <Wine className={cn(
                        'h-6 w-6',
                        wine?.wine_type === 'white' || wine?.wine_type === 'sparkling'
                          ? 'text-gray-600' : 'text-white/70'
                      )} />
                    </div>
                  )}
                  {/* Camera button overlay */}
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
                    className="absolute -bottom-1 -end-1 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow border border-gray-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      document.getElementById(`cellar-photo-${item.id}`)?.click();
                    }}
                    disabled={isUpdatingPhoto === item.id}
                    title={tSearch('takePhoto')}
                  >
                    <Camera className="h-2.5 w-2.5 text-gray-500" />
                  </button>
                </div>

                {/* Wine info */}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-wine-900 line-clamp-1">
                    {wine?.name || 'Unknown Wine'}
                  </p>
                  <p className="text-sm text-gray-500 line-clamp-1">{wine?.winery}</p>
                  {/* Region & country */}
                  {(wine?.region || wine?.country) && (
                    <p className="mt-0.5 text-xs text-gray-400 line-clamp-1 flex items-center gap-0.5">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      {[wine?.region, wine?.country].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {/* Grapes */}
                  {wine?.grapes && wine.grapes.length > 0 && (
                    <p className="text-xs text-gray-400 line-clamp-1">
                      {wine.grapes.join(', ')}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                    {wine?.vivino_rating != null && (
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-gold-500 text-gold-500" />
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
                        <Calendar className="h-3 w-3" />
                        {formatDate(item.purchase_date)}
                      </span>
                    )}
                    {item.storage_location && (
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" />
                        {item.storage_location}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quantity badge + arrow */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1 rounded-full bg-wine-100 px-2.5 py-1">
                    <Wine className="h-3.5 w-3.5 text-wine-900" />
                    <span className="text-sm font-semibold text-wine-900">
                      {item.quantity}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-wine-400" />
                </div>
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
                  <Loader2 className="h-10 w-10 animate-spin text-wine-600" />
                  <p className="mt-4 text-sm text-gray-500">{tSearch('analyzing')}</p>
                </div>
              ) : detailWine ? (
                <div className="space-y-4">
                  <WineCard
                    wine={detailWine}
                    uploadedImageUrl={selectedItem.bottle_photo_url || undefined}
                  />

                  {/* Cellar-specific details below the wine card */}
                  <Card className="border-wine-100">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold text-wine-900">
                          {t('cellarDetails')}
                        </CardTitle>
                        {!isEditing ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={startEditing}
                            className="h-7 gap-1 text-xs text-wine-700 hover:text-wine-900"
                          >
                            <Pencil className="h-3 w-3" />
                            {t('edit')}
                          </Button>
                        ) : (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelEditing}
                              disabled={isSaving}
                              className="h-7 text-xs text-gray-500"
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
                                <Check className="h-3 w-3" />
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
                          {/* Editable quantity */}
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-500">
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
                          {/* Editable price */}
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-500">
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
                          {/* Editable notes */}
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-500">
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
                            <span className="text-gray-500">{t('quantityLabel')}</span>
                            <span className="font-semibold text-wine-900">{selectedItem.quantity}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">{t('priceLabel')}</span>
                            <span className="font-medium">
                              {selectedItem.purchase_price != null && selectedItem.purchase_price > 0
                                ? formatCurrency(selectedItem.purchase_price)
                                : <button
                                    type="button"
                                    onClick={startEditing}
                                    className="text-wine-600 hover:text-wine-800 underline underline-offset-2"
                                  >
                                    {t('addPrice')}
                                  </button>
                              }
                            </span>
                          </div>
                          {selectedItem.purchase_date && (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">{t('dateLabel')}</span>
                              <span className="font-medium">{formatDate(selectedItem.purchase_date)}</span>
                            </div>
                          )}
                          {selectedItem.storage_location && (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">{t('locationLabel')}</span>
                              <span className="font-medium">{selectedItem.storage_location}</span>
                            </div>
                          )}
                          {selectedItem.notes && (
                            <p className="italic text-gray-400 pt-1">{selectedItem.notes}</p>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Delete button */}
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => handleDelete(selectedItem.id)}
                    disabled={isDeleting === selectedItem.id}
                  >
                    {isDeleting === selectedItem.id ? (
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="me-2 h-4 w-4" />
                    )}
                    {t('removeFromCellar')}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
