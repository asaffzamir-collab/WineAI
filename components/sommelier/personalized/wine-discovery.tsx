'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useSommelier } from '../sommelier-context';
import { Loader2, ArrowLeft, Wine, ChevronRight, Grape, MapPin, AlertCircle } from 'lucide-react';
import { AddToCellarDialog } from '@/components/add-to-cellar-dialog';
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

function WineImageThumb({ name, winery }: { name: string; winery?: string }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current || !name) return;
    fetchedRef.current = true;
    fetch(`/api/wine-image?name=${encodeURIComponent(name)}&winery=${encodeURIComponent(winery || '')}`)
      .then(r => r.json())
      .then(d => { if (d.imageUrl) setImageUrl(d.imageUrl); })
      .catch(() => {});
  }, [name, winery]);

  if (imageUrl) {
    return (
      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-ivory-300 dark:bg-charcoal-700">
        <img
          src={imageUrl}
          alt={name}
          className="h-full w-full object-contain"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-bordeaux-50 dark:bg-bordeaux-900/20">
      <Wine className="h-5 w-5 text-bordeaux-500" strokeWidth={1.5} />
    </div>
  );
}

export function WineDiscovery() {
  const t = useTranslations('sommelier');
  const { setActiveFlow, userId, refreshState } = useSommelier();
  const [wines, setWines] = useState<DiscoveredWine[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  const [isAddingToProfile, setIsAddingToProfile] = useState(false);
  const [addToCellarWine, setAddToCellarWine] = useState<WineData | null>(null);
  const [isAddingToCellar, setIsAddingToCellar] = useState(false);

  useEffect(() => {
    const discover = async () => {
      try {
        const res = await fetch('/api/sommelier/discover-wines', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.wines) && data.wines.length > 0) {
            setWines(data.wines);
          } else {
            setError(true);
          }
        } else {
          setError(true);
        }
      } catch { setError(true); }
      finally { setLoading(false); }
    };
    discover();
  }, []);

  const handleAddToWishlist = async () => {
    if (selectedIndex === null || !wines || !userId || isAddingToWishlist) return;
    const wine = wines[selectedIndex];
    setIsAddingToWishlist(true);
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
      if (res.ok) setTimeout(() => setIsAddingToWishlist(false), 2000);
      else setIsAddingToWishlist(false);
    } catch { setIsAddingToWishlist(false); }
  };

  const handleAddToProfile = async () => {
    if (selectedIndex === null || !wines || !userId || isAddingToProfile) return;
    const wine = wines[selectedIndex];
    setIsAddingToProfile(true);
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
      if (res.ok) {
        await refreshState();
        window.dispatchEvent(new Event('wine-profile-updated'));
        setTimeout(() => setIsAddingToProfile(false), 2000);
      } else setIsAddingToProfile(false);
    } catch { setIsAddingToProfile(false); }
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
            onClick={() => { setError(false); setLoading(true); setWines(null); fetch('/api/sommelier/discover-wines', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }).then(r => r.ok ? r.json() : Promise.reject()).then(d => { if (Array.isArray(d.wines) && d.wines.length > 0) setWines(d.wines); else setError(true); }).catch(() => setError(true)).finally(() => setLoading(false)); }}
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

  const selectedWine = selectedIndex !== null ? wines[selectedIndex] ?? null : null;

  const handleAddToCellar = () => {
    if (selectedIndex === null || !wines) return;
    const wine = wines[selectedIndex];
    setAddToCellarWine(discoveredToWineData(wine));
  };

  // Detail view for a selected wine
  if (selectedWine) {
    const wineData = discoveredToWineData(selectedWine);
    return (
      <div className="flex flex-col pt-4 px-4 pb-6">
        <button
          onClick={() => { setSelectedIndex(null); setIsAddingToWishlist(false); setIsAddingToProfile(false); setIsAddingToCellar(false); }}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('back')}
        </button>

        <WineCard
          wine={wineData}
          matchResult={{ match_percentage: selectedWine.match, explanation: selectedWine.reason, positive_matches: [], mismatches: [] }}
          onAddToCellar={handleAddToCellar}
          onAddToWishlist={handleAddToWishlist}
          onAddToProfile={handleAddToProfile}
          isAddingToCellar={isAddingToCellar}
          isAddingToWishlist={isAddingToWishlist}
          isAddingToProfile={isAddingToProfile}
        />

        {userId && (
          <AddToCellarDialog
            wine={addToCellarWine}
            userId={userId}
            onClose={() => { setAddToCellarWine(null); setIsAddingToCellar(false); }}
            onAdded={() => { setAddToCellarWine(null); setIsAddingToCellar(false); }}
          />
        )}
      </div>
    );
  }

  // List view
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

      <div className="space-y-2">
        {wines?.map((wine, i) => (
          <button
            key={i}
            onClick={() => setSelectedIndex(i)}
            className="w-full flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3 text-start hover:bg-bordeaux-50 dark:hover:bg-bordeaux-900/20 transition-colors animate-fade-in"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <WineImageThumb name={wine.name} winery={wine.winery} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{wine.name}</p>
              {wine.winery && <p className="text-xs text-muted-foreground truncate">{wine.winery}</p>}
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                {wine.grape && (
                  <span className="flex items-center gap-0.5">
                    <Grape className="h-3 w-3" />
                    {wine.grape}
                  </span>
                )}
                <span className="flex items-center gap-0.5">
                  <MapPin className="h-3 w-3" />
                  {wine.region}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="rounded-full bg-bordeaux-50 dark:bg-bordeaux-900/30 px-2 py-0.5 text-xs font-bold text-bordeaux-600 dark:text-bordeaux-300">
                {wine.match}%
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>

      <button onClick={() => setActiveFlow(null)} className="mt-6 w-full rounded-xl bg-bordeaux-600 px-4 py-3 text-sm font-semibold text-white hover:bg-bordeaux-700 transition-colors">
        {t('done')}
      </button>
    </div>
  );
}
