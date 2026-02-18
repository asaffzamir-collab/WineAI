'use client';

import { useTranslations } from 'next-intl';
import { Thermometer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCellarRack } from '@/lib/cellar/cellar-rack-context';
import { trackCellar } from '@/lib/cellar/analytics';
import { cn } from '@/lib/utils';

export function HeatmapToggle() {
  const t = useTranslations('cellar');
  const { heatmapEnabled, setHeatmapEnabled } = useCellarRack();

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn(
        'gap-1.5 text-xs transition-all',
        heatmapEnabled && 'bg-garnet-500/10 border-garnet-500/30 text-garnet-600 dark:text-garnet-400',
      )}
      onClick={() => {
        setHeatmapEnabled(!heatmapEnabled);
        trackCellar('heatmap_toggled', { enabled: (!heatmapEnabled).toString() });
      }}
    >
      <Thermometer className="h-3.5 w-3.5" strokeWidth={1.5} />
      {t('heatmapToggle')}
    </Button>
  );
}
