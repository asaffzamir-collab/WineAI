'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSommelier } from '../sommelier-context';
import { Loader2, Wine, Heart } from 'lucide-react';
import { ConfidenceBadge } from '../confidence-badge';

interface DiscoveredWine {
  name: string;
  region: string;
  grape: string;
  match: number;
  reason: string;
}

export function WineDiscovery() {
  const t = useTranslations('sommelier');
  const { setActiveFlow, addConversationItem } = useSommelier();
  const [wines, setWines] = useState<DiscoveredWine[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const discover = async () => {
      try {
        const res = await fetch('/api/sommelier/discover-wines', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
        if (res.ok) {
          const data = await res.json();
          setWines(data.wines);
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    discover();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <Loader2 className="h-8 w-8 animate-spin text-bordeaux-500 mb-4" />
        <p className="text-sm text-muted-foreground">{t('discoveringWines')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col pt-6 px-4">
      <h3 className="text-lg font-serif font-semibold text-foreground text-center mb-2">{t('discoveryTitle')}</h3>
      <p className="text-sm text-muted-foreground text-center mb-6">{t('discoverySubtitle')}</p>

      <div className="space-y-3">
        {wines?.map((wine, i) => (
          <div key={i} className="rounded-xl border border-border/50 p-4 animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-3">
                <Wine className="h-5 w-5 text-bordeaux-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold">{wine.name}</p>
                  <p className="text-xs text-muted-foreground">{wine.grape} · {wine.region}</p>
                  <p className="text-xs text-muted-foreground mt-1">{wine.reason}</p>
                </div>
              </div>
              <span className="text-sm font-bold text-bordeaux-600">{wine.match}%</span>
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => setActiveFlow(null)} className="mt-6 w-full rounded-xl bg-bordeaux-600 px-4 py-3 text-sm font-semibold text-white hover:bg-bordeaux-700 transition-colors">
        {t('done')}
      </button>
    </div>
  );
}
