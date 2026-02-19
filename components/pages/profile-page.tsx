'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Wine, Grape, MapPin, AlertCircle, Search, ChevronRight, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/app-shell';
import { AddToCellarDialog } from '@/components/add-to-cellar-dialog';
import { WineListItem } from '@/components/wine-list-item';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import dynamic from 'next/dynamic';

const WineCard = dynamic(() => import('@/components/wine-card').then((m) => m.WineCard), {
  loading: () => <div className="flex items-center justify-center py-12"><div className="h-10 w-10 animate-spin rounded-full border-2 border-bordeaux-200 border-t-bordeaux-500" /></div>,
});
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

interface TasteSpectrum {
  body: number;
  tannin: number;
  sweetness: number;
  acidity: number;
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
    taste_spectrum?: TasteSpectrum;
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
  return !!(w.tasting_notes && w.winery_description);
}

function SpectrumBar({
  value,
  leftLabel,
  rightLabel,
  hint,
  explanation,
  isExpanded,
  onToggle,
}: {
  value: number;
  leftLabel: string;
  rightLabel: string;
  hint: string;
  explanation: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const halfWidth = 5;
  const left = Math.max(halfWidth, Math.min(100 - halfWidth, clamped));

  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full text-start rounded-xl px-1 py-2 -mx-1 hover:bg-ivory-300/60 transition-all duration-200 dark:hover:bg-charcoal-700/40"
    >
      <p className="mb-1.5 text-xs text-stone-600/80 italic dark:text-stone-400/80">{hint}</p>
      <div className="flex items-center gap-3" dir="ltr">
        <span className="w-14 text-end text-sm font-semibold text-bordeaux-600 dark:text-ivory-200">{leftLabel}</span>
        <div className="relative flex-1 h-[7px] rounded-full bg-ivory-300 dark:bg-charcoal-700">
          <div
            className="absolute top-0 h-[7px] rounded-full bg-bordeaux-500 dark:bg-bordeaux-400"
            style={{
              left: `${left - halfWidth}%`,
              width: `${halfWidth * 2}%`,
            }}
          />
        </div>
        <span className="w-14 text-sm font-semibold text-bordeaux-600 dark:text-ivory-200">{rightLabel}</span>
      </div>
      {isExpanded && (
        <p className="mt-2 rounded-xl bg-ivory-300 px-3 py-2 text-xs leading-relaxed text-stone-600 dark:bg-charcoal-700 dark:text-stone-400">
          {explanation}
        </p>
      )}
    </button>
  );
}

function TasteSpectrumChart({
  spectrum,
  t,
  expandedInfos,
  toggleInfo,
}: {
  spectrum: TasteSpectrum;
  t: (key: string) => string;
  expandedInfos: Set<string>;
  toggleInfo: (key: string) => void;
}) {
  const axes: { key: string; value: number; leftKey: string; rightKey: string; hintKey: string; explainKey: string }[] = [
    { key: 'body', value: spectrum.body, leftKey: 'spectrumBodyLeft', rightKey: 'spectrumBodyRight', hintKey: 'spectrumBodyHint', explainKey: 'spectrumBodyExplain' },
    { key: 'tannin', value: spectrum.tannin, leftKey: 'spectrumTanninLeft', rightKey: 'spectrumTanninRight', hintKey: 'spectrumTanninHint', explainKey: 'spectrumTanninExplain' },
    { key: 'sweetness', value: spectrum.sweetness, leftKey: 'spectrumSweetnessLeft', rightKey: 'spectrumSweetnessRight', hintKey: 'spectrumSweetnessHint', explainKey: 'spectrumSweetnessExplain' },
    { key: 'acidity', value: spectrum.acidity, leftKey: 'spectrumAcidityLeft', rightKey: 'spectrumAcidityRight', hintKey: 'spectrumAcidityHint', explainKey: 'spectrumAcidityExplain' },
  ];

  return (
    <section className="rounded-2xl border border-bordeaux-100 bg-white p-5 shadow-soft dark:border-charcoal-700 dark:bg-charcoal-800">
      <h3 className="mb-1 text-center text-sm font-semibold uppercase tracking-wider text-bordeaux-600 dark:text-ivory-200">
        {t('tasteSpectrumTitle')}
      </h3>
      <p className="mb-4 text-center text-xs text-stone-600 dark:text-stone-400">
        {t('spectrumTapToLearn')}
      </p>
      <div className="space-y-1">
        {axes.map((axis) => (
          <SpectrumBar
            key={axis.key}
            value={axis.value}
            leftLabel={t(axis.leftKey)}
            rightLabel={t(axis.rightKey)}
            hint={t(axis.hintKey)}
            explanation={t(axis.explainKey)}
            isExpanded={expandedInfos.has(`spectrum_${axis.key}`)}
            onToggle={() => toggleInfo(`spectrum_${axis.key}`)}
          />
        ))}
      </div>
    </section>
  );
}

function SectionHeading({
  icon,
  title,
  subtitle,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-semibold text-bordeaux-600 dark:text-ivory-200">{title}</h3>
      </div>
      <p className="mt-0.5 text-xs text-stone-600/80 italic dark:text-stone-400/80">{subtitle}</p>
    </div>
  );
}

export function ProfilePage({ userId, profiles: initialProfiles }: ProfilePageProps) {
  const t = useTranslations('profile');
  const router = useRouter();

  const [profiles, setProfiles] = useState<TasteProfile[]>(initialProfiles);
  const [activeTab, setActiveTab] = useState('red');
  const [selectedWine, setSelectedWine] = useState<Record<string, unknown> | null>(null);
  const [displayWine, setDisplayWine] = useState<Record<string, unknown> | null>(null);
  const [displayMatch, setDisplayMatch] = useState<ProfileMatchResult | null>(null);
  const [isFetchingMatch, setIsFetchingMatch] = useState(false);
  const [isFetchingWineDetails, setIsFetchingWineDetails] = useState(false);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [isAddingToCellar, setIsAddingToCellar] = useState(false);
  const [addToCellarWine, setAddToCellarWine] = useState<WineData | null>(null);
  const [expandedInfos, setExpandedInfos] = useState<Set<string>>(new Set());
  const fetchingRef = useRef(false);
  const backfillRequestedRef = useRef<Set<string>>(new Set());

  const toggleInfo = useCallback((key: string) => {
    setExpandedInfos((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const lastFetchRef = useRef(0);

  useEffect(() => {
    if (Date.now() - lastFetchRef.current > 500) {
      setProfiles(initialProfiles);
    }
  }, [initialProfiles]);

  useEffect(() => {
    for (const p of profiles) {
      const pd = p.profile_data;
      const hasContent = pd.overall_style || pd.body_structure || pd.summary;
      const hasSpectrum = pd.taste_spectrum && typeof pd.taste_spectrum.body === 'number';
      const isCalibrated = hasSpectrum && (pd.taste_spectrum as unknown as Record<string, unknown>)?.calibrated === true;
      const key = `${userId}:${p.wine_type}`;

      if (hasContent && !isCalibrated && !backfillRequestedRef.current.has(key)) {
        backfillRequestedRef.current.add(key);
        fetch('/api/profile/backfill-spectrum', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, wineType: p.wine_type }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.spectrum) {
              setProfiles((prev) =>
                prev.map((pr) =>
                  pr.wine_type === p.wine_type
                    ? { ...pr, profile_data: { ...pr.profile_data, taste_spectrum: data.spectrum } }
                    : pr
                )
              );
            }
          })
          .catch(() => {});
      }
    }
  }, [profiles, userId]);

  const refreshProfiles = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const res = await fetch(
        `/api/profile?userId=${encodeURIComponent(userId)}&_t=${Date.now()}`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        lastFetchRef.current = Date.now();
        setProfiles(Array.isArray(data) ? data : []);
      }
    } catch {
    } finally {
      fetchingRef.current = false;
    }
  }, [userId]);

  useEffect(() => {
    if (!selectedWine?.name || !selectedWine?.winery) {
      setDisplayWine(null);
      setDisplayMatch(null);
      setIsFetchingMatch(false);
      return;
    }
    let cancelled = false;
    setDisplayWine(null);
    setDisplayMatch(null);
    setIsFetchingMatch(true);

    if (hasFullWineData(selectedWine)) {
      setDisplayWine(selectedWine);
      fetch('/api/wine-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wine: selectedWine, userId }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (!cancelled) setDisplayMatch(data.match ?? null);
        })
        .catch(() => {})
        .finally(() => { if (!cancelled) setIsFetchingMatch(false); });
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
          setIsFetchingMatch(false);
        } else if (Array.isArray(data.wines) && data.wines.length > 0) {
          const bestWine = data.wines[0];
          setDisplayWine(bestWine);
          fetch('/api/wine-match', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wine: bestWine, userId }),
          })
            .then((r2) => r2.json())
            .then((matchData) => {
              if (!cancelled) setDisplayMatch(matchData.match ?? null);
            })
            .catch(() => {})
            .finally(() => { if (!cancelled) setIsFetchingMatch(false); });
        } else {
          setDisplayWine(selectedWine);
          setIsFetchingMatch(false);
        }
      })
      .catch(() => {
        if (!cancelled) { setDisplayWine(selectedWine); setIsFetchingMatch(false); }
      })
      .finally(() => {
        if (!cancelled) setIsFetchingWineDetails(false);
      });
    return () => { cancelled = true; };
  }, [selectedWine, userId]);

  useEffect(() => {
    router.refresh();
    refreshProfiles();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshProfiles();
    };
    const handleFocus = () => refreshProfiles();
    const handleProfileUpdate = () => refreshProfiles();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('wine-profile-updated', handleProfileUpdate);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('wine-profile-updated', handleProfileUpdate);
    };
  }, [refreshProfiles, router]);

  const wineTypeLabels: Record<string, string> = {
    red: t('red'),
    white: t('white'),
    rose: t('rose'),
  };

  const wineTypeColors: Record<string, string> = {
    red: 'bg-bordeaux-600 text-white',
    white: 'bg-gold-100 text-gold-800',
    rose: 'bg-bordeaux-200 text-bordeaux-800',
  };

  const getProfile = (type: string) =>
    profiles.find((p) => p.wine_type === type)?.profile_data || {};

  const openAddToCellarModal = (wine: WineData) => {
    setAddToCellarWine(wine);
  };

  const handleCellarAdded = () => {
    setIsAddingToCellar(true);
    setTimeout(() => setIsAddingToCellar(false), 2000);
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
    <AppShell>
      <div className="animate-page py-6 md:py-8 lg:py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <PageHeader title={t('title')} />

        <Card>
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
                      <div className="py-8 text-center text-stone-600 dark:text-stone-400">
                        <Wine className="mx-auto h-12 w-12 text-ivory-400 dark:text-charcoal-700" strokeWidth={1.5} />
                        <p className="mt-4">{t('noProfileYet')}</p>
                        <p className="text-sm">{t('addWinesToBuildProfile')}</p>
                        <Button asChild variant="outline" className="mt-4">
                          <Link href="/search" className="inline-flex items-center gap-2">
                            <Search className="h-4 w-4" strokeWidth={1.5} />
                            {t('goToSearch')}
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <>
                        {profile.taste_spectrum && (
                          <TasteSpectrumChart
                            spectrum={profile.taste_spectrum}
                            t={t}
                            expandedInfos={expandedInfos}
                            toggleInfo={toggleInfo}
                          />
                        )}

                        {profile.overall_style && (
                          <section>
                            <SectionHeading
                              title={t('overallStyle')}
                              subtitle={t('overallStyleExplain')}
                            />
                            <p className="mt-2 leading-relaxed text-stone-600 dark:text-stone-400">{profile.overall_style}</p>
                          </section>
                        )}

                        {profile.body_structure && (
                          <section>
                            <SectionHeading
                              title={t('bodyStructure')}
                              subtitle={t('bodyStructureExplain')}
                            />
                            <p className="mt-2 leading-relaxed text-stone-600 dark:text-stone-400">{profile.body_structure}</p>
                          </section>
                        )}

                        {profile.fruit_profile && (
                          <section>
                            <SectionHeading
                              title={t('fruitProfile')}
                              subtitle={t('fruitProfileExplain')}
                            />
                            <p className="mt-2 leading-relaxed text-stone-600 dark:text-stone-400">{profile.fruit_profile}</p>
                          </section>
                        )}

                        {profile.style_notes && (
                          <section>
                            <SectionHeading
                              title={t('styleNotes')}
                              subtitle={t('styleNotesExplain')}
                            />
                            <p className="mt-2 leading-relaxed text-stone-600 dark:text-stone-400">{profile.style_notes}</p>
                          </section>
                        )}

                        {profile.recommended_grapes && profile.recommended_grapes.length > 0 && (
                          <section>
                            <SectionHeading
                              icon={<Grape className="h-4 w-4" strokeWidth={1.5} />}
                              title={t('recommendedGrapes')}
                              subtitle={t('recommendedGrapesExplain')}
                            />
                            <div className="mt-2 flex flex-wrap gap-2">
                              {profile.recommended_grapes.map((grape, idx) => (
                                <span
                                  key={idx}
                                  className="rounded-full bg-bordeaux-50 px-3 py-1 text-sm text-bordeaux-600 dark:bg-bordeaux-900/20 dark:text-bordeaux-300"
                                >
                                  {grape}
                                </span>
                              ))}
                            </div>
                          </section>
                        )}

                        {profile.recommended_regions && profile.recommended_regions.length > 0 && (
                          <section>
                            <SectionHeading
                              icon={<MapPin className="h-4 w-4" strokeWidth={1.5} />}
                              title={t('recommendedRegions')}
                              subtitle={t('recommendedRegionsExplain')}
                            />
                            <div className="mt-2 flex flex-wrap gap-2">
                              {profile.recommended_regions.map((region, idx) => (
                                <span
                                  key={idx}
                                  className="rounded-full bg-copper-50 px-3 py-1 text-sm text-copper-600 dark:bg-copper-700/20 dark:text-copper-300"
                                >
                                  {region}
                                </span>
                              ))}
                            </div>
                          </section>
                        )}

                        {profile.what_to_avoid && profile.what_to_avoid.length > 0 && (
                          <section>
                            <SectionHeading
                              icon={<AlertCircle className="h-4 w-4" strokeWidth={1.5} />}
                              title={t('whatToAvoid')}
                              subtitle={t('whatToAvoidExplain')}
                            />
                            <div className="mt-2 flex flex-wrap gap-2">
                              {profile.what_to_avoid.map((avoid, idx) => (
                                <span
                                  key={idx}
                                  className="rounded-full bg-red-50 px-3 py-1 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
                                >
                                  {avoid}
                                </span>
                              ))}
                            </div>
                          </section>
                        )}

                        {profile.summary && (
                          <section className="rounded-xl bg-ivory-300 p-4 dark:bg-charcoal-700/50">
                            <SectionHeading
                              title={t('summary')}
                              subtitle={t('summaryExplain')}
                            />
                            <p className="mt-2 italic leading-relaxed text-stone-600 dark:text-stone-400">{profile.summary}</p>
                          </section>
                        )}

                        {(profile.liked_wines_detail && profile.liked_wines_detail.length > 0) && (
                          <section>
                            <h3 className="mb-3 flex items-center gap-2 font-semibold text-bordeaux-600 dark:text-ivory-200">
                              <Wine className="h-4 w-4" strokeWidth={1.5} />
                              {t('winesThatBuiltProfile')}
                            </h3>
                            <ul className="space-y-2">
                              {profile.liked_wines_detail.map((w, idx) => {
                                const rowKey = `${w.name}|${w.winery}`;
                                const isRemoving = removingKey === rowKey;
                                return (
                                  <li key={`${type}-${rowKey}-${idx}`}>
                                      <div className="flex items-center gap-2 rounded-2xl bg-white p-3 shadow-soft hover:bg-ivory-50 transition-all duration-200 dark:bg-charcoal-800 dark:hover:bg-charcoal-700">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedWine(w.full_wine ?? { name: w.name, winery: w.winery, country: w.country ?? '', region: w.region, vintage: w.vintage, grapes: w.grapes ?? [], wine_type: (w.wine_type as WineData['wine_type']) ?? 'red', image_url: w.image_url })}
                                        className={cn(
                                          'min-w-0 flex-1 cursor-pointer text-left',
                                          'hover:opacity-80 transition-all duration-200 flex items-center gap-3'
                                        )}
                                      >
                                        {(w.image_url || w.full_wine?.image_url) ? (
                                          <div className="relative h-14 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-ivory-300 dark:bg-charcoal-700">
                                            <img
                                              src={w.image_url || String(w.full_wine?.image_url || '')}
                                              alt={w.name}
                                              className="h-full w-full object-contain"
                                              loading="lazy"
                                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                            />
                                          </div>
                                        ) : (
                                          <div className={cn(
                                            'flex h-14 w-10 flex-shrink-0 items-center justify-center rounded-lg',
                                            w.wine_type === 'white' ? 'bg-gold-100' : w.wine_type === 'rose' ? 'bg-bordeaux-200' : 'bg-bordeaux-600'
                                          )}>
                                            <Wine className={cn(
                                              'h-5 w-5',
                                              w.wine_type === 'white' ? 'text-gold-700' : 'text-white/80'
                                            )} strokeWidth={1.5} />
                                          </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                          <p className="heading-serif text-base text-bordeaux-600 dark:text-ivory-200">{w.name}</p>
                                          <p className="text-sm text-stone-600 dark:text-stone-400">{w.winery}</p>
                                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-600/80 dark:text-stone-400/80">
                                            {w.region && <span>{t('region')}: {w.region}</span>}
                                            {w.country && <span>{t('country')}: {w.country}</span>}
                                            {w.vintage && <span>{t('vintage')}: {w.vintage}</span>}
                                            {w.grapes && w.grapes.length > 0 && <span>{t('grapes')}: {w.grapes.join(', ')}</span>}
                                          </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 flex-shrink-0 text-bordeaux-300 dark:text-bordeaux-400" strokeWidth={1.5} />
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
                                        className="flex-shrink-0 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                                      >
                                        {isRemoving ? (
                                          <span className="text-xs">{t('removing')}</span>
                                        ) : (
                                          <Trash2 className="h-5 w-5" strokeWidth={1.5} />
                                        )}
                                      </Button>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          </section>
                        )}
                        {(!profile.liked_wines_detail || profile.liked_wines_detail.length === 0) &&
                          profile.liked_wines &&
                          profile.liked_wines.length > 0 && (
                          <section>
                            <h3 className="mb-3 flex items-center gap-2 font-semibold text-bordeaux-600 dark:text-ivory-200">
                              <Wine className="h-4 w-4" strokeWidth={1.5} />
                              {t('winesThatBuiltProfile')}
                            </h3>
                            <ul className="space-y-2">
                              {profile.liked_wines.map((name, idx) => {
                                const nameStr = String(name);
                                return (
                                  <li key={`${type}-fallback-${idx}`}>
                                    <WineListItem
                                      name={nameStr}
                                      winery=""
                                      onClick={() => setSelectedWine({ name: nameStr, winery: '', wine_type: type as WineData['wine_type'] })}
                                    />
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
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-bordeaux-200 border-t-bordeaux-500" />
                    <p className="mt-4 text-sm text-stone-600 dark:text-stone-400">{t('loadingWineDetails')}</p>
                  </div>
                ) : (
                  <>
                    <WineCard
                      wine={toWineData(displayWine ?? selectedWine)}
                      matchResult={displayMatch || undefined}
                      matchLoading={isFetchingMatch}
                      onAddToCellar={() => openAddToCellarModal(toWineData(displayWine ?? selectedWine))}
                      isAddingToCellar={isAddingToCellar}
                      uploadedImageUrl={(displayWine ?? selectedWine).image_url ? String((displayWine ?? selectedWine).image_url) : undefined}
                    />
                    {isInProfile && (
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-4 w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                        disabled={removingThis}
                        onClick={() => handleRemoveFromProfile({ name: sn, winery: sw })}
                      >
                        {removingThis ? (
                          <span>{t('removing')}</span>
                        ) : (
                          <>
                            <Trash2 className="me-2 h-4 w-4" strokeWidth={1.5} />
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

      <AddToCellarDialog
        wine={addToCellarWine}
        userId={userId}
        onClose={() => setAddToCellarWine(null)}
        onAdded={handleCellarAdded}
      />

        </div>
      </div>
    </AppShell>
  );
}
