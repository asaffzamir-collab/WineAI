'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSommelier } from '../sommelier-context';
import { cn, safeId } from '@/lib/utils';
import { Loader2, Wine } from 'lucide-react';

interface GameWine {
  id: string;
  name: string;
  description: string;
  region: string;
}

export function PalateGame() {
  const t = useTranslations('sommelier');
  const { setActiveFlow, addConversationItem } = useSommelier();
  const [wines, setWines] = useState<GameWine[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);

  useEffect(() => {
    const fetch3Wines = async () => {
      try {
        const res = await fetch('/api/sommelier/palate-game', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'generate' }) });
        if (res.ok) {
          const data = await res.json();
          setWines(data.wines);
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    fetch3Wines();
  }, []);

  const handleSelect = async (wineId: string) => {
    setSelected(wineId);
    try {
      const res = await fetch('/api/sommelier/palate-game', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'choose', wineId }) });
      if (res.ok) {
        const data = await res.json();
        setExplanation(data.explanation);
        addConversationItem({
          id: safeId(),
          type: 'insight',
          title: t('palateGameResult'),
          content: data.explanation,
          created_at: new Date().toISOString(),
        });
      }
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-bordeaux-500 mb-4" />
        <p className="text-sm text-muted-foreground">{t('loadingGame')}</p>
      </div>
    );
  }

  if (explanation) {
    return (
      <div className="flex flex-col items-center pt-8 px-4">
        <h3 className="text-lg font-serif font-semibold text-foreground text-center mb-4">{t('palateGameInsight')}</h3>
        <p className="text-sm text-muted-foreground text-center leading-relaxed mb-8">{explanation}</p>
        <button onClick={() => setActiveFlow(null)} className="rounded-xl bg-bordeaux-600 px-6 py-3 text-sm font-semibold text-white hover:bg-bordeaux-700 transition-colors">
          {t('done')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col pt-6 px-4">
      <h3 className="text-lg font-serif font-semibold text-foreground text-center mb-2">{t('palateGameTitle')}</h3>
      <p className="text-sm text-muted-foreground text-center mb-6">{t('palateGameSubtitle')}</p>

      <div className="space-y-3">
        {wines?.map(wine => (
          <button
            key={wine.id}
            onClick={() => handleSelect(wine.id)}
            disabled={!!selected}
            className={cn(
              'w-full flex items-start gap-3 rounded-xl border-2 p-4 text-start transition-all',
              selected === wine.id ? 'border-bordeaux-500 bg-bordeaux-50/50 dark:bg-bordeaux-900/20' : 'border-border/50 hover:border-border',
              selected && selected !== wine.id && 'opacity-40'
            )}
          >
            <Wine className="h-5 w-5 text-bordeaux-400 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-semibold">{wine.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{wine.description}</p>
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">{wine.region}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
