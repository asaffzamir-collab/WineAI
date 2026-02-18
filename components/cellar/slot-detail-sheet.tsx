'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Wine, GlassWater, ArrowRightLeft, Trash2, StickyNote, Sparkles, Loader2, Check, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useCellarRack } from '@/lib/cellar/cellar-rack-context';
import { useSommelier } from '@/components/sommelier/sommelier-context';
import { WINE_TYPE_COLORS, parseSlotId } from '@/lib/cellar/types';
import { formatCurrency } from '@/lib/utils';
import { trackCellar } from '@/lib/cellar/analytics';
import { useMediaQuery } from '@/lib/use-media-query';
import { LocationPickerModal } from './location-picker/location-picker-modal';

type SheetMode = 'view' | 'note';

export function SlotDetailSheet() {
  const t = useTranslations('cellar');
  const router = useRouter();
  const {
    selectedSlotId, setSelectedSlotId, selectedPlacement,
    unassignSlot, moveBottle, assignSlot,
    racks, placementMap, unassignedPlacements,
    refreshCellar, setWineCardPlacement,
  } = useCellarRack();
  const { open: openSommelier } = useSommelier();
  const isDesktop = useMediaQuery('(min-width: 1280px)');

  const [mode, setMode] = useState<SheetMode>('view');
  const [noteText, setNoteText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showMovePicker, setShowMovePicker] = useState(false);

  const placement = selectedPlacement;
  const pos = selectedSlotId ? parseSlotId(selectedSlotId) : null;
  const isEmpty = !placement;

  const handleDrink = async () => {
    if (!placement) return;
    setIsSaving(true);
    try {
      if (placement.quantity <= 1) {
        await fetch(`/api/cellar?id=${placement.cellarItemId}`, { method: 'DELETE' });
        unassignSlot(selectedSlotId!);
        setSelectedSlotId(null);
      } else {
        await fetch('/api/cellar', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: placement.cellarItemId, quantity: placement.quantity - 1 }),
        });
      }
      await refreshCellar();
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
    trackCellar('bottle_moved');
  };

  return (
    <>
      <Sheet
        open={!!selectedSlotId && !isDesktop}
        onOpenChange={(open) => { if (!open) { setSelectedSlotId(null); setMode('view'); } }}
      >
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
          <div className="flex justify-center py-2 mb-2">
            <div className="h-1.5 w-12 rounded-full bg-muted" />
          </div>

          {pos && (
            <p className="text-caption text-muted-foreground mb-2">
              {t('slotPosition', { col: pos.col + 1, row: pos.row + 1 })}
              {pos.layer > 0 ? ` · ${t('slotLayer', { layer: pos.layer + 1 })}` : ''}
            </p>
          )}

          {isEmpty ? (
            <div className="space-y-4 pb-4">
              <div className="flex items-center justify-center py-6">
                <div className="h-16 w-16 rounded-full bg-muted/60 flex items-center justify-center">
                  <Wine className="h-8 w-8 text-muted-foreground/50" strokeWidth={1} />
                </div>
              </div>
              <p className="text-center text-sm text-muted-foreground">{t('slotEmptyHint')}</p>

              {unassignedPlacements.length > 0 && selectedSlotId && (
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

              <Button className="w-full gap-1.5" size="sm" variant="outline" onClick={() => router.push('/search')}>
                <Wine className="h-3.5 w-3.5" strokeWidth={1.5} />
                {t('addWine')}
              </Button>
            </div>
          ) : mode === 'note' ? (
            <div className="space-y-3 pb-4">
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
            <div className="space-y-4 pb-4">
              {/* Wine info */}
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
                  {placement.rating != null && <p className="text-xs text-copper-500 mt-0.5">★ {placement.rating.toFixed(1)}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    {placement.readinessTag && (
                      <span className={cn(
                        'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                        placement.readinessTag === 'ready' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                        placement.readinessTag === 'hold' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                        placement.readinessTag === 'past-peak' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                      )}>
                        {placement.readinessTag === 'ready' ? t('filterReady') : placement.readinessTag === 'hold' ? t('filterHold') : t('filterPastPeak')}
                      </span>
                    )}
                    {placement.purchasePrice != null && placement.purchasePrice > 0 && (
                      <span className="text-xs text-muted-foreground">{formatCurrency(placement.purchasePrice)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-bordeaux-50 px-2 py-0.5 dark:bg-bordeaux-900/30 flex-shrink-0">
                  <Wine className="h-3 w-3 text-bordeaux-500 dark:text-bordeaux-300" strokeWidth={1.5} />
                  <span className="text-xs font-semibold text-primary">{placement.quantity}</span>
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

              {/* Notes */}
              {placement.notes && (
                <p className="text-xs italic text-muted-foreground px-1">{placement.notes}</p>
              )}

              {/* View Full Wine Card */}
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5 text-xs border-bordeaux-200 dark:border-bordeaux-800"
                onClick={() => { setWineCardPlacement(placement); setSelectedSlotId(null); }}
              >
                <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                {t('actionViewDetails')}
              </Button>

              {/* Horizontal quick actions — all wired */}
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-shrink-0" onClick={handleDrink} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GlassWater className="h-3.5 w-3.5" strokeWidth={1.5} />}
                  {t('actionDrink')}
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-shrink-0" onClick={() => setShowMovePicker(true)}>
                  <ArrowRightLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {t('actionMove')}
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-shrink-0" onClick={() => { setNoteText(placement.notes || ''); setMode('note'); }}>
                  <StickyNote className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {t('actionNote')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs flex-shrink-0 border-garnet-500/30 text-garnet-600 dark:text-garnet-400"
                  onClick={() => { openSommelier('food-pairing'); trackCellar('sommelier_opened_from_cellar'); }}
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
                  if (selectedSlotId) unassignSlot(selectedSlotId);
                  setSelectedSlotId(null);
                  setMode('view');
                }}
              >
                <Trash2 className="h-3.5 w-3.5 me-1.5" strokeWidth={1.5} />
                {t('actionRemoveFromSlot')}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

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
