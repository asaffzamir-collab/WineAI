'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useUser } from '@/lib/user-context';
import {
  Wine, MapPin, Star, MoreHorizontal, CircleCheck, WineOff,
  StickyNote, Sparkles, Eye, Loader2, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCellarRack } from '@/lib/cellar/cellar-rack-context';
import { useSommelier } from '@/components/sommelier/sommelier-context';
import { WINE_TYPE_COLORS } from '@/lib/cellar/types';
import type { Placement } from '@/lib/cellar/types';
import { EmptyState } from '@/components/ui/empty-state';
import { ImageAttribution } from '@/components/ui/image-attribution';
import { formatCurrency } from '@/lib/utils';
import { trackCellar } from '@/lib/cellar/analytics';

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

function getOpenedData(userId: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(`cellar-opened:${userId}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function setOpenedDataLS(userId: string, data: Record<string, string>) {
  try { localStorage.setItem(`cellar-opened:${userId}`, JSON.stringify(data)); } catch {}
}

function ListItem({
  placement,
  onViewDetails,
  onDrink,
  onMarkOpened,
  onNote,
  onSommelier,
  isDrinking,
}: {
  placement: Placement;
  onViewDetails: () => void;
  onDrink: () => void;
  onMarkOpened: () => void;
  onNote: () => void;
  onSommelier: () => void;
  isDrinking: boolean;
}) {
  const t = useTranslations('cellar');
  const [expanded, setExpanded] = useState(false);
  const typeColor = WINE_TYPE_COLORS[placement.wineType] || WINE_TYPE_COLORS.other;

  return (
    <div className="rounded-2xl bg-card shadow-soft overflow-hidden">
      <button
        type="button"
        onClick={onViewDetails}
        className="w-full flex items-center gap-3 p-3.5 text-start card-hover"
      >
        <div className="flex-shrink-0">
          {placement.imageUrl ? (
            <div className="flex flex-col items-center gap-0.5">
              <div className="h-14 w-10 overflow-hidden rounded-xl bg-ivory-300 dark:bg-charcoal-700">
                <img
                  src={placement.imageUrl}
                  alt={placement.wineName}
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              </div>
              <ImageAttribution source={placement.imageSource} />
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
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="rounded-full p-1.5 hover:bg-muted transition-colors"
          >
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          </button>
        </div>
      </button>

      {expanded && (
        <div className="flex items-center gap-1.5 px-3.5 pb-3 pt-0.5 overflow-x-auto">
          <Button
            variant="outline" size="sm"
            className="gap-1.5 text-xs flex-shrink-0 h-8"
            onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
          >
            <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
            {t('actionViewDetails')}
          </Button>
          <Button
            variant="outline" size="sm"
            className="gap-1.5 text-xs flex-shrink-0 h-8"
            onClick={(e) => { e.stopPropagation(); onDrink(); }}
            disabled={isDrinking}
          >
            {isDrinking
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <CircleCheck className="h-3.5 w-3.5" strokeWidth={1.5} />}
            {t('actionDrink')}
          </Button>
          {!placement.openedAt && (
            <Button
              variant="outline" size="sm"
              className="gap-1.5 text-xs flex-shrink-0 h-8 border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400"
              onClick={(e) => { e.stopPropagation(); onMarkOpened(); }}
            >
              <WineOff className="h-3.5 w-3.5" strokeWidth={1.5} />
              {t('actionMarkOpened')}
            </Button>
          )}
          <Button
            variant="outline" size="sm"
            className="gap-1.5 text-xs flex-shrink-0 h-8"
            onClick={(e) => { e.stopPropagation(); onNote(); }}
          >
            <StickyNote className="h-3.5 w-3.5" strokeWidth={1.5} />
            {t('actionNote')}
          </Button>
          <Button
            variant="outline" size="sm"
            className="gap-1.5 text-xs flex-shrink-0 h-8 border-garnet-500/30 text-garnet-600 dark:text-garnet-400"
            onClick={(e) => { e.stopPropagation(); onSommelier(); }}
          >
            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
            {t('actionAskSommelier')}
          </Button>
        </div>
      )}
    </div>
  );
}

type NoteEditState = { cellarItemId: string; text: string } | null;

export function ListView() {
  const t = useTranslations('cellar');
  const { gender } = useUser();
  const g = { gender };
  const { filteredPlacements, setWineCardPlacement, refreshCellar, userId } = useCellarRack();
  const { open: openSommelier } = useSommelier();
  const [drinkingId, setDrinkingId] = useState<string | null>(null);
  const [noteEdit, setNoteEdit] = useState<NoteEditState>(null);
  const [isSavingNote, setIsSavingNote] = useState(false);

  const handleDrink = useCallback(async (p: Placement) => {
    setDrinkingId(p.cellarItemId);
    try {
      const now = new Date().toISOString();
      if (p.quantity <= 1) {
        await fetch('/api/cellar', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: p.cellarItemId, quantity: 0, consumedAt: now }),
        });
      } else {
        await fetch('/api/cellar', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: p.cellarItemId, quantity: p.quantity - 1 }),
        });
      }
      await refreshCellar();
      trackCellar('list_drink');
    } catch (e) {
      console.error('Failed to drink:', e);
    } finally {
      setDrinkingId(null);
    }
  }, [refreshCellar]);

  const handleMarkOpened = useCallback(async (p: Placement) => {
    const now = new Date().toISOString();
    const data = getOpenedData(userId);
    data[p.cellarItemId] = now;
    setOpenedDataLS(userId, data);
    await fetch('/api/cellar', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.cellarItemId, openedAt: now }),
    }).catch(() => {});
    await refreshCellar();
  }, [userId, refreshCellar]);

  const handleSaveNote = useCallback(async () => {
    if (!noteEdit) return;
    setIsSavingNote(true);
    try {
      await fetch('/api/cellar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: noteEdit.cellarItemId, notes: noteEdit.text.trim() || null }),
      });
      await refreshCellar();
      setNoteEdit(null);
    } catch (e) {
      console.error('Failed to save note:', e);
    } finally {
      setIsSavingNote(false);
    }
  }, [noteEdit, refreshCellar]);

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
    <div className="space-y-3">
      {/* Inline note editor */}
      {noteEdit && (
        <div className="rounded-2xl bg-card shadow-soft p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">{t('actionNote')}</p>
          <Input
            value={noteEdit.text}
            onChange={(e) => setNoteEdit({ ...noteEdit, text: e.target.value })}
            placeholder={t('notesPlaceholder')}
            className="text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setNoteEdit(null)} disabled={isSavingNote}>
              {t('cancel')}
            </Button>
            <Button size="sm" className="flex-1 gap-1" onClick={handleSaveNote} disabled={isSavingNote}>
              {isSavingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" strokeWidth={1.5} />}
              {t('save')}
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredPlacements.map((p) => (
          <ListItem
            key={p.cellarItemId}
            placement={p}
            onViewDetails={() => setWineCardPlacement(p)}
            onDrink={() => handleDrink(p)}
            onMarkOpened={() => handleMarkOpened(p)}
            onNote={() => setNoteEdit({ cellarItemId: p.cellarItemId, text: p.notes || '' })}
            onSommelier={() => { openSommelier('food-pairing'); trackCellar('sommelier_opened_from_cellar'); }}
            isDrinking={drinkingId === p.cellarItemId}
          />
        ))}
      </div>
    </div>
  );
}
