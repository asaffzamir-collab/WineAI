'use client';

import { useTranslations } from 'next-intl';
import { Settings2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCellarRack } from '@/lib/cellar/cellar-rack-context';
import { useSommelier } from '@/components/sommelier/sommelier-context';
import { HeatmapToggle } from '@/components/cellar/rack/readiness-overlay';
import { trackCellar } from '@/lib/cellar/analytics';

export function CellarHeader() {
  const t = useTranslations('cellar');
  const {
    activeRack,
    setIsRackBuilderOpen,
    setEditingRack,
    activeTab,
  } = useCellarRack();
  const { open: openSommelier } = useSommelier();

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-title text-foreground truncate">{t('title')}</h1>
        {activeRack && activeTab === 'rack' && (
          <p className="text-small text-muted-foreground truncate">{activeRack.name}</p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {activeTab === 'rack' && (
          <>
            <HeatmapToggle />
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => {
                setEditingRack(activeRack);
                setIsRackBuilderOpen(true);
                trackCellar('rack_builder_opened');
              }}
              title={t('editRack')}
            >
              <Settings2 className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          </>
        )}

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs border-garnet-500/30 text-garnet-600 hover:bg-garnet-500/10 dark:text-garnet-400 dark:border-garnet-400/30"
          onClick={() => {
            openSommelier('cellar-context');
            trackCellar('sommelier_opened_from_cellar');
          }}
        >
          <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span className="hidden sm:inline">{t('askSommelier')}</span>
        </Button>
      </div>
    </div>
  );
}
