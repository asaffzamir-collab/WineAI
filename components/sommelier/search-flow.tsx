'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useSommelier } from './sommelier-context';
import { Search, Camera, Upload, Loader2, Wine, ArrowLeft, Heart, BookmarkPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { WineData, ProfileMatchResult } from '@/lib/openai';

export function SearchFlow() {
  const t = useTranslations('search');
  const tSom = useTranslations('sommelier');
  const { setActiveFlow } = useSommelier();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [wineResult, setWineResult] = useState<WineData | null>(null);
  const [matchResult, setMatchResult] = useState<ProfileMatchResult | null>(null);
  const [error, setError] = useState('');
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  const [isAddingToProfile, setIsAddingToProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setError('');
    setWineResult(null);
    setMatchResult(null);

    try {
      const response = await fetch('/api/wine-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else if (data.wine) {
        setWineResult(data.wine);
        setMatchResult(data.match ?? null);
      } else if (data.wines?.length > 0) {
        setWineResult(data.wines[0]);
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

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) { setError('Invalid image format.'); setIsSearching(false); return; }
      const [, mimeType, base64] = matches;

      const response = await fetch('/api/wine-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, imageMimeType: mimeType }),
      });

      if (!response.ok) { setError('Search failed.'); setIsSearching(false); return; }
      const data = await response.json();
      if (data.error) { setError(data.error); }
      else if (data.wine) { setWineResult(data.wine); setMatchResult(data.match ?? null); }
    } catch {
      setError('Image upload failed.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddToWishlist = async () => {
    if (!wineResult || isAddingToWishlist) return;
    setIsAddingToWishlist(true);
    try {
      await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wine: wineResult }),
      });
      setTimeout(() => setIsAddingToWishlist(false), 2000);
    } catch { setIsAddingToWishlist(false); }
  };

  const handleAddToProfile = async () => {
    if (!wineResult || isAddingToProfile) return;
    setIsAddingToProfile(true);
    try {
      await fetch('/api/profile/add-wine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wine: wineResult, liked: true }),
      });
      setTimeout(() => setIsAddingToProfile(false), 2000);
    } catch { setIsAddingToProfile(false); }
  };

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

      {/* Wine result */}
      {wineResult && !isSearching && (
        <div className="mt-4 rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-start gap-3">
            {wineResult.image_url ? (
              <div className="h-16 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-ivory-300 dark:bg-charcoal-700">
                <img src={wineResult.image_url} alt="" className="h-full w-full object-contain" />
              </div>
            ) : (
              <div className="flex h-16 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-bordeaux-50 dark:bg-bordeaux-900/20">
                <Wine className="h-6 w-6 text-primary" strokeWidth={1.5} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{wineResult.name}</p>
              <p className="text-xs text-muted-foreground">{wineResult.winery}</p>
              {wineResult.region && (
                <p className="text-xs text-muted-foreground mt-0.5">{wineResult.region}{wineResult.country ? ` · ${wineResult.country}` : ''}</p>
              )}
              {wineResult.grapes && wineResult.grapes.length > 0 && (
                <p className="text-xs text-muted-foreground">{wineResult.grapes.join(', ')}</p>
              )}
              {matchResult && (
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="rounded-full bg-bordeaux-50 dark:bg-bordeaux-900/30 px-2 py-0.5 text-xs font-bold text-bordeaux-600">
                    {matchResult.match_percentage}%
                  </span>
                  <span className="text-[11px] text-muted-foreground">{matchResult.explanation}</span>
                </div>
              )}
            </div>
          </div>

          {wineResult.tasting_notes && (
            <div className="mt-3 border-t border-border/30 pt-3">
              {wineResult.tasting_notes.nose && wineResult.tasting_notes.nose.length > 0 && (
                <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{wineResult.tasting_notes.nose.join(', ')}</span></p>
              )}
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <button
              onClick={handleAddToWishlist}
              disabled={isAddingToWishlist}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-60"
            >
              <BookmarkPlus className="h-3.5 w-3.5" strokeWidth={1.5} />
              {isAddingToWishlist ? tSom('addedToWishlist') : tSom('addToWishlist')}
            </button>
            <button
              onClick={handleAddToProfile}
              disabled={isAddingToProfile}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-60"
            >
              <Heart className="h-3.5 w-3.5" strokeWidth={1.5} />
              {isAddingToProfile ? tSom('addedToProfile') : tSom('likeWine')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
