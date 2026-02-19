'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSommelier } from '../sommelier-context';
import { Loader2, UtensilsCrossed, Wine } from 'lucide-react';
import { safeId } from '@/lib/utils';

export function FoodPairing() {
  const t = useTranslations('sommelier');
  const { setActiveFlow, addConversationItem } = useSommelier();
  const [meal, setMeal] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ suggestions: Array<{ wine: string; reason: string }> } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meal.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/sommelier/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col pt-6 px-4">
      <h3 className="text-lg font-serif font-semibold text-foreground text-center mb-2">{t('pairingTitle')}</h3>
      <p className="text-sm text-muted-foreground text-center mb-6">{t('pairingSubtitle')}</p>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <UtensilsCrossed className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <input type="text" value={meal} onChange={e => setMeal(e.target.value)} placeholder={t('pairingPlaceholder')} className="flex-1 rounded-lg border border-border/60 bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <button type="submit" disabled={loading || !meal.trim()} className="w-full rounded-xl bg-bordeaux-600 px-4 py-3 text-sm font-semibold text-white hover:bg-bordeaux-700 disabled:opacity-40 transition-colors">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : t('findPairing')}
        </button>
      </form>

      {result && (
        <div className="space-y-3 animate-fade-in">
          {result.suggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-border/50 p-4">
              <Wine className="h-5 w-5 text-bordeaux-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold">{s.wine}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.reason}</p>
              </div>
            </div>
          ))}
          <button onClick={() => { addConversationItem({ id: safeId(), type: 'response', title: t('pairingResultTitle', { meal }), content: result.suggestions.map(s => s.wine).join(', '), created_at: new Date().toISOString() }); setActiveFlow(null); }} className="w-full rounded-xl border border-border px-4 py-3 text-sm font-semibold text-foreground hover:bg-accent transition-colors">
            {t('done')}
          </button>
        </div>
      )}
    </div>
  );
}
