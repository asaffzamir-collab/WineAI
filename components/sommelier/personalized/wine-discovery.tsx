'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSommelier } from '../sommelier-context';
import { Loader2, Wine, Heart, ChevronDown, ChevronUp, MapPin, Grape } from 'lucide-react';

interface DiscoveredWine {
  name: string;
  winery?: string;
  region: string;
  grape: string;
  wine_type?: string;
  country?: string;
  match: number;
  reason: string;
  tasting_note?: string;
}

export function WineDiscovery() {
  const t = useTranslations('sommelier');
  const { setActiveFlow } = useSommelier();
  const [wines, setWines] = useState<DiscoveredWine[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [wishlistAdded, setWishlistAdded] = useState<Set<number>>(new Set());

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

  const handleAddToWishlist = async (wine: DiscoveredWine, index: number) => {
    if (wishlistAdded.has(index)) return;
    try {
      await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wine: {
            name: wine.name,
            winery: wine.winery || '',
            wine_type: wine.wine_type || 'red',
            country: wine.country || 'Israel',
            region: wine.region,
            grapes: wine.grape ? [wine.grape] : [],
          },
        }),
      });
      setWishlistAdded(prev => new Set(prev).add(index));
    } catch { /* ignore */ }
  };

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
        {wines?.map((wine, i) => {
          const isExpanded = expandedIndex === i;
          const isAdded = wishlistAdded.has(i);

          return (
            <div
              key={i}
              className="rounded-xl border border-border/50 bg-card overflow-hidden animate-fade-in transition-all"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <button
                onClick={() => setExpandedIndex(isExpanded ? null : i)}
                className="w-full text-start p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-bordeaux-50 dark:bg-bordeaux-900/20">
                      <Wine className="h-5 w-5 text-bordeaux-500" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{wine.name}</p>
                      {wine.winery && (
                        <p className="text-xs text-muted-foreground truncate">{wine.winery}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {wine.grape && (
                          <span className="flex items-center gap-1">
                            <Grape className="h-3 w-3" />
                            {wine.grape}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {wine.region}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="rounded-full bg-bordeaux-50 dark:bg-bordeaux-900/30 px-2.5 py-1 text-xs font-bold text-bordeaux-600 dark:text-bordeaux-300">
                      {wine.match}%
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-border/30 pt-3 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                  <p className="text-xs text-muted-foreground leading-relaxed">{wine.reason}</p>
                  {wine.tasting_note && (
                    <p className="text-xs text-foreground mt-2 italic">"{wine.tasting_note}"</p>
                  )}
                  {wine.country && (
                    <p className="text-[11px] text-muted-foreground mt-2">{wine.country}</p>
                  )}
                  <button
                    onClick={() => handleAddToWishlist(wine, i)}
                    disabled={isAdded}
                    className="mt-3 flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-60"
                  >
                    <Heart className={`h-3.5 w-3.5 ${isAdded ? 'fill-ruby-500 text-ruby-500' : ''}`} strokeWidth={1.5} />
                    {isAdded ? t('addedToWishlist') : t('addToWishlist')}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={() => setActiveFlow(null)} className="mt-6 w-full rounded-xl bg-bordeaux-600 px-4 py-3 text-sm font-semibold text-white hover:bg-bordeaux-700 transition-colors">
        {t('done')}
      </button>
    </div>
  );
}
