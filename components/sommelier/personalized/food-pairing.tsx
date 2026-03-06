'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useSommelier } from '../sommelier-context';
import { Loader2, UtensilsCrossed, ArrowLeft, AlertCircle } from 'lucide-react';
import { AddToCellarDialog } from '@/components/add-to-cellar-dialog';
import { setCachedMatch } from '@/lib/match-cache';
import type { WineData, ProfileMatchResult, TasteSpectrum } from '@/lib/openai';

const WineCard = dynamic(
  () => import('@/components/wine-card').then((m) => m.WineCard),
  { loading: () => <div className="flex items-center justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-bordeaux-500" /></div> }
);

interface PairingWine {
  wine: string;
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
  alcohol?: string;
  vivino_rating?: number;
  vivino_reviews?: number;
  tasting_notes?: { nose?: string[]; palate?: string[]; finish?: string };
  serving?: { drink_from?: number; drink_until?: number; decant_minutes?: number; temperature_celsius?: number };
  positive_matches?: string[];
  mismatches?: string[];
  wine_spectrum?: TasteSpectrum;
  profile_spectrum?: TasteSpectrum;
  why_drink_it?: string;
  similar_wines_note?: string;
}

function pairingToWineData(w: PairingWine): WineData {
  return {
    name: w.wine,
    winery: w.winery || '',
    wine_type: (w.wine_type as WineData['wine_type']) || 'red',
    country: w.country || '',
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

function pairingToMatchResult(w: PairingWine): ProfileMatchResult | undefined {
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

export function FoodPairing() {
  const t = useTranslations('sommelier');
  const { setActiveFlow, userId, refreshState } = useSommelier();
  const [meal, setMeal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [wines, setWines] = useState<PairingWine[] | null>(null);
  const [addToCellarWine, setAddToCellarWine] = useState<WineData | null>(null);
  const [actionStates, setActionStates] = useState<Record<number, { cellar?: boolean; wishlist?: boolean; profile?: boolean }>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meal.trim()) return;
    setLoading(true);
    setError(false);
    setWines(null);
    try {
      const res = await fetch('/api/sommelier/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal }),
      });
      if (res.ok) {
        const data = await res.json();
        const suggestions = data.suggestions || [];
        setWines(suggestions);
        if (userId) {
          for (const w of suggestions) {
            const matchResult = pairingToMatchResult(w);
            if (matchResult) {
              setCachedMatch(userId, pairingToWineData(w), matchResult);
            }
          }
        }
      } else {
        setError(true);
      }
    } catch { setError(true); }
    finally { setLoading(false); }
  };

  const handleAddToWishlist = async (index: number) => {
    if (!wines || !userId || actionStates[index]?.wishlist) return;
    const wine = wines[index];
    setActionStates((prev) => ({ ...prev, [index]: { ...prev[index], wishlist: true } }));
    try {
      const fullWine = pairingToWineData(wine);
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, wine: fullWine }),
      });
      if (res.ok) {
        window.dispatchEvent(new Event('wishlist-updated'));
      } else {
        setActionStates((prev) => ({ ...prev, [index]: { ...prev[index], wishlist: false } }));
      }
    } catch { setActionStates((prev) => ({ ...prev, [index]: { ...prev[index], wishlist: false } })); }
  };

  const handleAddToCellar = (index: number) => {
    if (!wines) return;
    setAddToCellarWine(pairingToWineData(wines[index]));
  };

  const handleAddToProfile = async (index: number) => {
    if (!wines || !userId || actionStates[index]?.profile) return;
    const wine = wines[index];
    setActionStates((prev) => ({ ...prev, [index]: { ...prev[index], profile: true } }));
    try {
      const res = await fetch('/api/profile/add-wine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wine_name: `${wine.wine} ${wine.winery || ''}`.trim(), rating: 'liked' }),
      });
      if (res.ok) refreshState();
      else setActionStates((prev) => ({ ...prev, [index]: { ...prev[index], profile: false } }));
    } catch { setActionStates((prev) => ({ ...prev, [index]: { ...prev[index], profile: false } })); }
  };

  return (
    <div className="flex flex-col pt-4 px-4 pb-6">
      <button
        onClick={() => setActiveFlow(null)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('back')}
      </button>

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

      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-bordeaux-500 mb-4" />
          <p className="text-sm text-muted-foreground">{t('findingWine')}</p>
        </div>
      )}

      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-8">
          <AlertCircle className="h-8 w-8 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground text-center">{t('discoveryError')}</p>
        </div>
      )}

      {wines && wines.length > 0 && !loading && (
        <div className="space-y-4 animate-fade-in">
          {wines.map((wine, i) => (
            <div key={i} className="animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
              <WineCard
                wine={pairingToWineData(wine)}
                matchResult={pairingToMatchResult(wine)}
                onAddToCellar={() => handleAddToCellar(i)}
                onAddToWishlist={() => handleAddToWishlist(i)}
                onAddToProfile={() => handleAddToProfile(i)}
                isAddingToCellar={!!actionStates[i]?.cellar}
                isAddingToWishlist={!!actionStates[i]?.wishlist}
                isAddingToProfile={!!actionStates[i]?.profile}
              />
            </div>
          ))}
          <button onClick={() => setActiveFlow(null)} className="mt-4 w-full rounded-xl bg-bordeaux-600 px-4 py-3 text-sm font-semibold text-white dark:bg-bordeaux-700 transition-colors">
            {t('done')}
          </button>
        </div>
      )}

      {userId && addToCellarWine && (
        <AddToCellarDialog
          wine={addToCellarWine}
          userId={userId}
          onClose={() => setAddToCellarWine(null)}
          onAdded={() => {
            const idx = wines?.findIndex(w => w.wine === addToCellarWine.name);
            if (idx != null && idx >= 0) {
              setActionStates((prev) => ({ ...prev, [idx]: { ...prev[idx], cellar: true } }));
            }
            setAddToCellarWine(null);
          }}
        />
      )}
    </div>
  );
}
