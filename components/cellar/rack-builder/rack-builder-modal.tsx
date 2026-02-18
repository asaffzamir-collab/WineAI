'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useCellarRack } from '@/lib/cellar/cellar-rack-context';
import { trackCellar } from '@/lib/cellar/analytics';
import type { Rack, StackingStyle, Shelf, ShelfZone } from '@/lib/cellar/types';
import { createDefaultRack } from '@/lib/cellar/types';
import { Plus, Trash2, GripVertical } from 'lucide-react';

const STACKING_OPTIONS: { id: StackingStyle; labelKey: string }[] = [
  { id: 'aligned', labelKey: 'stackAligned' },
  { id: 'shifted-left', labelKey: 'stackShiftedLeft' },
  { id: 'shifted-right', labelKey: 'stackShiftedRight' },
];

const ZONE_OPTIONS: { id: ShelfZone; labelKey: string }[] = [
  { id: 'everyday', labelKey: 'zoneEveryday' },
  { id: 'special', labelKey: 'zoneSpecial' },
  { id: 'aging', labelKey: 'zoneAging' },
  { id: 'whites', labelKey: 'zoneWhites' },
  { id: 'reds', labelKey: 'zoneReds' },
  { id: 'sparkling', labelKey: 'zoneSparkling' },
  { id: 'custom', labelKey: 'zoneCustom' },
];

function RackPreviewMini({ rack }: { rack: Rack }) {
  return (
    <div className="rounded-xl bg-muted/30 border border-border/50 p-3">
      <div
        className="grid gap-px"
        style={{
          gridTemplateColumns: `repeat(${rack.columns}, 1fr)`,
          gridTemplateRows: `repeat(${rack.rows}, 1fr)`,
        }}
      >
        {Array.from({ length: rack.rows * rack.columns }).map((_, i) => {
          const row = Math.floor(i / rack.columns);
          const col = i % rack.columns;
          const isOffset =
            rack.stackingStyle !== 'aligned' &&
            row % 2 === 1;
          return (
            <div
              key={i}
              className="h-4 rounded-sm bg-muted/60 border border-border/30"
              style={{
                marginInlineStart: isOffset
                  ? rack.stackingStyle === 'shifted-right' ? '4px' : '-4px'
                  : 0,
              }}
            />
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-2">
        {rack.columns}×{rack.rows}{rack.depth > 1 ? ` ×${rack.depth}` : ''}
      </p>
    </div>
  );
}

export function RackBuilderModal() {
  const t = useTranslations('cellar');
  const {
    isRackBuilderOpen, setIsRackBuilderOpen,
    editingRack, setEditingRack,
    createRack, updateRack,
  } = useCellarRack();

  const [name, setName] = useState('');
  const [columns, setColumns] = useState(6);
  const [rows, setRows] = useState(6);
  const [depth, setDepth] = useState(1);
  const [stackingStyle, setStackingStyle] = useState<StackingStyle>('aligned');
  const [shelves, setShelves] = useState<Shelf[]>([]);

  useEffect(() => {
    if (isRackBuilderOpen) {
      if (editingRack) {
        setName(editingRack.name);
        setColumns(editingRack.columns);
        setRows(editingRack.rows);
        setDepth(editingRack.depth);
        setStackingStyle(editingRack.stackingStyle);
        setShelves(editingRack.shelves);
      } else {
        const def = createDefaultRack('');
        setName('');
        setColumns(def.columns);
        setRows(def.rows);
        setDepth(def.depth);
        setStackingStyle(def.stackingStyle);
        setShelves(def.shelves);
      }
    }
  }, [isRackBuilderOpen, editingRack]);

  const previewRack: Rack = {
    id: editingRack?.id || 'preview',
    name: name || t('newRack'),
    columns, rows, depth, stackingStyle, shelves,
    createdAt: editingRack?.createdAt || '',
    updatedAt: '',
  };

  const addShelf = () => {
    const lastEnd = shelves.length > 0
      ? shelves[shelves.length - 1].yStartRow + shelves[shelves.length - 1].heightRows
      : 0;
    const remaining = rows - lastEnd;
    if (remaining <= 0) return;
    setShelves([
      ...shelves,
      {
        id: crypto.randomUUID(),
        name: `${t('shelf')} ${shelves.length + 1}`,
        yStartRow: lastEnd,
        heightRows: remaining,
        zone: 'custom',
      },
    ]);
  };

  const removeShelf = (id: string) => {
    setShelves(shelves.filter((s) => s.id !== id));
  };

  const updateShelf = (id: string, patch: Partial<Shelf>) => {
    setShelves(shelves.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const handleSave = () => {
    const finalName = name.trim() || t('newRack');
    const finalShelves = shelves.length > 0
      ? shelves
      : [{ id: crypto.randomUUID(), name: 'Main', yStartRow: 0, heightRows: rows, zone: 'custom' as ShelfZone }];

    if (editingRack) {
      updateRack({
        ...editingRack,
        name: finalName,
        columns, rows, depth, stackingStyle,
        shelves: finalShelves,
        updatedAt: new Date().toISOString(),
      });
      trackCellar('rack_edited');
    } else {
      const newRack: Rack = {
        id: crypto.randomUUID(),
        name: finalName,
        columns, rows, depth, stackingStyle,
        shelves: finalShelves,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      createRack(newRack);
      trackCellar('rack_created');
    }

    setIsRackBuilderOpen(false);
    setEditingRack(null);
  };

  return (
    <Dialog open={isRackBuilderOpen} onOpenChange={(open) => {
      if (!open) {
        setIsRackBuilderOpen(false);
        setEditingRack(null);
      }
    }}>
      <DialogContent
        onClose={() => { setIsRackBuilderOpen(false); setEditingRack(null); }}
        className="max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <h2 className="heading-serif text-lg text-foreground">
          {editingRack ? t('editRack') : t('createRack')}
        </h2>

        <div className="space-y-5 mt-4">
          {/* Name */}
          <div>
            <Label className="text-sm">{t('rackName')}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('rackNamePlaceholder')}
              className="mt-1"
            />
          </div>

          {/* Dimensions */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">{t('rackColumns')}</Label>
              <div className="flex items-center gap-2 mt-1">
                <Slider min={2} max={20} step={1} value={[columns]} onValueChange={([v]) => setColumns(v)} />
                <span className="text-sm font-medium w-6 text-end">{columns}</span>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t('rackRows')}</Label>
              <div className="flex items-center gap-2 mt-1">
                <Slider min={2} max={15} step={1} value={[rows]} onValueChange={([v]) => setRows(v)} />
                <span className="text-sm font-medium w-6 text-end">{rows}</span>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t('rackDepth')}</Label>
              <div className="flex items-center gap-2 mt-1">
                <Slider min={1} max={3} step={1} value={[depth]} onValueChange={([v]) => setDepth(v)} />
                <span className="text-sm font-medium w-6 text-end">{depth}</span>
              </div>
            </div>
          </div>

          {/* Stacking Style */}
          <div>
            <Label className="text-xs text-muted-foreground">{t('rackStacking')}</Label>
            <div className="flex gap-2 mt-1">
              {STACKING_OPTIONS.map(({ id, labelKey }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStackingStyle(id)}
                  className={cn(
                    'flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all border',
                    stackingStyle === id
                      ? 'bg-garnet-500/10 border-garnet-500/30 text-garnet-600 dark:text-garnet-400'
                      : 'bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/60',
                  )}
                >
                  {t(labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Shelves */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs text-muted-foreground">{t('rackShelves')}</Label>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={addShelf}>
                <Plus className="h-3 w-3" strokeWidth={2} />
                {t('addShelf')}
              </Button>
            </div>
            <div className="space-y-2">
              {shelves.map((shelf) => (
                <div key={shelf.id} className="flex items-center gap-2 rounded-lg bg-muted/30 p-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground/50 flex-shrink-0 cursor-grab" />
                  <Input
                    value={shelf.name}
                    onChange={(e) => updateShelf(shelf.id, { name: e.target.value })}
                    className="h-8 text-xs flex-1"
                    placeholder={t('shelfName')}
                  />
                  <select
                    value={shelf.zone || 'custom'}
                    onChange={(e) => updateShelf(shelf.id, { zone: e.target.value as ShelfZone })}
                    className="h-8 text-xs rounded-md border border-input bg-background px-2"
                  >
                    {ZONE_OPTIONS.map(({ id, labelKey }) => (
                      <option key={id} value={id}>{t(labelKey)}</option>
                    ))}
                  </select>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => removeShelf(shelf.id)}
                    disabled={shelves.length <= 1}
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground" strokeWidth={1.5} />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <RackPreviewMini rack={previewRack} />

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => { setIsRackBuilderOpen(false); setEditingRack(null); }}
            >
              {t('cancel')}
            </Button>
            <Button className="flex-1" onClick={handleSave}>
              {editingRack ? t('saveRack') : t('createRack')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
