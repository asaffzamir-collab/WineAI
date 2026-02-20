'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { LocationPickerModal } from '@/components/cellar/location-picker/location-picker-modal';
import type { WineData } from '@/lib/openai';
import type { Rack, Placement, SlotId, WineCategory } from '@/lib/cellar/types';
import { computeAllSlots } from '@/lib/cellar/types';
import { trackCellar } from '@/lib/cellar/analytics';

interface AddToCellarDialogProps {
  wine: WineData | null;
  userId: string;
  bottlePhotoUrl?: string;
  onClose: () => void;
  onAdded: () => void;
}

function normalizeWineType(t: string | undefined): WineCategory {
  const map: Record<string, WineCategory> = { red: 'red', white: 'white', rose: 'rose', sparkling: 'sparkling' };
  return map[t || ''] || 'other';
}

interface CellarApiItem {
  id: string;
  slot_id?: string | null;
  quantity: number;
  wines?: { wine_type?: string; name?: string; winery?: string } | Array<{ wine_type?: string; name?: string; winery?: string }>;
}

function getWineFromApiItem(item: CellarApiItem) {
  const w = item.wines;
  if (!w) return null;
  return Array.isArray(w) ? w[0] ?? null : w;
}

/**
 * Build a placement map from cellar items and racks fetched from the API.
 * This mirrors the logic in CellarRackProvider but is self-contained.
 */
function buildPlacementMapFromItems(
  items: CellarApiItem[],
  racks: Rack[],
): Map<SlotId, Placement> {
  const validSlots = new Set<SlotId>();
  for (const rack of racks) {
    for (const slotId of computeAllSlots(rack)) {
      validSlots.add(slotId);
    }
  }

  const map = new Map<SlotId, Placement>();
  for (const item of items) {
    const slot = item.slot_id as SlotId | undefined;
    if (!slot || !validSlots.has(slot)) continue;

    const wine = getWineFromApiItem(item);
    const wineType = normalizeWineType(wine?.wine_type);
    map.set(slot, {
      slotId: slot,
      cellarItemId: item.id,
      wineType,
      wineName: wine?.name || '',
      winery: wine?.winery || '',
      quantity: item.quantity || 1,
    } as Placement);
  }
  return map;
}

export function AddToCellarDialog({
  wine,
  userId,
  bottlePhotoUrl,
  onClose,
  onAdded,
}: AddToCellarDialogProps) {
  const tCellar = useTranslations('cellar');
  const tCommon = useTranslations('common');
  const tWineCard = useTranslations('wineCard');

  const [step, setStep] = useState<'details' | 'location'>('details');
  const [quantity, setQuantity] = useState(1);
  const [priceNis, setPriceNis] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<SlotId | null>(null);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [placementMap, setPlacementMap] = useState<Map<SlotId, Placement>>(new Map());
  const [isLoadingRacks, setIsLoadingRacks] = useState(false);

  const fetchRacksAndPlacements = useCallback(async () => {
    setIsLoadingRacks(true);
    try {
      const [racksRes, cellarRes] = await Promise.all([
        fetch(`/api/cellar/rack?userId=${encodeURIComponent(userId)}`),
        fetch(`/api/cellar?userId=${encodeURIComponent(userId)}`),
      ]);

      let fetchedRacks: Rack[] = [];
      if (racksRes.ok) {
        const rData = await racksRes.json();
        const rawRacks = rData.racks || [];
        fetchedRacks = rawRacks.map((r: { id: string; config: Rack }) => ({
          ...r.config,
          id: r.id,
        }));
      }

      let cellarItems: CellarApiItem[] = [];
      if (cellarRes.ok) {
        const cData = await cellarRes.json();
        cellarItems = cData.items || [];
      }

      setRacks(fetchedRacks);
      setPlacementMap(buildPlacementMapFromItems(cellarItems, fetchedRacks));
    } catch (err) {
      console.error('Failed to load rack data:', err);
      setRacks([]);
      setPlacementMap(new Map());
    } finally {
      setIsLoadingRacks(false);
    }
  }, [userId]);

  useEffect(() => {
    if (wine) {
      setStep('details');
      setQuantity(1);
      setPriceNis('');
      setError('');
      setSelectedSlotId(null);
      fetchRacksAndPlacements();
    }
  }, [wine, userId, fetchRacksAndPlacements]);

  const handleConfirm = async (slotId?: SlotId | null) => {
    if (!wine) return;
    setError('');
    setIsSubmitting(true);
    try {
      const qty = Math.max(1, Math.floor(Number(quantity)) || 1);
      const priceStr = priceNis.trim().replace(/,/g, '.');
      const purchasePrice = priceStr === '' ? undefined : parseFloat(priceStr);
      const body: Record<string, unknown> = { userId, wine, quantity: qty };

      if (purchasePrice != null && !Number.isNaN(purchasePrice) && purchasePrice >= 0) {
        body.purchasePrice = purchasePrice;
      }
      if (bottlePhotoUrl) {
        body.bottlePhotoUrl = bottlePhotoUrl;
      }

      const response = await fetch('/api/cellar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = typeof data?.error === 'string' ? data.error : 'Failed to add to cellar';
        setError(message);
        setShowPicker(false);
        return;
      }

      const finalSlot = slotId ?? selectedSlotId;
      const newItemId: string | undefined = data?.cellarItemId;
      if (finalSlot && newItemId) {
        // Persist slot assignment to database
        fetch('/api/cellar', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: newItemId, slotId: finalSlot }),
        }).catch(() => {});

        // Also update localStorage for immediate cellar page consistency
        try {
          const slotsRaw = localStorage.getItem(`cellar-slots:${userId}`);
          const slots: Record<string, string> = slotsRaw ? JSON.parse(slotsRaw) : {};
          slots[newItemId] = finalSlot;
          localStorage.setItem(`cellar-slots:${userId}`, JSON.stringify(slots));
        } catch { /* silent */ }

        trackCellar('bottle_added_to_slot');
      }

      setShowPicker(false);
      onClose();
      onAdded();
      window.dispatchEvent(new Event('cellar-updated'));
    } catch (err) {
      console.error('Failed to add to cellar:', err);
      setError('Network error. Please try again.');
      setShowPicker(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextToLocation = () => {
    if (racks.length > 0) {
      setShowPicker(true);
      trackCellar('location_picker_opened');
    } else {
      handleConfirm();
    }
  };

  const handleSlotSelected = (slotId: SlotId) => {
    setSelectedSlotId(slotId);
    handleConfirm(slotId).finally(() => setShowPicker(false));
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !showPicker) onClose();
  };

  return (
    <>
      <Dialog open={!!wine && !showPicker} onOpenChange={handleOpenChange}>
        <DialogContent onClose={onClose} className="max-w-sm z-[100]">
          {wine && (
            <>
              <h3 className="heading-serif text-lg text-bordeaux-600 dark:text-ivory-200 pe-8">
                {tCellar('addWine')}: {wine.name}
              </h3>
              <p className="text-sm text-stone-600 dark:text-stone-400 pe-8">{wine.winery}</p>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-400">
                    {tCellar('quantity')}
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
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
                    value={priceNis}
                    onChange={(e) => setPriceNis(e.target.value)}
                    className="w-full"
                  />
                  <p className="mt-1 text-xs text-stone-600/70 dark:text-stone-400/70">{tCellar('priceOptional')}</p>
                </div>
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                  {error}
                </p>
              )}
              <div className="mt-6 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  {tCommon('cancel')}
                </Button>
                {!isLoadingRacks && racks.length > 0 ? (
                  <Button
                    type="button"
                    className="flex-1 gap-1.5"
                    onClick={handleNextToLocation}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
                        {tCellar('chooseLocation')}
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={() => handleConfirm()}
                    disabled={isSubmitting || isLoadingRacks}
                  >
                    {isSubmitting || isLoadingRacks ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      tWineCard('addToCellar')
                    )}
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <LocationPickerModal
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onSelectSlot={handleSlotSelected}
        racks={racks}
        placementMap={placementMap}
        contentClassName="z-[100]"
      />
    </>
  );
}
