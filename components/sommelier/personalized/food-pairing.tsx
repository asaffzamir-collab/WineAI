'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useSommelier } from '../sommelier-context';
import { Loader2, UtensilsCrossed, ArrowLeft, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddToCellarDialog } from '@/components/add-to-cellar-dialog';
import { setCachedMatch } from '@/lib/match-cache';
import type { WineData, ProfileMatchResult, TasteSpectrum } from '@/lib/openai';

const WineCard = dynamic(
  () => import('@/components/wine-card').then((m) => m.WineCard),
  { loading: () => <div className="flex items-center justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-bordeaux-500" /></div> }
);

const OCCASIONS = ['casual_dinner', 'date_night', 'hosting', 'solo_relaxing', 'celebration'];
const MOODS = ['casual', 'special'];

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
  from_cellar?: boolean;
  cellar_item_id?: string;
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
  const [occasion, setOccasion] = useState('');
  const [mood, setMood] = useState('');
  const [meal, setMeal] = useState('');
  const [step, setStep] = useState<'occasion' | 'details' | 'results'>('occasion');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [wines, setWines] = useState<PairingWine[] | null>(null);
  const [addToCellarWine, setAddToCellarWine] = useState<WineData | null>(null);
  const [actionStates, setActionStates] = useState<Record<number, { cellar?: boolean; wishlist?: boolean; profile?: boolean }>>({});

  const handleSearch = async (selectedMood: string) => {
    setMood(selectedMood);
    setStep('results');
    setLoading(true);
    setError(false);
    setWines(null);
    try {
      const res = await fetch('/api/sommelier/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal: meal || undefined, occasion, mood: selectedMood }),
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

  const handleBack = () => {
    if (step === 'results') { setStep('details'); setWines(null); setError(false); }
    else if (step === 'details') { setStep('occasion'); }
    else { setActiveFlow(null); }
  };

  return (
    <div className="flex flex-col pt-4 px-4 pb-6">
      <button
        onClick={handleBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('back')}
      </button>

      {step === 'occasion' && (
        <>
          <h3 className="text-lg font-serif font-semibold text-foreground text-center mb-6">{t('tonightOccasion')}</h3>
          <div className="space-y-2.5">
            {OCCASIONS.map(occ => (
              <button key={occ} onClick={() => { setOccasion(occ); setStep('details'); }} className="w-full rounded-xl border border-border/50 p-4 text-sm font-medium text-start hover:bg-bordeaux-50 dark:hover:bg-bordeaux-900/20 transition-colors">
                {t(`occasion_${occ}`)}
              </button>
            ))}
          </div>
        </>
      )}

      {step === 'details' && (
        <>
          <h3 className="text-lg font-serif font-semibold text-foreground text-center mb-2">{t('tonightFood')}</h3>
          <p className="text-sm text-muted-foreground text-center mb-6">{t('tonightFoodOptional')}</p>
          <div className="flex items-center gap-2 mb-6">
            <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={meal}
              onChange={e => setMeal(e.target.value)}
              placeholder={t('tonightFoodPlaceholder')}
              className="flex-1 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <h3 className="text-sm font-semibold text-foreground text-center mb-4 mt-2">{t('tonightMood')}</h3>
          <div className="grid grid-cols-2 gap-3">
            {MOODS.map(m => (
              <button
                key={m}
                onClick={() => handleSearch(m)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border-2 border-border/50 p-5 transition-all',
                  'hover:border-bordeaux-400 hover:shadow-soft active:scale-[0.97]'
                )}
              >
                <span className="text-sm font-semibold">{t(`mood_${m}`)}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 'results' && (
        <>
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
              <button onClick={() => { setStep('occasion'); setOccasion(''); setMeal(''); setMood(''); setError(false); }} className="mt-4 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-bordeaux-50 dark:hover:bg-bordeaux-900/20 transition-colors">
                {t('tryAgain')}
              </button>
            </div>
          )}

          {wines && wines.length > 0 && !loading && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col items-center mb-2">
                <Sparkles className="h-6 w-6 text-bordeaux-500 mb-2" />
                <h3 className="text-lg font-serif font-semibold text-foreground text-center">{t('pairingTitle')}</h3>
              </div>
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
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => { setStep('occasion'); setOccasion(''); setMeal(''); setMood(''); setWines(null); }}
                  className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-semibold text-foreground hover:bg-bordeaux-50 dark:hover:bg-bordeaux-900/20 transition-colors"
                >
                  {t('tryAgain')}
                </button>
                <button onClick={() => setActiveFlow(null)} className="flex-1 rounded-xl bg-bordeaux-600 px-4 py-3 text-sm font-semibold text-white hover:bg-bordeaux-700 transition-colors">
                  {t('done')}
                </button>
              </div>
            </div>
          )}
        </>
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
