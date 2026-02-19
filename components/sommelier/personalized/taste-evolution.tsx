'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSommelier } from '../sommelier-context';
import { RadarChart } from '../radar-chart';
import { Loader2, TrendingUp } from 'lucide-react';

export function TasteEvolution() {
  const t = useTranslations('sommelier');
  const { setActiveFlow } = useSommelier();
  const [data, setData] = useState<{ current: { body: number; tannin: number; sweetness: number; acidity: number }; insight: string; trends: string[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvolution = async () => {
      try {
        const res = await fetch('/api/sommelier/evolution');
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    fetchEvolution();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <Loader2 className="h-8 w-8 animate-spin text-bordeaux-500 mb-4" />
        <p className="text-sm text-muted-foreground">{t('loadingEvolution')}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center pt-12 px-4">
        <p className="text-sm text-muted-foreground text-center">{t('noEvolutionData')}</p>
        <button onClick={() => setActiveFlow(null)} className="mt-4 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-bordeaux-50 dark:hover:bg-bordeaux-900/20 transition-colors">{t('goBack')}</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center pt-6 px-4">
      <TrendingUp className="h-6 w-6 text-bordeaux-500 mb-2" />
      <h3 className="text-lg font-serif font-semibold text-foreground text-center mb-1">{t('evolutionTitle')}</h3>
      <p className="text-xs text-muted-foreground text-center mb-4">{t('evolutionSubtitle')}</p>

      <RadarChart values={data.current} size={180} />

      {data.trends.length > 0 && (
        <div className="w-full mt-4 space-y-2">
          {data.trends.map((trend, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-bordeaux-400 flex-shrink-0" />
              {trend}
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground leading-relaxed text-center mt-4">{data.insight}</p>

      <button onClick={() => setActiveFlow(null)} className="mt-6 w-full rounded-xl bg-bordeaux-600 px-4 py-3 text-sm font-semibold text-white hover:bg-bordeaux-700 transition-colors">
        {t('done')}
      </button>
    </div>
  );
}
