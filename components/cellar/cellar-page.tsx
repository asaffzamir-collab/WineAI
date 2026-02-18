'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { AppShell } from '@/components/app-shell';
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

interface NewCellarPageProps {
  userId: string;
  initialItems: CellarItem[];
}

function CellarContent() {
  const { activeTab, refreshCellar, selectedSlotId } = useCellarRack();

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
