'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { Loader2, Plus, Wine } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CellarRackProvider, useCellarRack } from '@/lib/cellar/cellar-rack-context';
import { CellarHeader } from './cellar-header';
import { CellarTabs } from './cellar-tabs';
import { CellarSidebar } from './cellar-sidebar';
import { RackView } from './views/rack-view';
import { ListView } from './views/list-view';
import { InsightsView } from './views/insights-view';
import { SlotDetailPanel } from './slot-detail-panel';
import { SlotDetailSheet } from './slot-detail-sheet';
import { RackBuilderModal } from './rack-builder/rack-builder-modal';
import { MobileFilterSheet, CellarFiltersPanel } from './filters/cellar-filters';
import { CellarErrorBoundary } from './cellar-error-boundary';
import { trackCellar } from '@/lib/cellar/analytics';
import type { CellarItem } from '@/components/pages/cellar-page';
import type { WineData, ProfileMatchResult } from '@/lib/openai';

const WineCard = dynamic(() => import('@/components/wine-card').then((m) => m.WineCard), {
  loading: () => <div className="flex items-center justify-center py-12"><div className="h-10 w-10 animate-spin rounded-full border-2 border-bordeaux-200 border-t-bordeaux-500" /></div>,
});

interface NewCellarPageProps {
  userId: string;
  initialItems: CellarItem[];
}

function MobileInlineFilters() {
  const { unassignedPlacements } = useCellarRack();
  const t = useTranslations('cellar');

  return (
    <div className="rounded-2xl bg-card shadow-soft p-3 space-y-3">
      {unassignedPlacements.length > 0 && (
        <div className="rounded-lg bg-warning-muted/50 px-3 py-2 text-xs text-warning">
          {t('unassignedCount', { count: unassignedPlacements.length })}
        </div>
      )}
      <CellarFiltersPanel />
    </div>
  );
}

function MobileRackSelector() {
  const t = useTranslations('cellar');
  const { racks, activeRackId, setActiveRackId, setIsRackBuilderOpen, setEditingRack, allPlacements } = useCellarRack();
  const totalBottles = allPlacements.reduce((sum, p) => sum + p.quantity, 0);

  if (racks.length === 0) return null;

  return (
    <div className="lg:hidden">
      <div className="flex items-center gap-2 mb-2">
        <Wine className="h-4 w-4 text-garnet-600 dark:text-garnet-400 flex-shrink-0" strokeWidth={1.5} />
        <span className="text-xs text-muted-foreground">{totalBottles} {t('totalBottles')}</span>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {racks.map((rack) => (
          <button
            key={rack.id}
            type="button"
            onClick={() => setActiveRackId(rack.id)}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              activeRackId === rack.id
                ? 'bg-garnet-500/15 text-garnet-600 dark:text-garnet-400'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {rack.name} ({rack.columns}×{rack.rows})
          </button>
        ))}
        <button
          type="button"
          onClick={() => { setEditingRack(null); setIsRackBuilderOpen(true); }}
          className="flex-shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
        >
          <Plus className="h-3 w-3" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

function CellarContent() {
  const { activeTab, refreshCellar, selectedSlotId, wineCardPlacement, setWineCardPlacement, userId } = useCellarRack();
  const [cardWine, setCardWine] = useState<WineData | null>(null);
  const [cardMatch, setCardMatch] = useState<ProfileMatchResult | null>(null);
  const [isCardLoading, setIsCardLoading] = useState(false);
  const [isMatchLoading, setIsMatchLoading] = useState(false);

  const initialLoadRef = useRef(true);

  useEffect(() => {
    trackCellar('cellar_opened');
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
    } else {
      refreshCellar();
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refreshCellar();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', refreshCellar);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', refreshCellar);
    };
  }, [refreshCellar]);

  useEffect(() => {
    if (!wineCardPlacement) {
      setCardWine(null);
      setCardMatch(null);
      return;
    }

    let cancelled = false;
    setIsCardLoading(true);
    setIsMatchLoading(true);
    setCardWine(null);
    setCardMatch(null);

    fetch(`/api/cellar/${wineCardPlacement.cellarItemId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.wine) {
          setCardWine(data.wine);
          fetch('/api/wine-match', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wine: data.wine, userId }),
          })
            .then((r) => r.json())
            .then((d) => { if (!cancelled) setCardMatch(d.match ?? null); })
            .catch(() => {})
            .finally(() => { if (!cancelled) setIsMatchLoading(false); });
        } else {
          setIsMatchLoading(false);
        }
      })
      .catch(() => { setIsMatchLoading(false); })
      .finally(() => { if (!cancelled) setIsCardLoading(false); });

    return () => { cancelled = true; };
  }, [wineCardPlacement, userId]);

  return (
    <div className="animate-page py-6 md:py-8 lg:py-10">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <CellarHeader />

        {/* Mobile tabs */}
        <div className="mt-4 lg:mt-0 lg:hidden">
          <CellarTabs />
        </div>

        {/* Mobile rack selector + inline filters */}
        <div className="mt-3 lg:hidden space-y-3">
          <MobileRackSelector />
          <MobileInlineFilters />
        </div>

        {/* Desktop layout with sidebar */}
        <div className="mt-4 flex gap-6">
          <CellarSidebar />

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Desktop tabs inside main area */}
            <div className="hidden lg:block">
              <CellarTabs />
            </div>

            <div className="mt-4">
              {activeTab === 'rack' && <RackView />}
              {activeTab === 'list' && <ListView />}
              {activeTab === 'insights' && <InsightsView />}
            </div>
          </div>

          {/* Desktop detail panel */}
          {activeTab === 'rack' && selectedSlotId && (
            <div className="hidden xl:block">
              <SlotDetailPanel />
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom sheets */}
      <SlotDetailSheet />
      <RackBuilderModal />

      {/* Full Wine Card Dialog */}
      <Dialog
        open={!!wineCardPlacement}
        onOpenChange={(open) => { if (!open) setWineCardPlacement(null); }}
      >
        <DialogContent
          onClose={() => setWineCardPlacement(null)}
          className="max-w-lg max-h-[90vh] overflow-y-auto"
        >
          {isCardLoading && !cardWine ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : cardWine ? (
            <WineCard
              wine={cardWine}
              matchResult={cardMatch || undefined}
              matchLoading={isMatchLoading}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function NewCellarPage({ userId, initialItems }: NewCellarPageProps) {
  const t = useTranslations('cellar');
  return (
    <AppShell>
      <CellarErrorBoundary
        errorTitle={t('errorTitle')}
        fallbackMessage={t('errorDesc')}
        retryLabel={t('errorRetry')}
      >
        <CellarRackProvider userId={userId} initialItems={initialItems}>
          <CellarContent />
        </CellarRackProvider>
      </CellarErrorBoundary>
    </AppShell>
  );
}
