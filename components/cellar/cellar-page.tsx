'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
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
import { MobileFilterSheet } from './filters/cellar-filters';
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

function CellarContent() {
  const { activeTab, refreshCellar, selectedSlotId, wineCardPlacement, setWineCardPlacement, userId } = useCellarRack();
  const [cardWine, setCardWine] = useState<WineData | null>(null);
  const [cardMatch, setCardMatch] = useState<ProfileMatchResult | null>(null);
  const [isCardLoading, setIsCardLoading] = useState(false);
  const [isMatchLoading, setIsMatchLoading] = useState(false);

  useEffect(() => {
    trackCellar('cellar_opened');
    refreshCellar();
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
      <MobileFilterSheet />
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
