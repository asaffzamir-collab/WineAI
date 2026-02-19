'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useSommelier } from '../sommelier-context';
import { Loader2, ArrowLeft } from 'lucide-react';
import type { WineData } from '@/lib/openai';

const WineCard = dynamic(
  () => import('@/components/wine-card').then((m) => m.WineCard),
  { loading: () => <div className="flex items-center justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-bordeaux-500" /></div> }
);

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

function discoveredToWineData(w: DiscoveredWine): WineData {
  return {
    name: w.name,
    winery: w.winery || '',
    wine_type: (w.wine_type as WineData['wine_type']) || 'red',
    country: w.country || 'Israel',
    region: w.region,
    grapes: w.grape ? [w.grape] : [],
    winery_description: w.reason,
    tasting_notes: w.tasting_note ? { nose: [], palate: [], finish: w.tasting_note } : undefined,
  };
}

export function WineDiscovery() {
  const t = useTranslations('sommelier');
  const { setActiveFlow, userId } = useSommelier();
  const [wines, setWines] = useState<DiscoveredWine[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingWishlist, setAddingWishlist] = useState<Set<number>>(new Set());
  const [addedWishlist, setAddedWishlist] = useState<Set<number>>(new Set());
  const [addingProfile, setAddingProfile] = useState<Set<number>>(new Set());
  const [addedProfile, setAddedProfile] = useState<Set<number>>(new Set());

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
    if (!userId || addedWishlist.has(index) || addingWishlist.has(index)) return;
    setAddingWishlist(prev => new Set(prev).add(index));
    try {
      const res = await fetch('/api/wishlist', {
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
          },
        }),
      });
      if (res.ok) setAddedWishlist(prev => new Set(prev).add(index));
    } catch { /* ignore */ }
    finally { setAddingWishlist(prev => { const s = new Set(prev); s.delete(index); return s; }); }
  };

  const handleAddToProfile = async (wine: DiscoveredWine, index: number) => {
    if (!userId || addedProfile.has(index) || addingProfile.has(index)) return;
    setAddingProfile(prev => new Set(prev).add(index));
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
          },
          liked: true,
        }),
      });
      if (res.ok) setAddedProfile(prev => new Set(prev).add(index));
    } catch { /* ignore */ }
    finally { setAddingProfile(prev => { const s = new Set(prev); s.delete(index); return s; }); }
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
        {wines?.map((wine, i) => {
          const wineData = discoveredToWineData(wine);
          return (
            <div key={i} className="animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
              <WineCard
                wine={wineData}
                matchResult={{ match_percentage: wine.match, explanation: wine.reason, positive_matches: [], mismatches: [] }}
                onAddToWishlist={() => handleAddToWishlist(wine, i)}
                onAddToProfile={() => handleAddToProfile(wine, i)}
                isAddingToWishlist={addingWishlist.has(i) || addedWishlist.has(i)}
                isAddingToProfile={addingProfile.has(i) || addedProfile.has(i)}
              />
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
