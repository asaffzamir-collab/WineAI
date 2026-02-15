'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Wine, Grape, MapPin, AlertCircle, Search, ChevronRight, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BottomNav } from '@/components/bottom-nav';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { WineCard } from '@/components/wine-card';
import { cn } from '@/lib/utils';
import type { WineData, ProfileMatchResult } from '@/lib/openai';

interface LikedWineDetail {
  name: string;
  winery: string;
  region?: string;
  country?: string;
  wine_type?: string;
  vintage?: number;
  grapes?: string[];
  image_url?: string;
  full_wine?: Record<string, unknown>;
}

export interface TasteProfile {
  wine_type: string;
  profile_data: {
    overall_style?: string;
    body_structure?: string;
    fruit_profile?: string;
    style_notes?: string;
    recommended_grapes?: string[];
    recommended_regions?: string[];
    what_to_avoid?: string[];
    summary?: string;
    liked_wines?: string[];
    liked_wines_detail?: LikedWineDetail[];
  };
  updated_at: string;
}

interface ProfilePageProps {
  userId: string;
  profiles: TasteProfile[];
}

function toWineData(raw: Record<string, unknown>): WineData {
  const tn = raw.tasting_notes && typeof raw.tasting_notes === 'object' && !Array.isArray(raw.tasting_notes)
    ? (raw.tasting_notes as Record<string, unknown>)
    : null;
  const tasting_notes = tn
    ? {
        nose: Array.isArray(tn.nose) ? tn.nose.map(String) : [],
        palate: Array.isArray(tn.palate) ? tn.palate.map(String) : [],
        finish: typeof tn.finish === 'string' ? tn.finish : '',
      }
    : undefined;

  const sv = raw.serving && typeof raw.serving === 'object' && !Array.isArray(raw.serving)
    ? (raw.serving as Record<string, unknown>)
    : null;
  const serving = sv
    ? {
        drink_from: typeof sv.drink_from === 'number' ? sv.drink_from : undefined,
        drink_until: typeof sv.drink_until === 'number' ? sv.drink_until : undefined,
        decant_minutes: typeof sv.decant_minutes === 'number' ? sv.decant_minutes : undefined,
        temperature_celsius: sv.temperature_celsius ? String(sv.temperature_celsius) : undefined,
      }
    : undefined;

  return {
    name: String(raw.name ?? ''),
    winery: String(raw.winery ?? ''),
    country: String(raw.country ?? ''),
    grapes: Array.isArray(raw.grapes) ? raw.grapes.map(String) : [],
    wine_type: (raw.wine_type as WineData['wine_type']) ?? 'red',
    vintage: typeof raw.vintage === 'number' ? raw.vintage : undefined,
    vivino_rating: typeof raw.vivino_rating === 'number' ? raw.vivino_rating : undefined,
    vivino_reviews: typeof raw.vivino_reviews === 'number' ? raw.vivino_reviews : undefined,
    region: raw.region ? String(raw.region) : undefined,
    tasting_notes,
    winery_description: raw.winery_description ? String(raw.winery_description) : undefined,
    image_url: raw.image_url ? String(raw.image_url) : undefined,
    food_pairings: Array.isArray(raw.food_pairings) ? raw.food_pairings.map(String) : undefined,
    serving,
    alcohol: typeof raw.alcohol === 'number' ? raw.alcohol : undefined,
    volume_ml: typeof raw.volume_ml === 'number' ? raw.volume_ml : undefined,
    is_kosher: typeof raw.is_kosher === 'boolean' ? raw.is_kosher : undefined,
    body: (raw.body as WineData['body']) ?? undefined,
    sweetness: (raw.sweetness as WineData['sweetness']) ?? undefined,
    price_range_usd: raw.price_range_usd ? String(raw.price_range_usd) : undefined,
  };
}

function hasFullWineData(w: Record<string, unknown>): boolean {
  return !!(w.tasting_notes || w.winery_description || w.vivino_rating);
}

export function ProfilePage({ userId, profiles: initialProfiles }: ProfilePageProps) {
  const t = useTranslations('profile');

  const [profiles, setProfiles] = useState<TasteProfile[]>(initialProfiles);
  const [activeTab, setActiveTab] = useState('red');
  const tCellar = useTranslations('cellar');
  const tCommon = useTranslations('common');
  const tWineCard = useTranslations('wineCard');
  const [selectedWine, setSelectedWine] = useState<Record<string, unknown> | null>(null);
  const [displayWine, setDisplayWine] = useState<Record<string, unknown> | null>(null);
  const [displayMatch, setDisplayMatch] = useState<ProfileMatchResult | null>(null);
  const [isFetchingWineDetails, setIsFetchingWineDetails] = useState(false);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [isAddingToCellar, setIsAddingToCellar] = useState(false);
  const [addToCellarWine, setAddToCellarWine] = useState<WineData | null>(null);
  const [addToCellarQuantity, setAddToCellarQuantity] = useState(1);
  const [addToCellarPriceNis, setAddToCellarPriceNis] = useState('');
  const [addToCellarError, setAddToCellarError] = useState('');
  const [isSubmittingToCellar, setIsSubmittingToCellar] = useState(false);
  const fetchingRef = useRef(false);

  // Reusable fetch function for profiles
  const refreshProfiles = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const res = await fetch(`/api/profile?userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        setProfiles(Array.isArray(data) ? data : []);
      }
    } catch {
      // Keep current profiles on error
    } finally {
      fetchingRef.current = false;
    }
  }, [userId]);

  // When modal opens with a wine, fetch full details + profile match from search API
  useEffect(() => {
    if (!selectedWine?.name || !selectedWine?.winery) {
      setDisplayWine(null);
      setDisplayMatch(null);
      return;
    }
    let cancelled = false;
    setDisplayWine(null);
    setDisplayMatch(null);

    // If we already have full data, use it but still fetch match
    if (hasFullWineData(selectedWine)) {
      setDisplayWine(selectedWine);
      // Still fetch match from API
      fetch('/api/wine-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wine: selectedWine, userId }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (!cancelled) setDisplayMatch(data.match ?? null);
        })
        .catch(() => {});
      return () => { cancelled = true; };
    }

    setIsFetchingWineDetails(true);
    const query = `${String(selectedWine.name)} ${String(selectedWine.winery)}`;
    fetch('/api/wine-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, userId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.wine) {
          setDisplayWine(data.wine);
          setDisplayMatch(data.match ?? null);
        } else {
          setDisplayWine(selectedWine);
        }
      })
      .catch(() => {
        if (!cancelled) setDisplayWine(selectedWine);
      })
      .finally(() => {
        if (!cancelled) setIsFetchingWineDetails(false);
      });
    return () => { cancelled = true; };
  }, [selectedWine, userId]);

  // Auto-refresh profiles on mount, visibility change, and window focus
  useEffect(() => {
    // Always fetch fresh data from API on mount (don't rely on server cache)
    refreshProfiles();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshProfiles();
      }
    };
    const handleFocus = () => {
      refreshProfiles();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshProfiles]);

  const wineTypeLabels: Record<string, string> = {
    red: t('red'),
    white: t('white'),
    rose: t('rose'),
  };

  const wineTypeColors: Record<string, string> = {
    red: 'bg-red-900 text-white',
    white: 'bg-amber-100 text-amber-900',
    rose: 'bg-pink-300 text-pink-900',
  };

  const getProfile = (type: string) =>
    profiles.find((p) => p.wine_type === type)?.profile_data || {};

  const openAddToCellarModal = (wine: WineData) => {
    setAddToCellarWine(wine);
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
      const body: { userId: string; wine: WineData; quantity: number; purchasePrice?: number } = {
        userId,
        wine: addToCellarWine,
        quantity,
      };
      if (purchasePrice != null && !Number.isNaN(purchasePrice) && purchasePrice >= 0) {
        body.purchasePrice = purchasePrice;
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
      setIsAddingToCellar(true);
      setTimeout(() => setIsAddingToCellar(false), 2000);
    } catch (err) {
      console.error('Failed to add to cellar:', err);
      setAddToCellarError('Network error. Please try again.');
    } finally {
      setIsSubmittingToCellar(false);
    }
  };

  const handleRemoveFromProfile = async (w: LikedWineDetail) => {
    const key = `${w.name}|${w.winery}`;
    setRemovingKey(key);
    try {
      const res = await fetch('/api/profile/remove-wine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          wine: { name: w.name, winery: w.winery },
        }),
      });
      const data = await res.json();
      if (data.error) {
        console.error('Remove from profile failed:', data.error);
        return;
      }
      if (selectedWine && String(selectedWine.name) === w.name && String(selectedWine.winery) === w.winery) {
        setSelectedWine(null);
        setDisplayWine(null);
      }
      await refreshProfiles();
    } finally {
      setRemovingKey(null);
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 pb-20">
      {/* Header */}
      <header className="bg-gradient-to-r from-wine-900 to-wine-800 px-4 pb-8 pt-8">
        <div className="mx-auto max-w-lg">
          <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4">
        {/* Wine Type Tabs */}
        <Card className="-mt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              {['red', 'white', 'rose'].map((type) => (
                <TabsTrigger key={type} value={type} type="button">
                  <span
                    className={cn(
                      'me-2 inline-block h-3 w-3 rounded-full',
                      wineTypeColors[type]
                    )}
                  />
                  {wineTypeLabels[type]}
                </TabsTrigger>
              ))}
            </TabsList>

            {['red', 'white', 'rose'].map((type) => {
              const profile = getProfile(type);
              const hasProfile = Object.keys(profile).length > 0;

              return (
                <TabsContent key={type} value={type}>
                  <CardContent className="space-y-6 pt-4">
                    {!hasProfile ? (
                      <div className="py-8 text-center text-gray-500">
                        <Wine className="mx-auto h-12 w-12 text-gray-300" />
                        <p className="mt-4">{t('noProfileYet')}</p>
                        <p className="text-sm">{t('addWinesToBuildProfile')}</p>
                        <Button asChild variant="outline" className="mt-4">
                          <Link href="/search" className="inline-flex items-center gap-2">
                            <Search className="h-4 w-4" />
                            {t('goToSearch')}
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <>
                        {/* Overall Style */}
                        {profile.overall_style && (
                          <section>
                            <h3 className="mb-2 font-semibold text-wine-900">
                              {t('overallStyle')}
                            </h3>
                            <p className="text-gray-600">{profile.overall_style}</p>
                          </section>
                        )}

                        {/* Body & Structure */}
                        {profile.body_structure && (
                          <section>
                            <h3 className="mb-2 font-semibold text-wine-900">
                              {t('bodyStructure')}
                            </h3>
                            <p className="text-gray-600">{profile.body_structure}</p>
                          </section>
                        )}

                        {/* Fruit Profile */}
                        {profile.fruit_profile && (
                          <section>
                            <h3 className="mb-2 font-semibold text-wine-900">
                              {t('fruitProfile')}
                            </h3>
                            <p className="text-gray-600">{profile.fruit_profile}</p>
                          </section>
                        )}

                        {/* Style Notes */}
                        {profile.style_notes && (
                          <section>
                            <h3 className="mb-2 font-semibold text-wine-900">
                              {t('styleNotes')}
                            </h3>
                            <p className="text-gray-600">{profile.style_notes}</p>
                          </section>
                        )}

                        {/* Recommended Grapes */}
                        {profile.recommended_grapes && profile.recommended_grapes.length > 0 && (
                          <section>
                            <h3 className="mb-2 flex items-center gap-2 font-semibold text-wine-900">
                              <Grape className="h-4 w-4" />
                              {t('recommendedGrapes')}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              {profile.recommended_grapes.map((grape, idx) => (
                                <span
                                  key={idx}
                                  className="rounded-full bg-wine-100 px-3 py-1 text-sm text-wine-900"
                                >
                                  {grape}
                                </span>
                              ))}
                            </div>
                          </section>
                        )}

                        {/* Recommended Regions */}
                        {profile.recommended_regions && profile.recommended_regions.length > 0 && (
                          <section>
                            <h3 className="mb-2 flex items-center gap-2 font-semibold text-wine-900">
                              <MapPin className="h-4 w-4" />
                              {t('recommendedRegions')}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              {profile.recommended_regions.map((region, idx) => (
                                <span
                                  key={idx}
                                  className="rounded-full bg-gold-100 px-3 py-1 text-sm text-gold-800"
                                >
                                  {region}
                                </span>
                              ))}
                            </div>
                          </section>
                        )}

                        {/* What to Avoid */}
                        {profile.what_to_avoid && profile.what_to_avoid.length > 0 && (
                          <section>
                            <h3 className="mb-2 flex items-center gap-2 font-semibold text-wine-900">
                              <AlertCircle className="h-4 w-4" />
                              {t('whatToAvoid')}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              {profile.what_to_avoid.map((avoid, idx) => (
                                <span
                                  key={idx}
                                  className="rounded-full bg-red-50 px-3 py-1 text-sm text-red-700"
                                >
                                  {avoid}
                                </span>
                              ))}
                            </div>
                          </section>
                        )}

                        {/* Summary */}
                        {profile.summary && (
                          <section className="rounded-lg bg-cream-100 p-4">
                            <h3 className="mb-2 font-semibold text-wine-900">
                              {t('summary')}
                            </h3>
                            <p className="italic text-gray-600">{profile.summary}</p>
                          </section>
                        )}

                        {/* Wines that built this profile - click to see full details */}
                        {(profile.liked_wines_detail && profile.liked_wines_detail.length > 0) && (
                          <section>
                            <h3 className="mb-3 flex items-center gap-2 font-semibold text-wine-900">
                              <Wine className="h-4 w-4" />
                              {t('winesThatBuiltProfile')}
                            </h3>
                            <ul className="space-y-2">
                              {profile.liked_wines_detail.map((w, idx) => {
                                const rowKey = `${w.name}|${w.winery}`;
                                const isRemoving = removingKey === rowKey;
                                return (
                                  <li key={`${type}-${rowKey}-${idx}`}>
                                    <div className="flex items-center gap-2 rounded-lg border border-wine-100 bg-white p-3 shadow-sm">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedWine(w.full_wine ?? { name: w.name, winery: w.winery, country: w.country ?? '', region: w.region, vintage: w.vintage, grapes: w.grapes ?? [], wine_type: (w.wine_type as WineData['wine_type']) ?? 'red', image_url: w.image_url })}
                                        className={cn(
                                          'min-w-0 flex-1 cursor-pointer text-left',
                                          'hover:opacity-80 transition-opacity flex items-center gap-3'
                                        )}
                                      >
                                        {/* Wine thumbnail */}
                                        {(w.image_url || w.full_wine?.image_url) ? (
                                          <div className="relative h-14 w-10 flex-shrink-0 overflow-hidden rounded bg-gray-100">
                                            <img
                                              src={w.image_url || String(w.full_wine?.image_url || '')}
                                              alt={w.name}
                                              className="h-full w-full object-contain"
                                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                            />
                                          </div>
                                        ) : (
                                          <div className={cn(
                                            'flex h-14 w-10 flex-shrink-0 items-center justify-center rounded',
                                            w.wine_type === 'white' ? 'bg-amber-100' : w.wine_type === 'rose' ? 'bg-pink-200' : 'bg-red-900/80'
                                          )}>
                                            <Wine className={cn(
                                              'h-5 w-5',
                                              w.wine_type === 'white' ? 'text-amber-700' : 'text-white/70'
                                            )} />
                                          </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                          <p className="font-semibold text-wine-900">{w.name}</p>
                                          <p className="text-sm text-gray-600">{w.winery}</p>
                                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                                            {w.region && <span>{t('region')}: {w.region}</span>}
                                            {w.country && <span>{t('country')}: {w.country}</span>}
                                            {w.vintage && <span>{t('vintage')}: {w.vintage}</span>}
                                            {w.grapes && w.grapes.length > 0 && <span>{t('grapes')}: {w.grapes.join(', ')}</span>}
                                          </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 flex-shrink-0 text-wine-400" />
                                      </button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        aria-label={t('removeFromProfile')}
                                        disabled={isRemoving}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemoveFromProfile(w);
                                        }}
                                        className="flex-shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                                      >
                                        {isRemoving ? (
                                          <span className="text-xs">{t('removing')}</span>
                                        ) : (
                                          <Trash2 className="h-5 w-5" />
                                        )}
                                      </Button>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          </section>
                        )}
                        {/* Fallback: show as clickable cards when we only have names (no detail) */}
                        {(!profile.liked_wines_detail || profile.liked_wines_detail.length === 0) &&
                          profile.liked_wines &&
                          profile.liked_wines.length > 0 && (
                          <section>
                            <h3 className="mb-3 flex items-center gap-2 font-semibold text-wine-900">
                              <Wine className="h-4 w-4" />
                              {t('winesThatBuiltProfile')}
                            </h3>
                            <ul className="space-y-2">
                              {profile.liked_wines.map((name, idx) => {
                                const nameStr = String(name);
                                return (
                                  <li key={`${type}-fallback-${idx}`}>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedWine({ name: nameStr, winery: '', wine_type: type as WineData['wine_type'] })}
                                      className={cn(
                                        'w-full cursor-pointer rounded-lg border border-wine-100 bg-white p-3 text-left shadow-sm',
                                        'hover:border-wine-300 hover:bg-wine-50/50 transition-colors',
                                        'flex items-center justify-between gap-2'
                                      )}
                                    >
                                      <p className="font-semibold text-wine-900">{nameStr}</p>
                                      <ChevronRight className="h-5 w-5 flex-shrink-0 text-wine-400" />
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          </section>
                        )}
                      </>
                    )}
                  </CardContent>
                </TabsContent>
              );
            })}
          </Tabs>
        </Card>

      </div>

      {/* Full wine details modal */}
      <Dialog
        open={!!selectedWine}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedWine(null);
            setDisplayWine(null);
            setIsFetchingWineDetails(false);
          }
        }}
      >
        <DialogContent
          onClose={() => {
            setSelectedWine(null);
            setDisplayWine(null);
            setIsFetchingWineDetails(false);
          }}
          className="max-w-lg"
        >
          {selectedWine && (() => {
            const sn = String(selectedWine.name ?? '');
            const sw = String(selectedWine.winery ?? '');
            const isInProfile = profiles.some((p) =>
              (p.profile_data.liked_wines_detail as LikedWineDetail[] | undefined)?.some(
                (w) => String(w.name) === sn && String(w.winery) === sw
              )
            );
            const removingThis = removingKey === `${sn}|${sw}`;
            return (
              <>
                {isFetchingWineDetails ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-wine-200 border-t-wine-600" />
                    <p className="mt-4 text-sm text-gray-500">{t('loadingWineDetails')}</p>
                  </div>
                ) : (
                  <>
                    <WineCard
                      wine={toWineData(displayWine ?? selectedWine)}
                      matchResult={displayMatch || undefined}
                      onAddToCellar={() => openAddToCellarModal(toWineData(displayWine ?? selectedWine))}
                      isAddingToCellar={isAddingToCellar}
                      uploadedImageUrl={(displayWine ?? selectedWine).image_url ? String((displayWine ?? selectedWine).image_url) : undefined}
                    />
                    {isInProfile && (
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-4 w-full border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                        disabled={removingThis}
                        onClick={() => handleRemoveFromProfile({ name: sn, winery: sw })}
                      >
                        {removingThis ? (
                          <span>{t('removing')}</span>
                        ) : (
                          <>
                            <Trash2 className="me-2 h-4 w-4" />
                            {t('removeFromProfile')}
                          </>
                        )}
                      </Button>
                    )}
                  </>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Modal: Add to cellar with optional price */}
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
