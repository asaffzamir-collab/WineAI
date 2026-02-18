'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useCellarRack } from '@/lib/cellar/cellar-rack-context';
import type { WineCategory, ReadinessTag, CellarFilters } from '@/lib/cellar/types';
import { DEFAULT_FILTERS } from '@/lib/cellar/types';
import { getUniqueRegions } from '@/lib/cellar/utils';

const typeOptions: { id: WineCategory; labelKey: string; color: string }[] = [
  { id: 'red', labelKey: 'typeRed', color: 'bg-[#722F37] text-white' },
  { id: 'white', labelKey: 'typeWhite', color: 'bg-[#F5E6B8] text-stone-800' },
  { id: 'rose', labelKey: 'typeRose', color: 'bg-[#E8B4B8] text-stone-800' },
  { id: 'sparkling', labelKey: 'typeSparkling', color: 'bg-[#C0C0C0] text-stone-800' },
];

const readinessOptions: { id: ReadinessTag; labelKey: string; color: string }[] = [
  { id: 'ready', labelKey: 'filterReady', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  { id: 'hold', labelKey: 'filterHold', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { id: 'past-peak', labelKey: 'filterPastPeak', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
];

function FilterContent() {
  const t = useTranslations('cellar');
  const { filters, setFilters, resetFilters, allPlacements } = useCellarRack();
  const regions = getUniqueRegions(allPlacements);

  const toggleType = (type: WineCategory) => {
    const next = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    setFilters({ ...filters, types: next });
  };

  const toggleReadiness = (tag: ReadinessTag) => {
    const next = filters.readiness.includes(tag)
      ? filters.readiness.filter((t) => t !== tag)
      : [...filters.readiness, tag];
    setFilters({ ...filters, readiness: next });
  };

  const hasActiveFilters =
    filters.search || filters.types.length > 0 || filters.readiness.length > 0 || filters.minRating > 0 || filters.regions.length > 0;

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        <Input
          placeholder={t('filterSearch')}
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="ps-9 h-9 text-sm"
        />
      </div>

      {/* Type */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-2">{t('filterType')}</h4>
        <div className="flex flex-wrap gap-1.5">
          {typeOptions.map(({ id, labelKey, color }) => (
            <button
              key={id}
              type="button"
              onClick={() => toggleType(id)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-all',
                filters.types.includes(id)
                  ? color
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Readiness */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-2">{t('filterReadiness')}</h4>
        <div className="flex flex-wrap gap-1.5">
          {readinessOptions.map(({ id, labelKey, color }) => (
            <button
              key={id}
              type="button"
              onClick={() => toggleReadiness(id)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-all',
                filters.readiness.includes(id)
                  ? color
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Rating */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-2">
          {t('filterRating')} {filters.minRating > 0 ? `≥ ${filters.minRating.toFixed(1)}` : ''}
        </h4>
        <Slider
          min={0}
          max={5}
          step={0.5}
          value={[filters.minRating]}
          onValueChange={([v]) => setFilters({ ...filters, minRating: v })}
          className="w-full"
        />
      </div>

      {/* Sort */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-2">{t('filterSort')}</h4>
        <div className="flex flex-wrap gap-1.5">
          {(['date-added', 'name', 'price', 'rating', 'readiness'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setFilters({ ...filters, sort: opt })}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-all',
                filters.sort === opt
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {t(`sort_${opt}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Reset */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" className="text-xs w-full" onClick={resetFilters}>
          <X className="h-3 w-3 me-1" strokeWidth={2} />
          {t('filterReset')}
        </Button>
      )}
    </div>
  );
}

export function CellarFiltersPanel() {
  return <FilterContent />;
}

export function MobileFilterSheet() {
  const t = useTranslations('cellar');
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating filter button - mobile only */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 start-4 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-lift border border-border/50 lg:hidden md:bottom-6"
      >
        <SlidersHorizontal className="h-4 w-4 text-foreground" strokeWidth={1.5} />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
          <div className="flex justify-center py-2 mb-2">
            <div className="h-1.5 w-12 rounded-full bg-muted" />
          </div>
          <h3 className="text-heading text-foreground mb-4">{t('filterTitle')}</h3>
          <FilterContent />
        </SheetContent>
      </Sheet>
    </>
  );
}
