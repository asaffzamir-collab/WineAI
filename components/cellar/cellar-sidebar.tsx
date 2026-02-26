'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Wine, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useCellarRack } from '@/lib/cellar/cellar-rack-context';
import { CellarFiltersPanel } from '@/components/cellar/filters/cellar-filters';

export function CellarSidebar() {
  const t = useTranslations('cellar');
  const {
    racks, activeRackId, setActiveRackId,
    setIsRackBuilderOpen, setEditingRack, deleteRack,
    allPlacements,
  } = useCellarRack();

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const totalBottles = allPlacements.reduce((sum, p) => sum + p.quantity, 0);

  const handleDelete = (rackId: string) => {
    const hasBottles = allPlacements.some(
      (p) => p.cellarItemId && racks.find((r) => r.id === rackId) &&
        p.cellarItemId && true,
    );
    if (hasBottles && confirmDeleteId !== rackId) {
      setConfirmDeleteId(rackId);
      return;
    }
    deleteRack(rackId);
    setConfirmDeleteId(null);
  };

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
            <div key={rack.id} className="group relative">
              <button
                type="button"
                onClick={() => setActiveRackId(rack.id)}
                className={cn(
                  'w-full text-start rounded-lg px-3 py-2 text-sm transition-colors pe-16',
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
              <div className="absolute end-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingRack(rack);
                    setIsRackBuilderOpen(true);
                  }}
                  className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
                  title={t('editRack')}
                >
                  <Pencil className="h-3 w-3 text-muted-foreground" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(rack.id);
                  }}
                  className={cn(
                    'h-7 w-7 flex items-center justify-center rounded-md transition-colors',
                    confirmDeleteId === rack.id
                      ? 'bg-destructive/10 text-destructive'
                      : 'hover:bg-muted text-muted-foreground',
                  )}
                  title={confirmDeleteId === rack.id ? t('confirmDelete') : t('deleteRack')}
                >
                  <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                </button>
              </div>
              {confirmDeleteId === rack.id && (
                <p className="text-[10px] text-destructive px-3 pb-1">
                  {t('deleteRackConfirm')}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Filters */}
      <CellarFiltersPanel />
    </aside>
  );
}
