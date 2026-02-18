'use client';

import { useTranslations } from 'next-intl';
import { LayoutGrid, List, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCellarRack } from '@/lib/cellar/cellar-rack-context';

const tabs = [
  { id: 'rack' as const, icon: LayoutGrid, labelKey: 'tabRack' },
  { id: 'list' as const, icon: List, labelKey: 'tabList' },
  { id: 'insights' as const, icon: BarChart3, labelKey: 'tabInsights' },
];

export function CellarTabs() {
  const t = useTranslations('cellar');
  const { activeTab, setActiveTab } = useCellarRack();

  return (
    <div role="tablist" className="flex rounded-xl bg-muted/60 p-1 gap-1">
      {tabs.map(({ id, icon: Icon, labelKey }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={activeTab === id}
          onClick={() => setActiveTab(id)}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
            activeTab === id
              ? 'bg-background text-foreground shadow-soft'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={1.5} />
          <span>{t(labelKey)}</span>
        </button>
      ))}
    </div>
  );
}
