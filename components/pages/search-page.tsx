'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Search, Camera, Upload, Loader2, Wine, ChevronRight, Sparkles, Lock } from 'lucide-react';
import { useUser } from '@/lib/user-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { WineCard } from '@/components/wine-card';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { AddToCellarDialog } from '@/components/add-to-cellar-dialog';
import { WineListItem } from '@/components/wine-list-item';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { getRecentSearches, addRecentSearch } from '@/lib/search-history';
import { UsageLimitModal, parseUsageLimitError } from '@/components/usage-limit-modal';
import type { WineData, ProfileMatchResult } from '@/lib/openai';

interface SearchPageProps {
  userId: string;
}

const MAX_RECENT = 20;

function buildWineMetadata(
  w: { region?: string; country?: string; vintage?: number; grapes?: string[] },
  labels: (key: string) => string
) {
  const meta: { label: string; value: string }[] = [];
  if (w.region) meta.push({ label: labels('region'), value: w.region });
  if (w.country) meta.push({ label: labels('country'), value: w.country });
  if (w.vintage) meta.push({ label: labels('vintage'), value: String(w.vintage) });
  if (w.grapes && w.grapes.length > 0) {
    meta.push({ label: labels('grapes'), value: Array.isArray(w.grapes) ? w.grapes.join(', ') : String(w.grapes) });
  }
  return meta;
}

export function SearchPage({ userId }: SearchPageProps) {
  const t = useTranslations('search');
  const tHome = useTranslations('home');
  const tProfile = useTranslations('profile');
  const { gender } = useUser();
  const g = { gender };
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQ);
  const [isSearching, setIsSearching] = useState(false);
  const autoSearchTriggered = useRef(false);
  const [wineResult, setWineResult] = useState<WineData | null>(null);
  const [matchResult, setMatchResult] = useState<ProfileMatchResult | null>(null);
  const [error, setError] = useState('');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isAddingToCellar, setIsAddingToCellar] = useState(false);
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  const [isAddingToProfile, setIsAddingToProfile] = useState(false);
  const [recentSearches, setRecentSearches] = useState<WineData[]>([]);
  const [wineCandidates, setWineCandidates] = useState<WineData[]>([]);
  const [selectedRecentWine, setSelectedRecentWine] = useState<WineData | null>(null);
  const [displayWine, setDisplayWine] = useState<WineData | null>(null);
  const [displayMatch, setDisplayMatch] = useState<ProfileMatchResult | null>(null);
  const [usageLimitInfo, setUsageLimitInfo] = useState<{ type: 'wine_search' | 'pier_message'; current: number; limit: number; tier: string } | null>(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [isFetchingMatch, setIsFetchingMatch] = useState(false);
  const [isFetchingRecentMatch, setIsFetchingRecentMatch] = useState(false);
  const [addToCellarWine, setAddToCellarWine] = useState<WineData | null>(null);
  const [hasFullPersonalization, setHasFullPersonalization] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecentSearches(getRecentSearches(userId));
    fetch(`/api/stats?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((data) => setHasFullPersonalization((data.likedWinesCount ?? 0) >= 2))
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!selectedRecentWine) {
      setDisplayWine(null);
      setDisplayMatch(null);
      setIsFetchingDetails(false);
      setIsFetchingRecentMatch(false);
      return;
    }
    let cancelled = false;
    setDisplayWine(selectedRecentWine);
    setDisplayMatch(null);
    setIsFetchingDetails(false);
    setIsFetchingRecentMatch(true);

    fetch('/api/wine-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wine: selectedRecentWine, userId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setDisplayMatch(data.match ?? null);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsFetchingRecentMatch(false); });
    return () => { cancelled = true; };
  }, [selectedRecentWine, userId]);

  const doTextSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

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
          query: searchQuery,
          userId,
        }),
      });

      const data = await response.json();

      const usageErr = parseUsageLimitError(response.status, data);
      if (usageErr) {
        setUsageLimitInfo(usageErr);
        return;
      }

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
  }, [userId]);

  useEffect(() => {
    if (initialQ && !autoSearchTriggered.current) {
      autoSearchTriggered.current = true;
      doTextSearch(initialQ);
    }
  }, [initialQ, doTextSearch]);

  const handleTextSearch = () => doTextSearch(query);

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

  const MAX_BASE64_SIZE = 3_500_000; // ~3.5MB base64 ≈ 2.6MB raw — safe for all platforms

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

          // Progressive compression: reduce quality until size is acceptable
          let result = canvas.toDataURL('image/jpeg', quality);
          let attempts = 0;
          while (result.length > MAX_BASE64_SIZE && attempts < 4) {
            attempts++;
            quality = Math.max(0.3, quality - 0.15);
            const reducedDim = Math.round(maxDim * (1 - attempts * 0.15));
            if (width > reducedDim || height > reducedDim) {
              const s = reducedDim / Math.max(width, height);
              width = Math.round(width * s);
              height = Math.round(height * s);
              canvas.width = width;
              canvas.height = height;
              ctx.drawImage(img, 0, 0, width, height);
            }
            result = canvas.toDataURL('image/jpeg', quality);
          }

          resolve(result);
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';

    setIsSearching(true);
    setError('');
    setWineResult(null);
    setMatchResult(null);
    setWineCandidates([]);
    setIsAddingToCellar(false);
    setIsAddingToWishlist(false);
    setIsAddingToProfile(false);

    try {
      let dataUrl: string;
      try {
        dataUrl = await compressImage(file);
      } catch (compressionErr) {
        console.warn('Image compression failed, reading raw file:', compressionErr);
        // Fallback: read raw file — but only if it's reasonably sized
        if (file.size > 4 * 1024 * 1024) {
          setError('Image is too large. Please use a smaller photo or take a new one.');
          setIsSearching(false);
          return;
        }
        dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });
      }
      setUploadedImageUrl(dataUrl);
      
      const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        setError('Invalid image format. Please use a JPEG, PNG, or WebP photo.');
        setIsSearching(false);
        return;
      }
      const [, mimeType, base64] = matches;

      // Guard: reject payloads that are still too large after compression
      if (base64.length > MAX_BASE64_SIZE) {
        setError('Image is too large even after compression. Please use a smaller photo.');
        setIsSearching(false);
        return;
      }

      const response = await fetch('/api/wine-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64,
          imageMimeType: mimeType,
          userId,
        }),
      });

      // Handle non-JSON error responses (413, 502, timeouts, etc.)
      if (!response.ok) {
        let errMsg = 'Search failed. Please try again.';
        try {
          const errData = await response.json();
          const usageErr = parseUsageLimitError(response.status, errData);
          if (usageErr) {
            setUsageLimitInfo(usageErr);
            setIsSearching(false);
            return;
          }
          if (errData?.error) errMsg = errData.error;
        } catch {
          console.error('Server returned non-JSON error, status:', response.status);
        }
        setError(errMsg);
        setIsSearching(false);
        return;
      }

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        if (data.wine) {
          // Vivino image is now fetched server-side and set on wine.image_url.
          // The user's uploaded photo is kept separately in uploadedImageUrl
          // as a fallback if no Vivino image was found.
          addRecentSearch(userId, data.wine);
          setRecentSearches(getRecentSearches(userId));
        }
        setWineResult(data.wine);
        setMatchResult(data.match);
      }
      setIsSearching(false);
    } catch (err) {
      console.error('Image upload failed:', err);
      setError('Image upload failed. Please try again with a different photo.');
      setIsSearching(false);
    }
  };

  const wineForActions = (w?: WineData | null): WineData | null => w ?? wineResult;

  const openAddToCellarModal = (wine?: WineData | null) => {
    const target = wine ?? wineResult;
    if (!target) return;
    setSelectedRecentWine(null);
    setAddToCellarWine(target);
  };

  const handleCellarAdded = () => {
    setIsAddingToCellar(true);
    setTimeout(() => setIsAddingToCellar(false), 2000);
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
      setTimeout(() => setIsAddingToWishlist(false), 2000);
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
      window.dispatchEvent(new Event('wine-profile-updated'));
      setTimeout(() => setIsAddingToProfile(false), 2000);
    } catch (err) {
      console.error('Failed to add to profile:', err);
      setError('Failed to add to profile. Please try again.');
      setIsAddingToProfile(false);
    }
  };

  return (
    <AppShell>
      <div className="animate-page py-6 md:py-8 lg:py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <PageHeader title={t('title')}>
            <div className="relative mt-4 max-w-xl">
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
                className="absolute end-3 top-1/2 -translate-y-1/2 text-primary transition-colors hover:text-primary/80"
                aria-label={t('title')}
              >
                <Search className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>
          </PageHeader>
        {/* Image Upload */}
        <Card className="max-w-xl">
          <CardContent className="p-4">
            <p className="mb-3 text-center text-sm text-muted-foreground">
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
                <Upload className="me-2 h-4 w-4" strokeWidth={1.5} />
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
                <Camera className="me-2 h-4 w-4" strokeWidth={1.5} />
                {t('takePhoto')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Match status banner */}
        {hasFullPersonalization !== null && (
          <div className={`mt-4 flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-xs ${
            hasFullPersonalization
              ? 'bg-bordeaux-50 text-bordeaux-700 dark:bg-bordeaux-900/20 dark:text-bordeaux-300'
              : 'bg-muted text-muted-foreground'
          }`}>
            {hasFullPersonalization ? (
              <Sparkles className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.5} />
            ) : (
              <Lock className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.5} />
            )}
            <span>
              {hasFullPersonalization
                ? tHome('matchActiveBanner')
                : tHome('matchLockedBanner', g)}
            </span>
          </div>
        )}

        {/* Multiple text results */}
        {wineCandidates.length > 1 && !isSearching && (
          <section className="mt-8">
            <h2 className="mb-2 text-heading text-lg text-foreground">{t('pickWine')}</h2>
            <p className="mb-3 text-sm text-muted-foreground">{t('multipleResults')}</p>
            {isFetchingMatch ? (
              <LoadingSpinner message={t('loadingDetails')} className="py-8" />
            ) : (
              <ul className="space-y-2">
                {wineCandidates.map((w, idx) => (
                  <li key={`${w.name}|${w.winery}|${w.vintage ?? ''}|${idx}`}>
                    <WineListItem
                      name={w.name}
                      winery={w.winery}
                      metadata={buildWineMetadata(w, tProfile)}
                      onClick={() => handleSelectCandidate(w)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Loading */}
        {isSearching && (
          <LoadingSpinner message={t('analyzing')} size="lg" className="mt-8" />
        )}

        {/* Error */}
        {error && (
          <Card className="mt-8 border border-copper-200 bg-copper-50 dark:border-copper-700 dark:bg-copper-700/20">
            <CardContent className="py-6 text-center">
              <p className="text-foreground">{error}</p>
              {error.includes('foreign key') && (
                <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
                  Run the migration in Supabase SQL Editor: Dashboard → SQL Editor → paste and run the SQL from{' '}
                  <code className="rounded bg-copper-100 px-1 text-xs dark:bg-copper-700/30">supabase/migrations/20260206180000_allow_mock_user_profiles.sql</code>
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
              onAddToWishlist={() => handleAddToWishlist()}
              onAddToProfile={() => handleAddToProfile()}
              isAddingToCellar={isAddingToCellar}
              isAddingToWishlist={isAddingToWishlist}
              isAddingToProfile={isAddingToProfile}
              uploadedImageUrl={uploadedImageUrl || undefined}
            />
          </div>
        )}

        {/* Recent searches */}
        {recentSearches.length > 0 && (
          <section className="mt-section">
            <h2 className="mb-3 flex items-center gap-2 text-heading text-lg text-foreground">
              <Wine className="h-5 w-5" strokeWidth={1.5} />
              {t('recentSearches')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {recentSearches.slice(0, MAX_RECENT).map((w, idx) => (
                <button key={`${w.name}|${w.winery}|${idx}`} onClick={() => setSelectedRecentWine(w)} className="w-full text-start">
                  <Card className="card-hover">
                    <CardContent className="flex items-center gap-3 p-3">
                      {w.image_url ? (
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-ivory-300 dark:bg-charcoal-700">
                          <img src={w.image_url} alt="" className="h-full w-full object-contain" loading="lazy" />
                        </div>
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bordeaux-50 dark:bg-bordeaux-900/20">
                          <Wine className="h-4 w-4 text-primary" strokeWidth={1.5} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{w.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{w.winery}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          </section>
        )}

      {/* Modal: recent wine */}
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
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="mt-4 text-sm text-muted-foreground">{t('loadingDetails')}</p>
                </div>
              ) : (
                <WineCard
                  wine={displayWine || selectedRecentWine}
                  matchResult={displayMatch || undefined}
                  matchLoading={isFetchingRecentMatch}
                  onAddToCellar={() => openAddToCellarModal(displayWine || selectedRecentWine)}
                  onAddToWishlist={() => handleAddToWishlist(displayWine || selectedRecentWine)}
                  onAddToProfile={() => handleAddToProfile(displayWine || selectedRecentWine)}
                  isAddingToCellar={isAddingToCellar}
                  isAddingToWishlist={isAddingToWishlist}
                  isAddingToProfile={isAddingToProfile}
                  uploadedImageUrl={undefined}
                />
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <AddToCellarDialog
        wine={addToCellarWine}
        userId={userId}
        bottlePhotoUrl={uploadedImageUrl && addToCellarWine === wineResult ? uploadedImageUrl : undefined}
        onClose={() => setAddToCellarWine(null)}
        onAdded={handleCellarAdded}
      />
        </div>
      </div>
      {usageLimitInfo && (
        <UsageLimitModal info={usageLimitInfo} onClose={() => setUsageLimitInfo(null)} />
      )}
    </AppShell>
  );
}
