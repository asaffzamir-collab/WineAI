'use client';

import { useMemo, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Wine, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCellarRack } from '@/lib/cellar/cellar-rack-context';
import type { Rack, SlotId, Placement, WineCategory } from '@/lib/cellar/types';
import { buildSlotId, WINE_TYPE_COLORS } from '@/lib/cellar/types';
import { matchesFilters } from '@/lib/cellar/utils';
import { trackCellar } from '@/lib/cellar/analytics';

const READINESS_GLOW: Record<string, string> = {
  ready: 'ring-2 ring-green-400/60',
  hold: '',
  'past-peak': 'ring-2 ring-red-400/60',
};

interface SlotCellProps {
  slotId: SlotId;
  placement?: Placement;
  isSelected: boolean;
  isFiltered: boolean;
  heatmapEnabled: boolean;
  isPickerMode: boolean;
  onSelect: (slotId: SlotId) => void;
  stackingOffset: number;
}

function BottleSvg({ type }: { type: WineCategory }) {
  const color = WINE_TYPE_COLORS[type];
  const isLight = type === 'white' || type === 'sparkling';
  return (
    <svg viewBox="0 0 24 48" className="h-full w-full" style={{ transform: 'rotate(-30deg)' }}>
      {/* Capsule / Foil */}
      <rect x="9" y="0" width="6" height="6" rx="1" fill={isLight ? '#8B7355' : '#4A2030'} opacity="0.8" />
      {/* Neck */}
      <rect x="10" y="6" width="4" height="10" rx="1" fill={color} opacity="0.7" />
      {/* Body */}
      <rect x="6" y="16" width="12" height="28" rx="3" fill={color} />
      {/* Glass highlight */}
      <rect x="8" y="18" width="3" height="20" rx="1.5" fill="white" opacity="0.2" />
      {/* Label band */}
      <rect x="6" y="26" width="12" height="8" rx="1" fill="white" opacity="0.15" />
    </svg>
  );
}

function SlotCell({
  slotId, placement, isSelected, isFiltered, heatmapEnabled, isPickerMode, onSelect, stackingOffset, emptyLabel, maxWidth,
}: SlotCellProps & { emptyLabel: string; maxWidth: number }) {
  const isEmpty = !placement;
  const dimmed = !isEmpty && !isFiltered;
  const pickerHighlight = isPickerMode && isEmpty;
  const readinessGlow = heatmapEnabled && placement?.readinessTag
    ? READINESS_GLOW[placement.readinessTag] || ''
    : '';

  return (
    <button
      type="button"
      role="gridcell"
      data-slot={slotId}
      onClick={() => onSelect(slotId)}
      className={cn(
        'relative aspect-[3/5] rounded-lg transition-all duration-200 group outline-none flex-shrink-0',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        isEmpty
          ? 'border border-dashed border-border/40 hover:border-border hover:bg-muted/30'
          : 'border border-border/20 bg-card shadow-inner-soft hover:shadow-soft',
        isSelected && 'ring-2 ring-garnet-500 ring-offset-1 ring-offset-background',
        dimmed && 'opacity-30',
        pickerHighlight && 'border-garnet-500/50 bg-garnet-500/5 hover:bg-garnet-500/10',
        readinessGlow,
      )}
      style={{ marginInlineStart: `${stackingOffset}px`, width: maxWidth, maxWidth }}
      aria-label={isEmpty ? emptyLabel : placement.wineName}
      aria-selected={isSelected}
      tabIndex={isSelected ? 0 : -1}
    >
      {isEmpty ? (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Plus className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        </div>
      ) : (
        <div className="absolute inset-1 flex items-center justify-center">
          <BottleSvg type={placement.wineType} />
        </div>
      )}

      {/* Depth indicator */}
      {placement && placement.quantity > 1 && (
        <div className="absolute -top-1 -end-1 h-4 min-w-4 rounded-full bg-foreground text-background text-[9px] font-bold flex items-center justify-center px-1">
          {placement.quantity}
        </div>
      )}
    </button>
  );
}

interface Rack2DGridProps {
  rack: Rack;
}

export function Rack2DGrid({ rack }: Rack2DGridProps) {
  const t = useTranslations('cellar');
  const {
    placementMap, selectedSlotId, setSelectedSlotId,
    filters, heatmapEnabled, isPickerMode,
  } = useCellarRack();

  const slots = useMemo(() => {
    const result: { slotId: SlotId; shelfId: string; layer: number; row: number; col: number }[] = [];
    for (const shelf of rack.shelves) {
      for (let layer = 0; layer < rack.depth; layer++) {
        for (let row = shelf.yStartRow; row < shelf.yStartRow + shelf.heightRows; row++) {
          for (let col = 0; col < rack.columns; col++) {
            const slotId = buildSlotId({ rackId: rack.id, shelfId: shelf.id, layer, row, col });
            result.push({ slotId, shelfId: shelf.id, layer, row, col });
          }
        }
      }
    }
    return result;
  }, [rack]);

  const gridRef = useRef<HTMLDivElement>(null);

  const handleSelect = useCallback(
    (slotId: SlotId) => {
      setSelectedSlotId(selectedSlotId === slotId ? null : slotId);
      trackCellar('slot_clicked', { filled: placementMap.has(slotId) ? 'true' : 'false' });
    },
    [selectedSlotId, setSelectedSlotId, placementMap],
  );

  // Flat list of slot IDs in visual order for keyboard nav
  const flatSlotIds = useMemo(() => {
    return slots.filter((s) => s.layer === 0).map((s) => s.slotId);
  }, [slots]);

  const handleGridKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!selectedSlotId || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    const idx = flatSlotIds.indexOf(selectedSlotId);
    if (idx === -1) return;

    let nextIdx = idx;
    switch (e.key) {
      case 'ArrowRight': nextIdx = Math.min(idx + 1, flatSlotIds.length - 1); break;
      case 'ArrowLeft': nextIdx = Math.max(idx - 1, 0); break;
      case 'ArrowDown': nextIdx = Math.min(idx + rack.columns, flatSlotIds.length - 1); break;
      case 'ArrowUp': nextIdx = Math.max(idx - rack.columns, 0); break;
    }

    if (nextIdx !== idx) {
      setSelectedSlotId(flatSlotIds[nextIdx]);
      // Focus the button for that slot
      const nextButton = gridRef.current?.querySelector(`[data-slot="${flatSlotIds[nextIdx]}"]`) as HTMLElement | null;
      nextButton?.focus();
    }
  }, [selectedSlotId, flatSlotIds, rack.columns, setSelectedSlotId]);

  // Group by shelf for rendering shelf labels
  const shelfGroups = useMemo(() => {
    const groups: { shelf: typeof rack.shelves[0]; rows: { row: number; cells: typeof slots }[] }[] = [];
    for (const shelf of rack.shelves) {
      const shelfSlots = slots.filter((s) => s.shelfId === shelf.id && s.layer === 0);
      const rowMap = new Map<number, typeof slots>();
      for (const s of shelfSlots) {
        if (!rowMap.has(s.row)) rowMap.set(s.row, []);
        rowMap.get(s.row)!.push(s);
      }
      const rows = Array.from(rowMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([row, cells]) => ({ row, cells }));
      groups.push({ shelf, rows });
    }
    return groups;
  }, [rack.shelves, slots]);

  const getStackingOffset = useCallback(
    (row: number) => {
      if (rack.stackingStyle === 'aligned') return 0;
      if (row % 2 === 0) return 0;
      const offset = 12;
      return rack.stackingStyle === 'shifted-right' ? offset : -offset;
    },
    [rack.stackingStyle],
  );

  const totalSlots = rack.columns * rack.shelves.reduce((s, sh) => s + sh.heightRows, 0);
  const maxCellWidth = totalSlots <= 12 ? 64 : totalSlots <= 30 ? 48 : 40;

  return (
    <div
      ref={gridRef}
      className="rounded-2xl bg-card shadow-soft p-4 overflow-x-auto"
      role="grid"
      aria-label={rack.name}
      onKeyDown={handleGridKeyDown}
    >
      <div className="min-w-fit space-y-1">
        {shelfGroups.map(({ shelf, rows }) => (
          <div key={shelf.id} role="rowgroup">
            {rack.shelves.length > 1 && (
              <div className="flex items-center gap-2 py-1.5 mb-1">
                {shelf.labelColor && (
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: shelf.labelColor }} />
                )}
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {shelf.name}
                  {shelf.zone && shelf.zone !== 'custom' && (
                    <span className="ms-1 text-muted-foreground/60">({t(`zone${shelf.zone.charAt(0).toUpperCase() + shelf.zone.slice(1)}`)})</span>
                  )}
                </span>
                <div className="flex-1 h-px bg-border/30" />
              </div>
            )}

            {rows.map(({ row, cells }) => (
              <div
                key={row}
                role="row"
                className="flex gap-1.5 mb-1.5"
              >
                {cells.map(({ slotId }) => {
                  const placement = placementMap.get(slotId);
                  const isFiltered = !placement || matchesFilters(placement, filters);
                  return (
                    <SlotCell
                      key={slotId}
                      slotId={slotId}
                      placement={placement}
                      isSelected={selectedSlotId === slotId}
                      isFiltered={isFiltered}
                      heatmapEnabled={heatmapEnabled}
                      isPickerMode={isPickerMode}
                      onSelect={handleSelect}
                      stackingOffset={getStackingOffset(row)}
                      emptyLabel={t('slotEmpty')}
                      maxWidth={maxCellWidth}
                    />
                  );
                })}
              </div>
            ))}

            <div className="h-1 rounded-full bg-stone-300/30 dark:bg-stone-700/30 mx-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
