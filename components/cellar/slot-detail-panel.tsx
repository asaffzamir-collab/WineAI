'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { X, Wine, CircleCheck, ArrowRightLeft, Trash2, StickyNote, Sparkles, Loader2, Check, Eye, WineOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useCellarRack } from '@/lib/cellar/cellar-rack-context';
import { useSommelier } from '@/components/sommelier/sommelier-context';
import { WINE_TYPE_COLORS, parseSlotId } from '@/lib/cellar/types';
import { formatCurrency } from '@/lib/utils';
import { trackCellar } from '@/lib/cellar/analytics';
import { LocationPickerModal } from './location-picker/location-picker-modal';

type PanelMode = 'view' | 'note' | 'move' | 'place';

// Days an opened wine stays drinkable by type
const OPEN_WINE_DAYS: Record<string, number> = {
  red: 5,
  white: 3,
  rose: 3,
  sparkling: 1,
  dessert: 14,
};

function getOpenedData(userId: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(`cellar-opened:${userId}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function setOpenedData(userId: string, data: Record<string, string>) {
  try { localStorage.setItem(`cellar-opened:${userId}`, JSON.stringify(data)); } catch {}
}

export function SlotDetailPanel() {
  const t = useTranslations('cellar');
  const router = useRouter();
  const {
    selectedSlotId, setSelectedSlotId, selectedPlacement, placementMap,
    activeRack, racks, unassignSlot, moveBottle, assignSlot,
    unassignedPlacements, refreshCellar, userId, setWineCardPlacement,
  } = useCellarRack();
  const { open: openSommelier } = useSommelier();

  const [mode, setMode] = useState<PanelMode>('view');
  const [noteText, setNoteText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showMovePicker, setShowMovePicker] = useState(false);
  const [openedAt, setOpenedAt] = useState<string | null>(null);

  const loadOpenedState = useCallback(() => {
    if (!userId || !selectedSlotId) return;
    const cellarId = selectedPlacement?.cellarItemId;
    // Prefer DB value (from placement), fall back to localStorage
    if (selectedPlacement?.openedAt) {
      setOpenedAt(selectedPlacement.openedAt);
      return;
    }
    const data = getOpenedData(userId);
    setOpenedAt(cellarId ? data[cellarId] ?? null : null);
  }, [userId, selectedSlotId, selectedPlacement?.cellarItemId, selectedPlacement?.openedAt]);

  useEffect(() => { loadOpenedState(); }, [loadOpenedState]);

  const handleMarkOpened = async () => {
    if (!userId || !selectedPlacement) return;
    const now = new Date().toISOString();
    // Persist to localStorage for fast 3D view access
    const data = getOpenedData(userId);
    data[selectedPlacement.cellarItemId] = now;
    setOpenedData(userId, data);
    setOpenedAt(now);
    // Persist to DB
    await fetch('/api/cellar', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedPlacement.cellarItemId, openedAt: now }),
    }).catch(() => {});
  };

  const handleUnmarkOpened = async () => {
    if (!userId || !selectedPlacement) return;
    const data = getOpenedData(userId);
    delete data[selectedPlacement.cellarItemId];
    setOpenedData(userId, data);
    setOpenedAt(null);
    // Persist to DB
    await fetch('/api/cellar', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedPlacement.cellarItemId, openedAt: null }),
    }).catch(() => {});
  };

  if (!selectedSlotId) return null;

  const placement = selectedPlacement;
  const pos = parseSlotId(selectedSlotId);
  const isEmpty = !placement;

  const handleDrink = async () => {
    if (!placement) return;
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      if (placement.quantity <= 1) {
        await fetch('/api/cellar', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: placement.cellarItemId, quantity: 0, consumedAt: now }),
        });
        unassignSlot(selectedSlotId);
        setSelectedSlotId(null);
      } else {
        await fetch('/api/cellar', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: placement.cellarItemId, quantity: placement.quantity - 1 }),
        });
      }
      await refreshCellar();
      trackCellar('slot_clicked', { filled: 'drink' });
    } catch (e) {
      console.error('Failed to drink bottle:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNote = async () => {
    if (!placement) return;
    setIsSaving(true);
    try {
      await fetch('/api/cellar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: placement.cellarItemId, notes: noteText.trim() || null }),
      });
      await refreshCellar();
      setMode('view');
    } catch (e) {
      console.error('Failed to save note:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveToSlot = (newSlotId: string) => {
    if (!newSlotId || !selectedSlotId) return;
    moveBottle(selectedSlotId, newSlotId);
    setSelectedSlotId(newSlotId);
    setShowMovePicker(false);
    setMode('view');
    trackCellar('bottle_moved');
  };

  const handleAskSommelier = () => {
    if (placement) {
      openSommelier('food-pairing');
    } else {
      openSommelier('cellar-context');
    }
    trackCellar('sommelier_opened_from_cellar');
  };

  return (
    <>
      <div className="w-[320px] flex-shrink-0 rounded-2xl bg-card shadow-soft p-4 space-y-4 self-start sticky top-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-heading text-foreground">
            {isEmpty ? t('slotEmpty') : t('slotDetails')}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            aria-label={t('close')}
            onClick={() => { setSelectedSlotId(null); setMode('view'); }}
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        </div>

        {pos && (
          <p className="text-caption text-muted-foreground">
            {t('slotPosition', { col: pos.col + 1, row: pos.row + 1 })}
            {pos.layer > 0 ? ` · ${t('slotLayer', { layer: pos.layer + 1 })}` : ''}
          </p>
        )}

        {isEmpty ? (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-center py-8">
              <div className="h-16 w-16 rounded-full bg-muted/60 flex items-center justify-center">
                <Wine className="h-8 w-8 text-muted-foreground/50" strokeWidth={1} />
              </div>
            </div>
            <p className="text-center text-sm text-muted-foreground">{t('slotEmptyHint')}</p>

            {unassignedPlacements.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{t('placeFromUnassigned')}</p>
                {unassignedPlacements.slice(0, 3).map((p) => (
                  <button
                    key={p.cellarItemId}
                    type="button"
                    onClick={() => {
                      assignSlot(p.cellarItemId, selectedSlotId);
                      trackCellar('bottle_added_to_slot');
                    }}
                    className="w-full flex items-center gap-2 rounded-lg bg-muted/30 p-2 text-start hover:bg-muted/60 transition-colors"
                  >
                    <div
                      className="flex h-8 w-6 items-center justify-center rounded flex-shrink-0"
                      style={{ backgroundColor: WINE_TYPE_COLORS[p.wineType] }}
                    >
                      <Wine className={cn('h-3 w-3', p.wineType === 'white' || p.wineType === 'sparkling' ? 'text-stone-600' : 'text-white/80')} strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground truncate">{p.wineName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{p.winery}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <Button
              className="w-full gap-1.5"
              size="sm"
              variant="outline"
              onClick={() => router.push('/search')}
            >
              <Wine className="h-3.5 w-3.5" strokeWidth={1.5} />
              {t('addWine')}
            </Button>
          </div>
        ) : mode === 'note' ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">{t('actionNote')}</p>
            <Input
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder={t('notesPlaceholder')}
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setMode('view')} disabled={isSaving}>
                {t('cancel')}
              </Button>
              <Button size="sm" className="flex-1 gap-1" onClick={handleSaveNote} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" strokeWidth={1.5} />}
                {t('save')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Wine card */}
            <div className="flex items-start gap-3">
              {placement.imageUrl ? (
                <div className="h-20 w-14 overflow-hidden rounded-xl bg-ivory-300 dark:bg-charcoal-700 flex-shrink-0">
                  <img src={placement.imageUrl} alt={placement.wineName} className="h-full w-full object-contain" />
                </div>
              ) : (
                <div
                  className="flex h-20 w-14 items-center justify-center rounded-xl flex-shrink-0"
                  style={{ backgroundColor: WINE_TYPE_COLORS[placement.wineType] }}
                >
                  <Wine className={cn('h-6 w-6', placement.wineType === 'white' || placement.wineType === 'sparkling' ? 'text-stone-600' : 'text-white/80')} strokeWidth={1.5} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground line-clamp-2">{placement.wineName}</p>
                <p className="text-xs text-muted-foreground">{placement.winery}</p>
                {placement.rating != null && (
                  <p className="text-xs text-copper-500 mt-0.5">★ {placement.rating.toFixed(1)}</p>
                )}
                {placement.readinessTag && (
                  <span className={cn(
                    'inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                    placement.readinessTag === 'ready' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                    placement.readinessTag === 'hold' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                    placement.readinessTag === 'past-peak' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                  )}>
                    {placement.readinessTag === 'ready' ? t('filterReady') : placement.readinessTag === 'hold' ? t('filterHold') : t('filterPastPeak')}
                  </span>
                )}
              </div>
            </div>

            {/* Drinking window */}
            {(placement.drinkFrom || placement.drinkUntil) && (
              <div className="rounded-lg bg-muted/30 px-3 py-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{t('drinkingWindow')}</p>
                <p className="text-xs text-foreground">
                  {placement.drinkFrom ? new Date(placement.drinkFrom).getFullYear() : '?'}
                  {' — '}
                  {placement.drinkUntil ? new Date(placement.drinkUntil).getFullYear() : '?'}
                </p>
              </div>
            )}

            {/* Opened indicator */}
            {openedAt && (() => {
              const maxDays = OPEN_WINE_DAYS[placement.wineType] ?? 5;
              const elapsed = Math.floor((Date.now() - new Date(openedAt).getTime()) / 86400000);
              const remaining = maxDays - elapsed;
              const isExpired = remaining <= 0;
              return (
                <div className={cn(
                  'rounded-lg px-3 py-2 flex items-center justify-between',
                  isExpired ? 'bg-red-50 dark:bg-red-950/30' : 'bg-amber-50 dark:bg-amber-950/30'
                )}>
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">{t('openedLabel')}</p>
                    <p className={cn('text-xs font-medium', isExpired ? 'text-red-600 dark:text-red-400' : 'text-amber-700 dark:text-amber-400')}>
                      {isExpired ? t('openedExpired') : t('openedTimeLeft', { days: remaining })}
                    </p>
                  </div>
                  <button type="button" onClick={handleUnmarkOpened} className="text-xs text-muted-foreground hover:text-foreground underline">
                    ✕
                  </button>
                </div>
              );
            })()}

            {/* Details */}
            <Card className="border-border/50">
              <CardContent className="p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('quantityLabel')}</span>
                  <span className="font-medium">{placement.quantity}</span>
                </div>
                {placement.purchasePrice != null && placement.purchasePrice > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('priceLabel')}</span>
                    <span className="font-medium">{formatCurrency(placement.purchasePrice)}</span>
                  </div>
                )}
                {(placement.region || placement.country) && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('regionLabel')}</span>
                    <span className="font-medium text-end">{[placement.region, placement.country].filter(Boolean).join(', ')}</span>
                  </div>
                )}
                {placement.notes && (
                  <p className="text-xs italic text-muted-foreground pt-1">{placement.notes}</p>
                )}
              </CardContent>
            </Card>

            {/* View Full Wine Card */}
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 text-xs border-bordeaux-200 dark:border-bordeaux-800"
              onClick={() => setWineCardPlacement(placement)}
            >
              <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
              {t('actionViewDetails')}
            </Button>

            {/* Quick Actions — all wired */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={handleDrink}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CircleCheck className="h-3.5 w-3.5" strokeWidth={1.5} />}
                {t('actionDrink')}
              </Button>
              {!openedAt && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400"
                  onClick={handleMarkOpened}
                >
                  <WineOff className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {t('actionMarkOpened')}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setShowMovePicker(true)}
              >
                <ArrowRightLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                {t('actionMove')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => { setNoteText(placement.notes || ''); setMode('note'); }}
              >
                <StickyNote className="h-3.5 w-3.5" strokeWidth={1.5} />
                {t('actionNote')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs border-garnet-500/30 text-garnet-600 dark:text-garnet-400"
                onClick={handleAskSommelier}
              >
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
                {t('actionAskSommelier')}
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-destructive hover:text-destructive"
              onClick={() => {
                unassignSlot(selectedSlotId);
                setSelectedSlotId(null);
                setMode('view');
              }}
            >
              <Trash2 className="h-3.5 w-3.5 me-1.5" strokeWidth={1.5} />
              {t('actionRemoveFromSlot')}
            </Button>
          </div>
        )}
      </div>

      {/* Move picker */}
      <LocationPickerModal
        open={showMovePicker}
        onClose={() => setShowMovePicker(false)}
        onSelectSlot={handleMoveToSlot}
        racks={racks}
        placementMap={placementMap}
      />
    </>
  );
}
