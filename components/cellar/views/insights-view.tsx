'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Wine, Clock, AlertTriangle, Sparkles, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useCellarRack } from '@/lib/cellar/cellar-rack-context';
import { useSommelier } from '@/components/sommelier/sommelier-context';
import { WINE_TYPE_COLORS } from '@/lib/cellar/types';
import type { Placement, WineCategory } from '@/lib/cellar/types';
import { formatCurrency } from '@/lib/utils';

function StatCard({ icon: Icon, label, value, accent }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent || 'bg-muted'}`}>
          <Icon className="h-5 w-5 text-foreground/70" strokeWidth={1.5} />
        </div>
        <div>
          <p className="heading-serif text-lg text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TypeDistribution({ placements }: { placements: Placement[] }) {
  const t = useTranslations('cellar');
  const distribution = useMemo(() => {
    const counts: Record<WineCategory, number> = { red: 0, white: 0, rose: 0, sparkling: 0, other: 0 };
    for (const p of placements) {
      counts[p.wineType] = (counts[p.wineType] || 0) + p.quantity;
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => ({
        type: type as WineCategory,
        count,
        percent: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [placements]);

  const typeLabels: Record<string, string> = {
    red: t('typeRed'),
    white: t('typeWhite'),
    rose: t('typeRose'),
    sparkling: t('typeSparkling'),
    other: t('typeOther'),
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{t('insightsDistribution')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {distribution.map(({ type, count, percent }) => (
          <div key={type} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: WINE_TYPE_COLORS[type] }}
            />
            <span className="text-sm text-foreground flex-1">{typeLabels[type] || type}</span>
            <span className="text-xs text-muted-foreground">{count}</span>
            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${percent}%`, backgroundColor: WINE_TYPE_COLORS[type] }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function InsightsView() {
  const t = useTranslations('cellar');
  const { allPlacements, activeRack, unassignedPlacements } = useCellarRack();
  const { open: openSommelier } = useSommelier();

  const { ready, hold, pastPeak } = useMemo(() => {
    const r: Placement[] = [];
    const h: Placement[] = [];
    const pp: Placement[] = [];
    for (const p of allPlacements) {
      if (p.readinessTag === 'ready') r.push(p);
      else if (p.readinessTag === 'past-peak') pp.push(p);
      else h.push(p);
    }
    return { ready: r, hold: h, pastPeak: pp };
  }, [allPlacements]);

  const totalBottles = allPlacements.reduce((s, p) => s + p.quantity, 0);
  const totalValue = allPlacements.reduce((s, p) => s + (p.purchasePrice ?? 0) * p.quantity, 0);
  const emptySlots = activeRack
    ? activeRack.columns * activeRack.rows * activeRack.depth - allPlacements.filter((p) => p.slotId).length
    : 0;

  if (allPlacements.length === 0) {
    return (
      <EmptyState
        icon={Wine}
        title={t('empty')}
        description={t('emptyDescription')}
        actionLabel={t('addWine')}
        actionHref="/search"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Wine} label={t('totalBottles')} value={totalBottles} accent="bg-garnet-500/10" />
        <StatCard icon={TrendingUp} label={t('totalValue')} value={formatCurrency(totalValue)} accent="bg-copper-100 dark:bg-copper-700/20" />
        <StatCard icon={Clock} label={t('insightsReady')} value={ready.length} accent="bg-green-100 dark:bg-green-900/20" />
        <StatCard icon={AlertTriangle} label={t('insightsPastPeak')} value={pastPeak.length} accent="bg-red-100 dark:bg-red-900/20" />
      </div>

      {/* Distribution */}
      <TypeDistribution placements={allPlacements} />

      {/* Past Peak Warning */}
      {pastPeak.length > 0 && (
        <Card className="border-red-200 dark:border-red-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" strokeWidth={1.5} />
              {t('insightsPastPeakTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {pastPeak.slice(0, 5).map((p) => (
                <li key={p.cellarItemId} className="text-sm text-muted-foreground">
                  {p.wineName} — {p.winery}
                </li>
              ))}
              {pastPeak.length > 5 && (
                <li className="text-xs text-muted-foreground">+{pastPeak.length - 5} more</li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Ready to Drink */}
      {ready.length > 0 && (
        <Card className="border-green-200 dark:border-green-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-green-600 dark:text-green-400">
              <Clock className="h-4 w-4" strokeWidth={1.5} />
              {t('insightsReadyTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {ready.slice(0, 5).map((p) => (
                <li key={p.cellarItemId} className="text-sm text-muted-foreground">
                  {p.wineName} — {p.winery}
                </li>
              ))}
              {ready.length > 5 && (
                <li className="text-xs text-muted-foreground">+{ready.length - 5} more</li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Fill My Rack CTA */}
      {emptySlots > 0 && emptySlots > (activeRack ? activeRack.columns * activeRack.rows * 0.3 : 0) && (
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{t('insightsFillRack')}</p>
              <p className="text-xs text-muted-foreground">
                {t('insightsFillRackDesc', { count: emptySlots })}
              </p>
            </div>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => openSommelier('fill-rack')}
            >
              <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
              {t('insightsFillRackCta')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
