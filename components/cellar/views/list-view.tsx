'use client';

import { useTranslations } from 'next-intl';
import { useUser } from '@/lib/user-context';
import { Wine, MapPin, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCellarRack } from '@/lib/cellar/cellar-rack-context';
import { WINE_TYPE_COLORS } from '@/lib/cellar/types';
import type { Placement } from '@/lib/cellar/types';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency } from '@/lib/utils';

function ReadinessBadge({ tag }: { tag?: string }) {
  if (!tag) return null;
  const colors: Record<string, string> = {
    ready: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    hold: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'past-peak': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  const labels: Record<string, string> = {
    ready: 'Ready',
    hold: 'Hold',
    'past-peak': 'Past peak',
  };
  return (
    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', colors[tag])}>
      {labels[tag]}
    </span>
  );
}

function ListItem({ placement, onSelect }: { placement: Placement; onSelect: () => void }) {
  const typeColor = WINE_TYPE_COLORS[placement.wineType] || WINE_TYPE_COLORS.other;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full flex items-center gap-3 rounded-2xl bg-card p-3.5 shadow-soft card-hover text-start"
    >
      <div className="flex-shrink-0">
        {placement.imageUrl ? (
          <div className="h-14 w-10 overflow-hidden rounded-xl bg-ivory-300 dark:bg-charcoal-700">
            <img
              src={placement.imageUrl}
              alt={placement.wineName}
              className="h-full w-full object-contain"
              loading="lazy"
            />
          </div>
        ) : (
          <div
            className="flex h-14 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: typeColor }}
          >
            <Wine
              className={cn(
                'h-5 w-5',
                placement.wineType === 'white' || placement.wineType === 'sparkling'
                  ? 'text-stone-600'
                  : 'text-white/80',
              )}
              strokeWidth={1.5}
            />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground line-clamp-1">{placement.wineName}</p>
        <p className="text-xs text-muted-foreground line-clamp-1">{placement.winery}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
          {(placement.region || placement.country) && (
            <span className="flex items-center gap-0.5">
              <MapPin className="h-3 w-3" strokeWidth={1.5} />
              {[placement.region, placement.country].filter(Boolean).join(', ')}
            </span>
          )}
          {placement.rating != null && (
            <span className="flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-copper-400 text-copper-400" />
              {placement.rating.toFixed(1)}
            </span>
          )}
          {placement.purchasePrice != null && placement.purchasePrice > 0 && (
            <span>{formatCurrency(placement.purchasePrice)}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <ReadinessBadge tag={placement.readinessTag} />
        <div className="flex items-center gap-1 rounded-full bg-bordeaux-50 px-2 py-0.5 dark:bg-bordeaux-900/30">
          <Wine className="h-3 w-3 text-bordeaux-500 dark:text-bordeaux-300" strokeWidth={1.5} />
          <span className="text-xs font-semibold text-primary">{placement.quantity}</span>
        </div>
      </div>
    </button>
  );
}

export function ListView() {
  const t = useTranslations('cellar');
  const { gender } = useUser();
  const g = { gender };
  const { filteredPlacements, setWineCardPlacement } = useCellarRack();

  if (filteredPlacements.length === 0) {
    return (
      <EmptyState
        icon={Wine}
        title={t('empty')}
        description={t('emptyDescription', g)}
        actionLabel={t('addWine')}
        actionHref="/search"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {filteredPlacements.map((p) => (
        <ListItem
          key={p.cellarItemId}
          placement={p}
          onSelect={() => setWineCardPlacement(p)}
        />
      ))}
    </div>
  );
}
