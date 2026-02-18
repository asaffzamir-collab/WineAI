'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSommelier } from '../sommelier-context';
import { cn } from '@/lib/utils';
import { Loader2, Search, ShoppingBag, AlertTriangle } from 'lucide-react';
import { ConfidenceBadge } from '../confidence-badge';

export function BuyingIntelligence() {
  const t = useTranslations('sommelier');
  const { setActiveFlow, addConversationItem } = useSommelier();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    match: number; explanation: string; alternative?: string;
    overlap_warning?: string; confidence: 'high' | 'medium' | 'early_learning';
  } | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/sommelier/buying-intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wine_query: query }),
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
      <h3 className="text-lg font-serif font-semibold text-foreground text-center mb-2">{t('buyingTitle')}</h3>
      <p className="text-sm text-muted-foreground text-center mb-6">{t('buyingSubtitle')}</p>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('buyingPlaceholder')}
            className="w-full rounded-lg border border-border/60 bg-background ps-9 pe-3 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <button type="submit" disabled={loading || !query.trim()} className="rounded-lg bg-bordeaux-600 px-4 py-2 text-sm font-medium text-white hover:bg-bordeaux-700 disabled:opacity-40 transition-colors">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('analyze')}
        </button>
      </form>

      {result && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white', result.match >= 70 ? 'bg-emerald-500' : result.match >= 40 ? 'bg-amber-500' : 'bg-ruby-400')}>
                {result.match}%
              </div>
              <div>
                <p className="text-sm font-semibold">{t('matchScore')}</p>
                <ConfidenceBadge level={result.confidence} />
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">{result.explanation}</p>

          {result.overlap_warning && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 p-3 border border-amber-200/50 dark:border-amber-800/30">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-300">{result.overlap_warning}</p>
            </div>
          )}

          {result.alternative && (
            <div className="rounded-lg border border-border/50 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">{t('betterAlternative')}</p>
              <p className="text-sm font-medium">{result.alternative}</p>
            </div>
          )}

          <button
            onClick={() => {
              addConversationItem({
                id: crypto.randomUUID(),
                type: 'response',
                title: `${query} — ${result.match}%`,
                content: result.explanation,
                confidence: result.confidence,
                created_at: new Date().toISOString(),
              });
              setActiveFlow(null);
            }}
            className="w-full rounded-xl bg-bordeaux-600 px-4 py-3 text-sm font-semibold text-white hover:bg-bordeaux-700 transition-colors"
          >
            {t('done')}
          </button>
        </div>
      )}
    </div>
  );
}
