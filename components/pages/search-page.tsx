'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Search, Camera, Upload, Loader2, Wine, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { WineCard } from '@/components/wine-card';
import { BottomNav } from '@/components/bottom-nav';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { getRecentSearches, addRecentSearch } from '@/lib/search-history';
import { cn } from '@/lib/utils';
import type { WineData, ProfileMatchResult } from '@/lib/openai';

interface SearchPageProps {
  userId: string;
}

const MAX_RECENT = 20;

export function SearchPage({ userId }: SearchPageProps) {
  const t = useTranslations('search');
  const tProfile = useTranslations('profile');
  const tCellar = useTranslations('cellar');
  const tCommon = useTranslations('common');
  const tWineCard = useTranslations('wineCard');
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [wineResult, setWineResult] = useState<WineData | null>(null);
  const [matchResult, setMatchResult] = useState<ProfileMatchResult | null>(null);
  const [error, setError] = useState('');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isAddingToCellar, setIsAddingToCellar] = useState(false);
  const [isSubmittingToCellar, setIsSubmittingToCellar] = useState(false);
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  const [isAddingToProfile, setIsAddingToProfile] = useState(false);
  const [recentSearches, setRecentSearches] = useState<WineData[]>([]);
  const [wineCandidates, setWineCandidates] = useState<WineData[]>([]);
  const [selectedRecentWine, setSelectedRecentWine] = useState<WineData | null>(null);
  const [displayWine, setDisplayWine] = useState<WineData | null>(null);
  const [displayMatch, setDisplayMatch] = useState<ProfileMatchResult | null>(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [isFetchingMatch, setIsFetchingMatch] = useState(false);
  const [addToCellarWine, setAddToCellarWine] = useState<WineData | null>(null);
  const [addToCellarQuantity, setAddToCellarQuantity] = useState(1);
  const [addToCellarPriceNis, setAddToCellarPriceNis] = useState<string>('');
  const [addToCellarError, setAddToCellarError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecentSearches(getRecentSearches(userId));
  }, [userId]);

  useEffect(() => {
    if (!selectedRecentWine) {
      setDisplayWine(null);
      setDisplayMatch(null);
      setIsFetchingDetails(false);
      return;
    }
    let cancelled = false;
    // Use stored wine data directly — no need to re-search from OpenAI
    setDisplayWine(selectedRecentWine);
    setDisplayMatch(null);
    setIsFetchingDetails(false);

    // Only fetch the profile match (single fast API call)
    fetch('/api/wine-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wine: selectedRecentWine, userId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setDisplayMatch(data.match ?? null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selectedRecentWine, userId]);

  const handleTextSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setError('');
    setWineResult(null);
    setMatchResult(null);
    setWineCandidates([]);
    setUploadedImageUrl(null);
    setIsAddingToCellar(false);
    setIsAddingToWishlist(false);
    setIsAddingToProfile(false);

    try {
      const response = await fetch('/api/wine-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          userId,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else if (data.wines?.length > 1) {
        setWineCandidates(data.wines);
      } else if (data.wine) {
        setWineResult(data.wine);
        setMatchResult(data.match ?? null);
        addRecentSearch(userId, data.wine);
        setRecentSearches(getRecentSearches(userId));
      }
    } catch {
      setError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectCandidate = async (wine: WineData) => {
    setWineResult(null);
    setMatchResult(null);
    setIsFetchingMatch(true);
    try {
      const response = await fetch('/api/wine-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wine, userId }),
      });
      const data = await response.json();
      setWineResult(wine);
      setMatchResult(data.match ?? null);
      setWineCandidates([]);
      addRecentSearch(userId, wine);
      setRecentSearches(getRecentSearches(userId));
    } catch {
      setWineResult(wine);
      setMatchResult(null);
      setWineCandidates([]);
    } finally {
      setIsFetchingMatch(false);
    }
  };

  /** Resize image on a canvas to keep payload small and API calls fast */
  const compressImage = (file: File, maxDim = 1600, quality = 0.85): Promise<string> =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new window.Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        try {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const scale = maxDim / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('Canvas not supported')); return; }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      img.src = url;
    });

  /** Read file as data URL (fallback when compression fails, e.g. HEIC) */
  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSearching(true);
    setError('');
    setWineResult(null);
    setMatchResult(null);
    setIsAddingToCellar(false);
    setIsAddingToWishlist(false);
    setIsAddingToProfile(false);

    try {
      // Try to compress; fall back to raw base64 if compression fails (e.g. HEIC format)
      let dataUrl: string;
      try {
        dataUrl = await compressImage(file);
      } catch {
        dataUrl = await readFileAsDataUrl(file);
      }
      // Save the uploaded image URL for display
      setUploadedImageUrl(dataUrl);
      
      // Extract mime type and base64 data
      const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        setError('Invalid image format');
        setIsSearching(false);
        return;
      }
      const [, mimeType, base64] = matches;

      const response = await fetch('/api/wine-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64,
          imageMimeType: mimeType,
          userId,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setWineResult(data.wine);
        setMatchResult(data.match);
        if (data.wine) {
          addRecentSearch(userId, data.wine);
          setRecentSearches(getRecentSearches(userId));
        }
      }
      setIsSearching(false);
    } catch {
      setError('Image upload failed. Please try again.');
      setIsSearching(false);
    }
  };

  const wineForActions = (w?: WineData | null): WineData | null => w ?? wineResult;

  const openAddToCellarModal = (wine?: WineData | null) => {
    const target = wine ?? wineResult;
    if (!target) return;
    setSelectedRecentWine(null);
    setAddToCellarWine(target);
    setAddToCellarQuantity(1);
    setAddToCellarPriceNis('');
    setAddToCellarError('');
    setIsSubmittingToCellar(false);
  };

  const handleConfirmAddToCellar = async () => {
    if (!addToCellarWine) return;
    setAddToCellarError('');
    setIsSubmittingToCellar(true);
    try {
      const quantity = Math.max(1, Math.floor(Number(addToCellarQuantity)) || 1);
      const priceStr = addToCellarPriceNis.trim().replace(/,/g, '.');
      const purchasePrice = priceStr === '' ? undefined : parseFloat(priceStr);
      const body: { userId: string; wine: WineData; quantity: number; purchasePrice?: number; bottlePhotoUrl?: string } = {
        userId,
        wine: addToCellarWine,
        quantity,
      };
      if (purchasePrice != null && !Number.isNaN(purchasePrice) && purchasePrice >= 0) {
        body.purchasePrice = purchasePrice;
      }
      if (uploadedImageUrl && addToCellarWine === wineResult) {
        body.bottlePhotoUrl = uploadedImageUrl;
      }
      const response = await fetch('/api/cellar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = typeof data?.error === 'string' ? data.error : 'Failed to add to cellar';
        setAddToCellarError(message);
        return;
      }
      setAddToCellarWine(null);
      // Show "Added to cellar!" feedback on the wine card
      setIsAddingToCellar(true);
      setTimeout(() => setIsAddingToCellar(false), 2000);
    } catch (err) {
      console.error('Failed to add to cellar:', err);
      setAddToCellarError('Network error. Please try again.');
    } finally {
      setIsSubmittingToCellar(false);
    }
  };

  const handleAddToWishlist = async (wine?: WineData | null) => {
    const target = wineForActions(wine);
    if (!target || isAddingToWishlist) return;
    setIsAddingToWishlist(true);
    try {
      const response = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, wine: target }),
      });
      if (!response.ok) throw new Error('Failed to add');
    } catch (err) {
      console.error('Failed to add to wishlist:', err);
      setIsAddingToWishlist(false);
    }
  };

  const handleAddToProfile = async (wine?: WineData | null) => {
    const target = wineForActions(wine);
    if (!target || isAddingToProfile) return;
    setError('');
    setIsAddingToProfile(true);
    try {
      const response = await fetch('/api/profile/add-wine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, wine: target, liked: true }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.details || data?.error || 'Failed to add to profile');
        setIsAddingToProfile(false);
        return;
      }
      setError('');
      setIsAddingToProfile(false);
    } catch (err) {
      console.error('Failed to add to profile:', err);
      setError('Failed to add to profile. Please try again.');
      setIsAddingToProfile(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 pb-20">
      {/* Header */}
      <header className="bg-gradient-to-r from-wine-900 to-wine-800 px-4 pb-8 pt-8">
        <div className="mx-auto max-w-lg">
          <h1 className="mb-4 text-2xl font-bold text-white">{t('title')}</h1>

          {/* Search Input */}
          <div className="relative">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTextSearch()}
              placeholder={t('textPlaceholder')}
              className="h-12 bg-white pe-12 ps-4 text-start"
            />
            <button
              type="button"
              onClick={handleTextSearch}
              disabled={isSearching}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-wine-900 transition-colors hover:text-wine-700"
              aria-label={t('title')}
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4">
        {/* Image Upload */}
        <Card className="-mt-4">
          <CardContent className="p-4">
            <p className="mb-3 text-center text-sm text-gray-600">
              {t('orUploadPhoto')}
            </p>
            <div className="flex gap-3">
              <input
                id="wine-search-file-input"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                tabIndex={-1}
                aria-hidden
              />
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                disabled={isSearching}
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.removeAttribute('capture');
                    fileInputRef.current.click();
                  }
                }}
              >
                <Upload className="me-2 h-4 w-4" />
                {t('uploadPhoto')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                disabled={isSearching}
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.setAttribute('capture', 'environment');
                    fileInputRef.current.click();
                  }
                }}
              >
                <Camera className="me-2 h-4 w-4" />
                {t('takePhoto')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Multiple text results: pick one */}
        {wineCandidates.length > 1 && !isSearching && (
          <section className="mt-6">
            <h2 className="mb-2 text-lg font-semibold text-wine-900">{t('pickWine')}</h2>
            <p className="mb-3 text-sm text-gray-600">{t('multipleResults')}</p>
            {isFetchingMatch ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-10 w-10 animate-spin text-wine-900" />
                <p className="mt-3 text-sm text-gray-600">{t('loadingDetails')}</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {wineCandidates.map((w, idx) => (
                  <li key={`${w.name}|${w.winery}|${w.vintage ?? ''}|${idx}`}>
                    <button
                      type="button"
                      onClick={() => handleSelectCandidate(w)}
                      className={cn(
                        'w-full rounded-lg border border-wine-100 bg-white p-3 text-left shadow-sm',
                        'hover:border-wine-300 hover:bg-wine-50/50 transition-colors',
                        'flex items-center justify-between gap-2'
                      )}
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-wine-900">{w.name}</p>
                        <p className="text-sm text-gray-600">{w.winery}</p>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                          {w.region && <span>{tProfile('region')}: {w.region}</span>}
                          {w.country && <span>{tProfile('country')}: {w.country}</span>}
                          {w.vintage && <span>{tProfile('vintage')}: {w.vintage}</span>}
                          {w.grapes && w.grapes.length > 0 && (
                            <span>{tProfile('grapes')}: {Array.isArray(w.grapes) ? w.grapes.join(', ') : String(w.grapes)}</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 flex-shrink-0 text-wine-400" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Loading State */}
        {isSearching && (
          <div className="mt-8 flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-wine-900" />
            <p className="mt-4 text-gray-600">{t('analyzing')}</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="mt-8 border-amber-200 bg-amber-50">
            <CardContent className="py-6 text-center">
              <p className="text-gray-800">{error}</p>
              {error.includes('foreign key') && (
                <p className="mt-2 text-sm text-gray-600">
                  Run the migration in Supabase SQL Editor: Dashboard → SQL Editor → paste and run the SQL from{' '}
                  <code className="rounded bg-amber-100 px-1 text-xs">supabase/migrations/20260206180000_allow_mock_user_profiles.sql</code>
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Wine Result */}
        {wineResult && !isSearching && (
          <div className="mt-8">
            <WineCard
              wine={wineResult}
              matchResult={matchResult || undefined}
              onAddToCellar={() => openAddToCellarModal(wineResult)}
              onAddToProfile={() => handleAddToProfile()}
              isAddingToCellar={isAddingToCellar}
              isAddingToProfile={isAddingToProfile}
              uploadedImageUrl={uploadedImageUrl || undefined}
            />
          </div>
        )}

        {/* Recent searches - below search results */}
        {recentSearches.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-wine-900">
              <Wine className="h-5 w-5" />
              {t('recentSearches')}
            </h2>
            <ul className="space-y-2">
              {recentSearches.slice(0, MAX_RECENT).map((w, idx) => (
                <li key={`${w.name}|${w.winery}|${idx}`}>
                  <button
                    type="button"
                    onClick={() => setSelectedRecentWine(w)}
                    className={cn(
                      'w-full rounded-lg border border-wine-100 bg-white p-3 text-left shadow-sm',
                      'hover:border-wine-300 hover:bg-wine-50/50 transition-colors',
                      'flex items-center justify-between gap-2'
                    )}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-wine-900">{w.name}</p>
                      <p className="text-sm text-gray-600">{w.winery}</p>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                        {w.region && <span>{tProfile('region')}: {w.region}</span>}
                        {w.country && <span>{tProfile('country')}: {w.country}</span>}
                        {w.vintage && <span>{tProfile('vintage')}: {w.vintage}</span>}
                        {w.grapes && w.grapes.length > 0 && (
                          <span>{tProfile('grapes')}: {w.grapes.join(', ')}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 flex-shrink-0 text-wine-400" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Modal: recent wine full details + match */}
      <Dialog
        open={!!selectedRecentWine}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRecentWine(null);
            setDisplayWine(null);
            setDisplayMatch(null);
            setIsFetchingDetails(false);
          }
        }}
      >
        <DialogContent
          onClose={() => {
            setSelectedRecentWine(null);
            setDisplayWine(null);
            setDisplayMatch(null);
            setIsFetchingDetails(false);
          }}
          className="max-w-lg"
        >
          {selectedRecentWine && (
            <>
              {isFetchingDetails ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-10 w-10 animate-spin text-wine-600" />
                  <p className="mt-4 text-sm text-gray-500">{t('loadingDetails')}</p>
                </div>
              ) : (
                <WineCard
                  wine={displayWine || selectedRecentWine}
                  matchResult={displayMatch || undefined}
                  onAddToCellar={() => openAddToCellarModal(displayWine || selectedRecentWine)}
                  onAddToProfile={() => handleAddToProfile(displayWine || selectedRecentWine)}
                  isAddingToCellar={isAddingToCellar}
                  isAddingToProfile={isAddingToProfile}
                  uploadedImageUrl={undefined}
                />
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Add to cellar with optional price (NIS) — render first so it can sit on top */}
      <Dialog
        open={!!addToCellarWine}
        onOpenChange={(open) => {
          if (!open) setAddToCellarWine(null);
        }}
      >
        <DialogContent
          onClose={() => setAddToCellarWine(null)}
          className="max-w-sm z-[100]"
        >
          {addToCellarWine && (
            <>
              <h3 className="text-lg font-semibold text-wine-900">
                {tCellar('addWine')}: {addToCellarWine.name}
              </h3>
              <p className="text-sm text-gray-500">{addToCellarWine.winery}</p>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {tCellar('quantity')}
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={addToCellarQuantity}
                    onChange={(e) => setAddToCellarQuantity(parseInt(e.target.value, 10) || 1)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {tCellar('purchasePriceNis')}
                  </label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={addToCellarPriceNis}
                    onChange={(e) => setAddToCellarPriceNis(e.target.value)}
                    className="w-full"
                  />
                  <p className="mt-1 text-xs text-gray-500">{tCellar('priceOptional')}</p>
                </div>
              </div>
              {addToCellarError && (
                <p className="mt-2 text-sm text-red-600" role="alert">
                  {addToCellarError}
                </p>
              )}
              <div className="mt-6 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setAddToCellarWine(null)}
                  disabled={isSubmittingToCellar}
                >
                  {tCommon('cancel')}
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={handleConfirmAddToCellar}
                  disabled={isSubmittingToCellar}
                >
                  {isSubmittingToCellar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    tWineCard('addToCellar')
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
