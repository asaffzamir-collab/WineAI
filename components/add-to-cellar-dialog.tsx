'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { LocationPickerModal } from '@/components/cellar/location-picker/location-picker-modal';
import type { WineData } from '@/lib/openai';
import type { Rack, Placement, SlotId } from '@/lib/cellar/types';
import { trackCellar } from '@/lib/cellar/analytics';

interface AddToCellarDialogProps {
  wine: WineData | null;
  userId: string;
  bottlePhotoUrl?: string;
  onClose: () => void;
  onAdded: () => void;
}

function loadRacks(userId: string): Rack[] {
  try {
    const raw = localStorage.getItem(`cellar-racks:${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadPlacements(userId: string): Map<SlotId, Placement> {
  try {
    const raw = localStorage.getItem(`cellar-slots:${userId}`);
    if (!raw) return new Map();
    const assignments: Record<string, SlotId> = JSON.parse(raw);
    const map = new Map<SlotId, Placement>();
    for (const [, slotId] of Object.entries(assignments)) {
      if (slotId) {
        map.set(slotId, { slotId } as Placement);
      }
    }
    return map;
  } catch {
    return new Map();
  }
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

  useEffect(() => {
    if (wine) {
      setStep('details');
      setQuantity(1);
      setPriceNis('');
      setError('');
      setSelectedSlotId(null);
      setRacks(loadRacks(userId));
      setPlacementMap(loadPlacements(userId));
    }
  }, [wine, userId]);

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
        return;
      }

      // If a slot was chosen, save the assignment
      const finalSlot = slotId ?? selectedSlotId;
      if (finalSlot) {
        try {
          const slotsRaw = localStorage.getItem(`cellar-slots:${userId}`);
          const slots: Record<string, string> = slotsRaw ? JSON.parse(slotsRaw) : {};
          slots[`pending-${Date.now()}`] = finalSlot;
          localStorage.setItem(`cellar-slots:${userId}`, JSON.stringify(slots));
        } catch { /* silent */ }
        trackCellar('bottle_added_to_slot');
      }

      onClose();
      onAdded();
    } catch (err) {
      console.error('Failed to add to cellar:', err);
      setError('Network error. Please try again.');
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
    setShowPicker(false);
    if (slotId) {
      handleConfirm(slotId);
    } else {
      handleConfirm();
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  return (
    <>
      <Dialog open={!!wine} onOpenChange={handleOpenChange}>
        <DialogContent onClose={onClose} className="max-w-sm z-[100]">
          {wine && (
            <>
              <h3 className="heading-serif text-lg text-bordeaux-600 dark:text-ivory-200">
                {tCellar('addWine')}: {wine.name}
              </h3>
              <p className="text-sm text-stone-600 dark:text-stone-400">{wine.winery}</p>
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
                {racks.length > 0 ? (
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
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
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

      {/* Location picker modal on top */}
      <LocationPickerModal
        open={showPicker}
        onClose={() => {
          setShowPicker(false);
          handleConfirm();
        }}
        onSelectSlot={handleSlotSelected}
        racks={racks}
        placementMap={placementMap}
      />
    </>
  );
}
