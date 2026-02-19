'use client';

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useSommelier } from './sommelier-context';
import { Search, Camera, Upload, Loader2, Wine, ArrowLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AddToCellarDialog } from '@/components/add-to-cellar-dialog';
import { getRecentSearches, addRecentSearch } from '@/lib/search-history';
import type { WineData, ProfileMatchResult } from '@/lib/openai';

const WineCard = dynamic(
  () => import('@/components/wine-card').then((m) => m.WineCard),
  { loading: () => <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-bordeaux-500" /></div> }
);

export function SearchFlow() {
  const t = useTranslations('search');
  const tSom = useTranslations('sommelier');
  const { setActiveFlow, userId, refreshState } = useSommelier();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [wineResult, setWineResult] = useState<WineData | null>(null);
  const [matchResult, setMatchResult] = useState<ProfileMatchResult | null>(null);
  const [error, setError] = useState('');
  const [isAddingToCellar, setIsAddingToCellar] = useState(false);
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  const [isAddingToProfile, setIsAddingToProfile] = useState(false);
  const [recentSearches, setRecentSearches] = useState<WineData[]>([]);
  const [selectedRecent, setSelectedRecent] = useState<WineData | null>(null);
  const [addToCellarWine, setAddToCellarWine] = useState<WineData | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userId) setRecentSearches(getRecentSearches(userId));
  }, [userId]);

  const saveAndSetResult = (wine: WineData) => {
    setWineResult(wine);
    if (userId) {
      addRecentSearch(userId, wine);
      setRecentSearches(getRecentSearches(userId));
    }
  };

  const handleTextSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setError('');
    setWineResult(null);
    setMatchResult(null);
    setSelectedRecent(null);
    setUploadedImageUrl(null);

    try {
      const response = await fetch('/api/wine-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, userId }),
      });
      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else if (data.wine) {
        saveAndSetResult(data.wine);
        setMatchResult(data.match ?? null);
      } else if (data.wines?.length > 0) {
        saveAndSetResult(data.wines[0]);
        setMatchResult(data.match ?? null);
      }
    } catch {
      setError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    setIsSearching(true);
    setError('');
    setWineResult(null);
    setMatchResult(null);
    setSelectedRecent(null);

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      setUploadedImageUrl(dataUrl);

      const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) { setError('Invalid image format.'); setIsSearching(false); return; }
      const [, mimeType, base64] = matches;

      const response = await fetch('/api/wine-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, imageMimeType: mimeType, userId }),
      });

      if (!response.ok) { setError('Search failed.'); setIsSearching(false); return; }
      const data = await response.json();
      if (data.error) { setError(data.error); }
      else if (data.wine) { saveAndSetResult(data.wine); setMatchResult(data.match ?? null); }
    } catch {
      setError('Image upload failed.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddToWishlist = async (wine?: WineData | null) => {
    const target = wine || wineResult;
    if (!target || !userId || isAddingToWishlist) return;
    setIsAddingToWishlist(true);
    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, wine: target }),
      });
      if (!res.ok) throw new Error('Failed');
      setTimeout(() => setIsAddingToWishlist(false), 2000);
    } catch { setIsAddingToWishlist(false); }
  };

  const handleAddToProfile = async (wine?: WineData | null) => {
    const target = wine || wineResult;
    if (!target || !userId || isAddingToProfile) return;
    setIsAddingToProfile(true);
    try {
      const res = await fetch('/api/profile/add-wine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, wine: target, liked: true }),
      });
      if (res.ok) {
        await refreshState();
        window.dispatchEvent(new Event('wine-profile-updated'));
      }
      setTimeout(() => setIsAddingToProfile(false), 2000);
    } catch { setIsAddingToProfile(false); }
  };

  const handleAddToCellar = (wine?: WineData | null) => {
    setAddToCellarWine(wine || wineResult);
  };

  const activeWine = selectedRecent || wineResult;

  return (
    <div className="flex flex-col pt-4 px-4 pb-6">
      <button
        onClick={() => setActiveFlow(null)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        {tSom('back')}
      </button>

      <h3 className="text-lg font-serif font-semibold text-foreground text-center mb-4">
        {t('title')}
      </h3>

      {/* Search input */}
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleTextSearch()}
          placeholder={t('textPlaceholder')}
          className="h-12 bg-card pe-12 ps-4 text-start"
        />
        <button
          type="button"
          onClick={handleTextSearch}
          disabled={isSearching}
          className="absolute end-3 top-1/2 -translate-y-1/2 text-primary hover:text-primary/80 transition-colors"
        >
          <Search className="h-5 w-5" strokeWidth={1.5} />
        </button>
      </div>

      {/* Image upload */}
      <div className="flex gap-2 mt-3">
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="flex-1"
          disabled={isSearching}
          onClick={() => {
            if (fileInputRef.current) { fileInputRef.current.removeAttribute('capture'); fileInputRef.current.click(); }
          }}
        >
          <Upload className="me-1.5 h-4 w-4" strokeWidth={1.5} />
          {t('uploadPhoto')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="flex-1"
          disabled={isSearching}
          onClick={() => {
            if (fileInputRef.current) { fileInputRef.current.setAttribute('capture', 'environment'); fileInputRef.current.click(); }
          }}
        >
          <Camera className="me-1.5 h-4 w-4" strokeWidth={1.5} />
          {t('takePhoto')}
        </Button>
      </div>

      {/* Loading */}
      {isSearching && (
        <div className="flex flex-col items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-bordeaux-500 mb-3" />
          <p className="text-sm text-muted-foreground">{t('analyzing')}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-xl border border-copper-200 bg-copper-50 dark:border-copper-700 dark:bg-copper-700/20 p-4">
          <p className="text-sm text-foreground text-center">{error}</p>
        </div>
      )}

      {/* Wine result - full WineCard */}
      {activeWine && !isSearching && (
        <div className="mt-4">
          {(selectedRecent || wineResult) && (
            <button
              onClick={() => { setSelectedRecent(null); setWineResult(null); setMatchResult(null); setUploadedImageUrl(null); setIsAddingToWishlist(false); setIsAddingToProfile(false); }}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('recentSearches')}
            </button>
          )}
          <WineCard
            wine={activeWine}
            matchResult={matchResult || undefined}
            onAddToCellar={() => handleAddToCellar(activeWine)}
            onAddToWishlist={() => handleAddToWishlist(activeWine)}
            onAddToProfile={() => handleAddToProfile(activeWine)}
            isAddingToCellar={isAddingToCellar}
            isAddingToWishlist={isAddingToWishlist}
            isAddingToProfile={isAddingToProfile}
            uploadedImageUrl={uploadedImageUrl || undefined}
          />
        </div>
      )}

      {/* Recent searches */}
      {recentSearches.length > 0 && !activeWine && !isSearching && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Wine className="h-4 w-4" strokeWidth={1.5} />
            {t('recentSearches')}
          </h4>
          <div className="space-y-2">
            {recentSearches.slice(0, 5).map((wine, i) => (
              <button
                key={i}
                onClick={() => { setSelectedRecent(wine); setMatchResult(null); }}
                className="w-full flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3 text-start hover:bg-accent transition-colors"
              >
                {wine.image_url ? (
                  <div className="h-10 w-8 flex-shrink-0 overflow-hidden rounded-lg bg-ivory-300 dark:bg-charcoal-700">
                    <img src={wine.image_url} alt="" className="h-full w-full object-contain" />
                  </div>
                ) : (
                  <div className="flex h-10 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-bordeaux-50 dark:bg-bordeaux-900/20">
                    <Wine className="h-4 w-4 text-primary" strokeWidth={1.5} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{wine.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{wine.winery}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add to Cellar Dialog */}
      {userId && (
        <AddToCellarDialog
          wine={addToCellarWine}
          userId={userId}
          bottlePhotoUrl={uploadedImageUrl && addToCellarWine === wineResult ? uploadedImageUrl : undefined}
          onClose={() => { setAddToCellarWine(null); setIsAddingToCellar(false); }}
          onAdded={() => { setAddToCellarWine(null); setIsAddingToCellar(false); }}
        />
      )}
    </div>
  );
}
