'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, ChevronDown, ChevronUp, MapPin, Wine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCellarRack } from '@/lib/cellar/cellar-rack-context';
import { WINE_TYPE_COLORS } from '@/lib/cellar/types';
import type { Placement, SlotId } from '@/lib/cellar/types';
import { LocationPickerModal } from './location-picker/location-picker-modal';
import { trackCellar } from '@/lib/cellar/analytics';

export function UnassignedBin() {
  const t = useTranslations('cellar');
  const { unassignedPlacements, racks, placementMap, assignSlot } = useCellarRack();
  const [expanded, setExpanded] = useState(false);
  const [placingItem, setPlacingItem] = useState<Placement | null>(null);

  if (unassignedPlacements.length === 0) return null;

  const handleSlotSelected = (slotId: SlotId) => {
    if (!placingItem || !slotId) return;
    assignSlot(placingItem.cellarItemId, slotId);
    trackCellar('bottle_added_to_slot');
    setPlacingItem(null);
  };

  return (
    <>
      <div className="rounded-xl bg-warning-muted/30 border border-warning/20 overflow-hidden">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-3 px-4 py-3 text-start"
        >
          <AlertCircle className="h-4 w-4 text-warning flex-shrink-0" strokeWidth={1.5} />
          <span className="text-sm font-medium text-foreground flex-1">
            {t('unassignedCount', { count: unassignedPlacements.length })}
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          )}
        </button>

        {expanded && (
          <div className="border-t border-warning/10 px-4 py-3 space-y-2 max-h-60 overflow-y-auto">
            {unassignedPlacements.map((p) => (
              <div key={p.cellarItemId} className="flex items-center gap-3">
                <div
                  className="flex h-8 w-6 items-center justify-center rounded-lg flex-shrink-0"
                  style={{ backgroundColor: WINE_TYPE_COLORS[p.wineType] }}
                >
                  <Wine
                    className={cn(
                      'h-3.5 w-3.5',
                      p.wineType === 'white' || p.wineType === 'sparkling' ? 'text-stone-600' : 'text-white/80',
                    )}
                    strokeWidth={1.5}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">{p.wineName}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{p.winery}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] gap-1 px-2 flex-shrink-0"
                  onClick={() => {
                    setPlacingItem(p);
                    trackCellar('location_picker_opened');
                  }}
                >
                  <MapPin className="h-3 w-3" strokeWidth={1.5} />
                  {t('unassignedPlace')}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <LocationPickerModal
        open={!!placingItem}
        onClose={() => setPlacingItem(null)}
        onSelectSlot={handleSlotSelected}
        racks={racks}
        placementMap={placementMap}
      />
    </>
  );
}
