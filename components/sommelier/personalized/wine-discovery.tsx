'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useSommelier } from '../sommelier-context';
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { AddToCellarDialog } from '@/components/add-to-cellar-dialog';
import { invalidateAllMatchCaches, setCachedMatch } from '@/lib/match-cache';
import type { WineData, ProfileMatchResult, TasteSpectrum } from '@/lib/openai';

const WineCard = dynamic(
  () => import('@/components/wine-card').then((m) => m.WineCard),
  { loading: () => <div className="flex items-center justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-bordeaux-500" /></div> }
);

interface DiscoveredWine {
  name: string;
  winery?: string;
  region?: string;
  grape?: string;
  wine_type?: string;
  country?: string;
  match?: number;
  reason?: string;
  tasting_note?: string;
  image_url?: string;
  food_pairings?: string[];
  positive_matches?: string[];
  mismatches?: string[];
  wine_spectrum?: TasteSpectrum;
  profile_spectrum?: TasteSpectrum;
  vivino_rating?: number;
  vivino_reviews?: number;
  alcohol?: string;
  tasting_notes?: { nose?: string[]; palate?: string[]; finish?: string };
  serving?: { drink_from?: number; drink_until?: number; decant_minutes?: number; temperature_celsius?: number };
  why_drink_it?: string;
  similar_wines_note?: string;
}

function discoveredToWineData(w: DiscoveredWine): WineData {
  return {
    name: w.name,
    winery: w.winery || '',
    wine_type: (w.wine_type as WineData['wine_type']) || 'red',
    country: w.country || 'Israel',
    region: w.region,
    grapes: w.grape ? [w.grape] : [],
    vivino_rating: w.vivino_rating,
    vivino_reviews: w.vivino_reviews,
    alcohol: w.alcohol ? Number(w.alcohol) : undefined,
    winery_description: w.reason,
    tasting_notes: w.tasting_notes
      ? { nose: w.tasting_notes.nose || [], palate: w.tasting_notes.palate || [], finish: w.tasting_notes.finish || '' }
      : w.tasting_note ? { nose: [], palate: [], finish: w.tasting_note } : undefined,
    serving: w.serving ? {
      drink_from: w.serving.drink_from,
      drink_until: w.serving.drink_until,
      decant_minutes: w.serving.decant_minutes,
      temperature_celsius: w.serving.temperature_celsius != null ? String(w.serving.temperature_celsius) : undefined,
    } : undefined,
    food_pairings: w.food_pairings,
    taste_spectrum: w.wine_spectrum,
    ...(w.image_url ? { image_url: w.image_url } : {}),
  };
}

function discoveredToMatchResult(w: DiscoveredWine): ProfileMatchResult | undefined {
  if (w.match == null) return undefined;
  return {
    match_percentage: w.match,
    explanation: w.reason,
    positive_matches: w.positive_matches || [],
    mismatches: w.mismatches || [],
    wine_spectrum: w.wine_spectrum,
    profile_spectrum: w.profile_spectrum,
    why_drink_it: w.why_drink_it,
    similar_wines_note: w.similar_wines_note,
  };
}

export function WineDiscovery() {
  const t = useTranslations('sommelier');
  const { setActiveFlow, userId, refreshState, lastDiscoveryWines, setLastDiscoveryWines } = useSommelier();
  const [wines, setWines] = useState<DiscoveredWine[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [addToCellarWine, setAddToCellarWine] = useState<WineData | null>(null);
  const [actionStates, setActionStates] = useState<Record<number, { cellar?: boolean; wishlist?: boolean; profile?: boolean }>>({});

  const cacheAndSetWines = useCallback((wineList: DiscoveredWine[]) => {
    setWines(wineList);
    setLastDiscoveryWines(wineList);
    if (userId) {
      for (const w of wineList) {
        const matchResult = discoveredToMatchResult(w);
        if (matchResult) {
          setCachedMatch(userId, discoveredToWineData(w), matchResult);
        }
      }
    }
  }, [userId, setLastDiscoveryWines]);

  const discover = useCallback(async () => {
    setError(false);
    setLoading(true);
    setWines(null);
    try {
      const res = await fetch('/api/sommelier/discover-wines', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.wines) && data.wines.length > 0) {
          cacheAndSetWines(data.wines);
        } else {
          setError(true);
        }
      } else {
        setError(true);
      }
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [cacheAndSetWines]);

  useEffect(() => {
    if (lastDiscoveryWines && lastDiscoveryWines.length > 0) {
      setWines(lastDiscoveryWines as DiscoveredWine[]);
      setLoading(false);
    } else {
      discover();
    }
  }, []);

  const handleAddToWishlist = async (index: number) => {
    if (!wines || !userId || actionStates[index]?.wishlist) return;
    const wine = wines[index];
    setActionStates((prev) => ({ ...prev, [index]: { ...prev[index], wishlist: true } }));
    try {
      const fullWine = discoveredToWineData(wine);
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, wine: fullWine }),
      });
      if (!res.ok) setActionStates((prev) => ({ ...prev, [index]: { ...prev[index], wishlist: false } }));
    } catch { setActionStates((prev) => ({ ...prev, [index]: { ...prev[index], wishlist: false } })); }
  };

  const handleAddToProfile = async (index: number) => {
    if (!wines || !userId || actionStates[index]?.profile) return;
    const wine = wines[index];
    setActionStates((prev) => ({ ...prev, [index]: { ...prev[index], profile: true } }));
    try {
      const res = await fetch('/api/profile/add-wine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          wine: {
            name: wine.name,
            winery: wine.winery || '',
            wine_type: wine.wine_type || 'red',
            country: wine.country || 'Israel',
            region: wine.region,
            grapes: wine.grape ? [wine.grape] : [],
            image_url: wine.image_url || undefined,
          },
          liked: true,
        }),
      });
      if (res.ok) {
        await refreshState();
        invalidateAllMatchCaches(userId);
      } else {
        setActionStates((prev) => ({ ...prev, [index]: { ...prev[index], profile: false } }));
      }
    } catch { setActionStates((prev) => ({ ...prev, [index]: { ...prev[index], profile: false } })); }
  };

  const handleAddToCellar = (index: number) => {
    if (!wines) return;
    setAddToCellarWine(discoveredToWineData(wines[index]));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <Loader2 className="h-8 w-8 animate-spin text-bordeaux-500 mb-4" />
        <p className="text-sm text-muted-foreground">{t('discoveringWines')}</p>
      </div>
    );
  }

  if (error || !wines || wines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <AlertCircle className="h-8 w-8 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground text-center mb-2">{t('discoveryError')}</p>
        <div className="flex gap-3 mt-4">
          <button
            onClick={discover}
            className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-bordeaux-50 dark:hover:bg-bordeaux-900/20 transition-colors"
          >
            {t('tryAgain')}
          </button>
          <button onClick={() => setActiveFlow(null)} className="rounded-xl bg-bordeaux-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-bordeaux-700 transition-colors">
            {t('goBack')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col pt-4 px-4 pb-6">
      <button
        onClick={() => setActiveFlow(null)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('back')}
      </button>

      <h3 className="text-lg font-serif font-semibold text-foreground text-center mb-2">{t('discoveryTitle')}</h3>
      <p className="text-sm text-muted-foreground text-center mb-6">{t('discoverySubtitle')}</p>

      <div className="space-y-4">
        {wines.map((wine, i) => (
          <div key={i} className="animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
            <WineCard
              wine={discoveredToWineData(wine)}
              matchResult={discoveredToMatchResult(wine)}
              onAddToCellar={() => handleAddToCellar(i)}
              onAddToWishlist={() => handleAddToWishlist(i)}
              onAddToProfile={() => handleAddToProfile(i)}
              isAddingToCellar={!!actionStates[i]?.cellar}
              isAddingToWishlist={!!actionStates[i]?.wishlist}
              isAddingToProfile={!!actionStates[i]?.profile}
            />
          </div>
        ))}
      </div>

      <button onClick={() => setActiveFlow(null)} className="mt-6 w-full rounded-xl bg-bordeaux-600 px-4 py-3 text-sm font-semibold text-white hover:bg-bordeaux-700 transition-colors">
        {t('done')}
      </button>

      {userId && (
        <AddToCellarDialog
          wine={addToCellarWine}
          userId={userId}
          onClose={() => setAddToCellarWine(null)}
          onAdded={() => setAddToCellarWine(null)}
        />
      )}
    </div>
  );
}
