'use client';

import { X, Wine } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSommelier } from '../sommelier-context';
import { cn } from '@/lib/utils';

const PHASE_BADGE: Record<string, { label: string; className: string }> = {
  discovery: { label: 'Discovery', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  learning: { label: 'Learning', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  personalization: { label: 'Personalized', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
};

export function PanelHeader() {
  const { close, phase, activeFlow, setActiveFlow } = useSommelier();
  const t = useTranslations('sommelier');
  const badge = PHASE_BADGE[phase];

  return (
    <div className="flex h-16 items-center gap-3 border-b border-border/50 px-4 flex-shrink-0">
      {activeFlow ? (
        <button
          onClick={() => setActiveFlow(null)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Back"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
        </button>
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-bordeaux-100 dark:bg-bordeaux-900/30">
          <Wine className="h-4 w-4 text-bordeaux-600 dark:text-bordeaux-300" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-semibold text-foreground truncate">{t('panelTitle')}</h2>
      </div>

      {!activeFlow && badge && (
        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', badge.className)}>
          {t(`phase_${phase}`)}
        </span>
      )}

      <button
        onClick={close}
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
