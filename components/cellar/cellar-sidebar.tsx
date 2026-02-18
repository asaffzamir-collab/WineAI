'use client';

import { useTranslations } from 'next-intl';
import { Plus, Wine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useCellarRack } from '@/lib/cellar/cellar-rack-context';
import { CellarFiltersPanel } from '@/components/cellar/filters/cellar-filters';

export function CellarSidebar() {
  const t = useTranslations('cellar');
  const {
    racks, activeRackId, setActiveRackId,
    setIsRackBuilderOpen, setEditingRack,
    allPlacements, unassignedPlacements,
  } = useCellarRack();

  const totalBottles = allPlacements.reduce((sum, p) => sum + p.quantity, 0);

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-[280px] lg:flex-shrink-0 rounded-2xl bg-card shadow-soft p-4 gap-4 self-start sticky top-6">
      {/* Stats */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-garnet-500/10">
          <Wine className="h-5 w-5 text-garnet-600 dark:text-garnet-400" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-heading text-foreground">{totalBottles}</p>
          <p className="text-caption text-muted-foreground">{t('totalBottles')}</p>
        </div>
      </div>

      <Separator />

      {/* Rack Selector */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground">{t('racks')}</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => {
              setEditingRack(null);
              setIsRackBuilderOpen(true);
            }}
            title={t('createRack')}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          </Button>
        </div>
        <div className="space-y-1">
          {racks.map((rack) => (
            <button
              key={rack.id}
              type="button"
              onClick={() => setActiveRackId(rack.id)}
              className={cn(
                'w-full text-start rounded-lg px-3 py-2 text-sm transition-colors',
                activeRackId === rack.id
                  ? 'bg-garnet-500/10 text-garnet-600 font-medium dark:text-garnet-400'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              <span className="block truncate">{rack.name}</span>
              <span className="text-xs text-muted-foreground">
                {rack.columns}×{rack.rows}
                {rack.depth > 1 ? ` ×${rack.depth}` : ''}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Unassigned count */}
      {unassignedPlacements.length > 0 && (
        <div className="rounded-lg bg-warning-muted/50 px-3 py-2 text-xs text-warning">
          {t('unassignedCount', { count: unassignedPlacements.length })}
        </div>
      )}

      <Separator />

      {/* Filters */}
      <CellarFiltersPanel />
    </aside>
  );
}
