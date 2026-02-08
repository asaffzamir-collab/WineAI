'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Wine, MapPin, Calendar, Star, Trash2, Camera } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BottomNav } from '@/components/bottom-nav';
import { formatCurrency, formatDate } from '@/lib/utils';
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
  wines: WineData | WineData[] | null;
}

interface CellarPageProps {
  userId: string;
  initialItems: CellarItem[];
}

export function CellarPage({ userId, initialItems }: CellarPageProps) {
  const t = useTranslations('cellar');
  const tSearch = useTranslations('search');
  const [items, setItems] = useState<CellarItem[]>(initialItems);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState<string | null>(null);

  const totalBottles = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalValue = items.reduce(
    (sum, item) => sum + (item.purchase_price || 0) * (item.quantity || 0),
    0
  );

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
      await fetch(`/api/cellar?id=${itemId}`, {
        method: 'DELETE',
      });
      setItems((prev) => prev.filter((item) => item.id !== itemId));
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
        <div className="mt-6 space-y-4">
          {items.map((item) => {
            const wine = Array.isArray(item.wines) ? item.wines[0] : item.wines;
            return (
            <Card key={item.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="relative flex-shrink-0">
                    {(item.bottle_photo_url || (wine as WineData)?.image_url) ? (
                      <div className="h-14 w-12 overflow-hidden rounded-lg bg-gray-100">
                        <img
                          src={item.bottle_photo_url || (wine as WineData)?.image_url}
                          alt={wine?.name || ''}
                          className="h-full w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div
                        className={cn(
                          'h-14 w-12 rounded-lg',
                          wineTypeColors[wine?.wine_type || ''] || 'bg-gray-200'
                        )}
                      />
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
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full shadow"
                      onClick={() => document.getElementById(`cellar-photo-${item.id}`)?.click()}
                      disabled={isUpdatingPhoto === item.id}
                      title={tSearch('takePhoto')}
                    >
                      <Camera className="h-3 w-3" />
                    </Button>
                  </div>
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
                  <div className="flex items-center gap-2 rounded-full bg-wine-100 px-3 py-1">
                    <Wine className="h-4 w-4 text-wine-900" />
                    <span className="font-semibold text-wine-900">
                      {item.quantity}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {wine?.country && (
                  <p className="text-gray-600">
                    {wine.country}
                    {wine.region && ` · ${wine.region}`}
                  </p>
                )}
                <div className="flex flex-wrap gap-4 text-gray-500">
                  {item.purchase_price && (
                    <span>{formatCurrency(item.purchase_price)}</span>
                  )}
                  {item.purchase_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(item.purchase_date)}
                    </span>
                  )}
                  {item.storage_location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {item.storage_location}
                    </span>
                  )}
                </div>
                {item.notes && (
                  <p className="italic text-gray-400">{item.notes}</p>
                )}
                <div className="flex justify-end pt-2">
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

      <BottomNav />
    </div>
  );
}
