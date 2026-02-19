'use client';

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Wine, Plus, Check, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Rack, SlotId, Placement, WineCategory } from '@/lib/cellar/types';
import { buildSlotId, computeAllSlots, WINE_TYPE_COLORS } from '@/lib/cellar/types';
import { trackCellar } from '@/lib/cellar/analytics';

interface LocationPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelectSlot: (slotId: SlotId) => void;
  racks: Rack[];
  placementMap: Map<SlotId, Placement>;
  contentClassName?: string;
}

function MiniBottleSvg({ type }: { type: WineCategory }) {
  const color = WINE_TYPE_COLORS[type];
  return (
    <svg viewBox="0 0 24 48" className="h-full w-full" style={{ transform: 'rotate(-30deg)' }}>
      <rect x="9" y="0" width="6" height="6" rx="1" fill="#4A2030" opacity="0.6" />
      <rect x="10" y="6" width="4" height="10" rx="1" fill={color} opacity="0.6" />
      <rect x="6" y="16" width="12" height="28" rx="3" fill={color} opacity="0.7" />
    </svg>
  );
}

export function LocationPickerModal({
  open, onClose, onSelectSlot, racks, placementMap, contentClassName,
}: LocationPickerModalProps) {
  const t = useTranslations('cellar');
  const [activeRackIdx, setActiveRackIdx] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<SlotId | null>(null);

  const activeRack = racks[activeRackIdx] || null;

  const slots = useMemo(() => {
    if (!activeRack) return [];
    return computeAllSlots(activeRack);
  }, [activeRack]);

  const emptySlots = useMemo(
    () => new Set(slots.filter((id) => !placementMap.has(id))),
    [slots, placementMap],
  );

  const handleConfirm = useCallback(() => {
    if (selectedSlot) {
      onSelectSlot(selectedSlot);
      trackCellar('bottle_added_to_slot');
      onClose();
    }
  }, [selectedSlot, onSelectSlot, onClose]);

  const handleSkip = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!activeRack) return null;

  const totalSlots = activeRack.columns * activeRack.shelves.reduce((s, sh) => s + sh.heightRows, 0);
  const cellSize = totalSlots <= 12 ? 44 : totalSlots <= 30 ? 36 : 28;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent onClose={onClose} className={cn("max-w-md", contentClassName)}>
        <div className="space-y-3">
          <div className="pe-8">
            <h2 className="heading-serif text-base text-foreground">{t('pickerTitle')}</h2>
            <p className="text-xs text-muted-foreground">{t('pickerHint')}</p>
          </div>

          {racks.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {racks.map((rack, idx) => (
                <button
                  key={rack.id}
                  type="button"
                  onClick={() => { setActiveRackIdx(idx); setSelectedSlot(null); }}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-all',
                    activeRackIdx === idx
                      ? 'bg-garnet-500/10 text-garnet-600 dark:text-garnet-400'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80',
                  )}
                >
                  {rack.name}
                </button>
              ))}
            </div>
          )}

          <div className="rounded-xl bg-muted/20 border border-border/30 p-2.5 overflow-x-auto max-h-[50vh] overflow-y-auto" dir="ltr">
            <div className="flex flex-col-reverse items-center gap-0.5">
              {activeRack.shelves.map((shelf) => (
                <div key={shelf.id} className="w-full">
                  {activeRack.shelves.length > 1 && (
                    <div className="flex items-center gap-2 py-0.5 mb-0.5" dir="auto">
                      <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
                        {shelf.name}
                      </span>
                      <div className="flex-1 h-px bg-border/30" />
                    </div>
                  )}
                  {Array.from({ length: shelf.heightRows }).map((_, rowIdx) => {
                    const row = shelf.yStartRow + shelf.heightRows - 1 - rowIdx;
                    return (
                      <div
                        key={row}
                        className="flex justify-center gap-1 mb-1"
                      >
                        {Array.from({ length: activeRack.columns }).map((_, col) => {
                          const slotId = buildSlotId({
                            rackId: activeRack.id, shelfId: shelf.id, layer: 0, row, col,
                          });
                          const isEmpty = emptySlots.has(slotId);
                          const placement = placementMap.get(slotId);
                          const isSelected = selectedSlot === slotId;

                          return (
                            <button
                              key={slotId}
                              type="button"
                              disabled={!isEmpty}
                              onClick={() => setSelectedSlot(isSelected ? null : slotId)}
                              className={cn(
                                'rounded transition-all relative flex-shrink-0',
                                isEmpty
                                  ? 'border border-dashed border-garnet-500/40 hover:border-garnet-500 hover:bg-garnet-500/5 cursor-pointer'
                                  : 'bg-muted/40 border border-border/20 cursor-not-allowed opacity-60',
                                isSelected && 'ring-2 ring-garnet-500 bg-garnet-500/10 border-garnet-500',
                              )}
                              style={{ width: cellSize, height: Math.round(cellSize * 1.3) }}
                            >
                              {isEmpty ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  {isSelected ? (
                                    <Check className="h-3 w-3 text-garnet-600" strokeWidth={2} />
                                  ) : (
                                    <Plus className="h-2.5 w-2.5 text-muted-foreground/40" strokeWidth={1.5} />
                                  )}
                                </div>
                              ) : placement ? (
                                <div className="absolute inset-1 flex items-center justify-center">
                                  <MiniBottleSvg type={placement.wineType} />
                                </div>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" className="flex-1" onClick={handleSkip}>
              {t('pickerSkip')}
            </Button>
            <Button size="sm" className="flex-1" onClick={handleConfirm} disabled={!selectedSlot}>
              {t('pickerConfirm')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
