'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Wine,
  Sparkles,
  TrendingUp,
  Clock,
  Heart,
  ChevronRight,
  X,
  Camera,
  BookmarkPlus,
  Compass,
  Loader2,
  Wallet,
  BookOpen,
  Crown,
  GlassWater,
  CircleCheck,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/app-shell';
import { WineLogo } from '@/components/wine-logo';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import type { WineData, ProfileMatchResult } from '@/lib/openai';
import { FeatureTour } from '@/components/feature-tour';
import { useUser } from '@/lib/user-context';

const WineCard = dynamic(() => import('@/components/wine-card').then((m) => m.WineCard), {
  loading: () => <div className="flex items-center justify-center py-12"><div className="h-10 w-10 animate-spin rounded-full border-2 border-bordeaux-200 border-t-bordeaux-500" /></div>,
});

interface HomePageProps {
  userId: string;
  displayName?: string;
}

interface RecentCellarItem {
  id: string;
  wineName: string;
  winery: string;
  createdAt: string;
  imageUrl?: string | null;
  wineType?: string;
  country?: string;
  region?: string;
  grapes?: string[];
  vivinoRating?: number | null;
  vivinoReviews?: number | null;
  alcohol?: number | null;
  tastingNotes?: { nose?: string[]; palate?: string[]; finish?: string } | null;
  serving?: { drink_from?: string; drink_until?: string; decant_minutes?: number; temperature_celsius?: number } | null;
  foodPairings?: string[] | null;
  aiDescription?: string | null;
  purchasePrice?: number | null;
  quantity?: number | null;
}

interface TopCountry {
  name: string;
  count: number;
}

interface OpenWineAlert {
  wineName: string;
  winery: string;
  remaining: number;
  isExpired: boolean;
}

interface Stats {
  winesTasted: number;
  winesOpened: number;
  winesConsumed: number;
  openWineAlerts: OpenWineAlert[];
  bottlesInCellar: number;
  wishlistCount: number;
  readyToDrink: number;
  totalSpent: number;
  cellarItemValues: { id: string; value: number }[];
  displayName?: string;
  expiringWines: number;
  recentCellarItems: RecentCellarItem[];
  wineTypeDistribution: Record<string, number>;
  topCountries: TopCountry[];
  hasRedProfile: boolean;
  hasWhiteProfile: boolean;
  hasRoseProfile: boolean;
  hasSommelierDiscovery: boolean;
  likedWinesCount?: number;
}

const GUIDE_DISMISSED_KEY = 'winejourney_guide_dismissed';

function getTimeGreetingKey(hasName: boolean): string {
  const hour = new Date().getHours();
  if (hour < 12) return hasName ? 'greetingMorning' : 'greetingMorningGuest';
  if (hour < 17) return hasName ? 'greetingAfternoon' : 'greetingAfternoonGuest';
  return hasName ? 'greetingEvening' : 'greetingEveningGuest';
}

function AnimatedNumber({ value, isLoading }: { value: number; isLoading: boolean }) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (isLoading) { setDisplayed(0); return; }
    if (value === 0) { setDisplayed(0); return; }

    let start = 0;
    const duration = 600;
    const step = Math.max(1, Math.ceil(value / (duration / 16)));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) {
        setDisplayed(value);
        clearInterval(timer);
      } else {
        setDisplayed(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value, isLoading]);

  if (isLoading) return <span className="text-muted-foreground/40">—</span>;
  return <>{displayed}</>;
}

const CELEBRATION_KEY = 'winejourney_celebration_v2';

export function HomePage({ userId, displayName: initialDisplayName }: HomePageProps) {
  const t = useTranslations('home');
  const { gender } = useUser();
  const g = { gender };
  const [showCelebration, setShowCelebration] = useState(false);
  const [stats, setStats] = useState<Stats>({
    winesTasted: 0,
    winesOpened: 0,
    winesConsumed: 0,
    openWineAlerts: [],
    bottlesInCellar: 0,
    wishlistCount: 0,
    readyToDrink: 0,
    totalSpent: 0,
    cellarItemValues: [],
    displayName: initialDisplayName,
    expiringWines: 0,
    recentCellarItems: [],
    wineTypeDistribution: {},
    topCountries: [],
    hasRedProfile: false,
    hasWhiteProfile: false,
    hasRoseProfile: false,
    hasSommelierDiscovery: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [guideDismissed, setGuideDismissed] = useState(false);
  const [selectedRecentItem, setSelectedRecentItem] = useState<RecentCellarItem | null>(null);
  const [recentDetailWine, setRecentDetailWine] = useState<WineData | null>(null);
  const [recentDetailMatch, setRecentDetailMatch] = useState<ProfileMatchResult | null>(null);
  const [isFetchingRecentDetails, setIsFetchingRecentDetails] = useState(false);
  const [isFetchingRecentMatch, setIsFetchingRecentMatch] = useState(false);

  useEffect(() => {
    if (!recentDetailWine || !selectedRecentItem) {
      setRecentDetailMatch(null);
      setIsFetchingRecentMatch(false);
      return;
    }
    let cancelled = false;
    setIsFetchingRecentMatch(true);
    setRecentDetailMatch(null);
    fetch('/api/wine-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wine: recentDetailWine, userId }),
    })
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setRecentDetailMatch(data.match ?? null); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsFetchingRecentMatch(false); });
    return () => { cancelled = true; };
  }, [recentDetailWine, selectedRecentItem, userId]);

  useEffect(() => {
    if (!selectedRecentItem) {
      setRecentDetailWine(null);
      setRecentDetailMatch(null);
      return;
    }

    // Build WineData from the already-fetched stats data (instant, no API call)
    const rawNotes = selectedRecentItem.tastingNotes;
    const rawServing = selectedRecentItem.serving;
    const wineFromStats: WineData = {
      name: selectedRecentItem.wineName,
      winery: selectedRecentItem.winery,
      wine_type: (selectedRecentItem.wineType as WineData['wine_type']) || 'red',
      country: selectedRecentItem.country || '',
      region: selectedRecentItem.region || '',
      grapes: selectedRecentItem.grapes || [],
      vivino_rating: selectedRecentItem.vivinoRating ?? undefined,
      vivino_reviews: selectedRecentItem.vivinoReviews ?? undefined,
      alcohol: selectedRecentItem.alcohol ?? undefined,
      tasting_notes: rawNotes ? { nose: rawNotes.nose || [], palate: rawNotes.palate || [], finish: rawNotes.finish || '' } : undefined,
      serving: rawServing ? { drink_from: Number(rawServing.drink_from) || undefined, drink_until: Number(rawServing.drink_until) || undefined, decant_minutes: rawServing.decant_minutes, temperature_celsius: rawServing.temperature_celsius != null ? String(rawServing.temperature_celsius) : undefined } : undefined,
      food_pairings: selectedRecentItem.foodPairings ?? undefined,
      winery_description: selectedRecentItem.aiDescription ?? undefined,
      image_url: selectedRecentItem.imageUrl ?? undefined,
    };

    // If stats already provided full data, use it directly
    if (wineFromStats.country || wineFromStats.grapes?.length) {
      setRecentDetailWine(wineFromStats);
      setIsFetchingRecentDetails(false);
      return;
    }

    // Fallback: fetch from DB (not OpenAI) via the lightweight endpoint
    let cancelled = false;
    setIsFetchingRecentDetails(true);
    setRecentDetailWine(null);

    fetch(`/api/cellar/${selectedRecentItem.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.wine) {
          setRecentDetailWine(data.wine);
        } else {
          setRecentDetailWine(wineFromStats);
        }
      })
      .catch(() => {
        if (!cancelled) setRecentDetailWine(wineFromStats);
      })
      .finally(() => {
        if (!cancelled) setIsFetchingRecentDetails(false);
      });

    return () => { cancelled = true; };
  }, [selectedRecentItem]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/stats?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) return;
      const data = await res.json();
      setStats({
        displayName: data.displayName ?? initialDisplayName ?? undefined,
        winesTasted: data.winesTasted ?? 0,
        winesOpened: data.winesOpened ?? 0,
        winesConsumed: data.winesConsumed ?? 0,
        openWineAlerts: data.openWineAlerts ?? [],
        bottlesInCellar: data.bottlesInCellar ?? 0,
        wishlistCount: data.wishlistCount ?? 0,
        readyToDrink: data.readyToDrink ?? 0,
        totalSpent: data.totalSpent ?? 0,
        cellarItemValues: data.cellarItemValues ?? [],
        expiringWines: data.expiringWines ?? 0,
        recentCellarItems: data.recentCellarItems ?? [],
        wineTypeDistribution: data.wineTypeDistribution ?? {},
        topCountries: data.topCountries ?? [],
        hasRedProfile: data.hasRedProfile ?? false,
        hasWhiteProfile: data.hasWhiteProfile ?? false,
        hasRoseProfile: data.hasRoseProfile ?? false,
        hasSommelierDiscovery: data.hasSommelierDiscovery ?? false,
        likedWinesCount: data.likedWinesCount ?? 0,
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, initialDisplayName]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    const refresh = () => fetchStats();
    window.addEventListener('focus', refresh);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchStats]);

  const rackValue = useMemo(() => {
    if (stats.cellarItemValues.length === 0) return 0;
    try {
      const raw = localStorage.getItem(`cellar-slots:${userId}`);
      if (!raw) return 0;
      const assignments: Record<string, string> = JSON.parse(raw);
      const assignedIds = new Set(Object.keys(assignments));
      return stats.cellarItemValues
        .filter(({ id }) => assignedIds.has(id))
        .reduce((sum, { value }) => sum + value, 0);
    } catch {
      return 0;
    }
  }, [stats.cellarItemValues, userId]);

  const name = stats.displayName || initialDisplayName;
  const greetingKey = getTimeGreetingKey(!!name);
  const greeting = name ? t(greetingKey, { name }) : t(greetingKey);

  const dismissGuide = () => {
    setGuideDismissed(true);
  };

  const hasTasteProfile = stats.hasRedProfile || stats.hasWhiteProfile || stats.hasRoseProfile;
  const hasSearchedWine = stats.winesTasted > 0;
  const hasLikedWine = hasTasteProfile;
  const hasCellarOrWishlist = stats.bottlesInCellar > 0 || stats.wishlistCount > 0;
  const hasUnlockedRecommendations = (stats.likedWinesCount ?? 0) >= 2;
  const celebrationReady = hasSearchedWine && hasLikedWine && hasUnlockedRecommendations;
  const allJourneyComplete = celebrationReady && hasCellarOrWishlist;
  const showJourney = !isLoading && !allJourneyComplete && !guideDismissed;
  const showGuide = false;

  useEffect(() => {
    if (!celebrationReady || isLoading) return;
    if (localStorage.getItem(CELEBRATION_KEY) === 'true') return;
    setShowCelebration(true);
  }, [celebrationReady, isLoading]);

  const typeTotal = Object.values(stats.wineTypeDistribution).reduce((a, b) => a + b, 0);
  const typeEntries = Object.entries(stats.wineTypeDistribution).sort((a, b) => b[1] - a[1]);

  const typeColorMap: Record<string, string> = {
    red: 'bg-bordeaux-500',
    white: 'bg-gold-400',
    rose: 'bg-bordeaux-200',
    sparkling: 'bg-gold-200',
    dessert: 'bg-copper-400',
  };

  const typeLabelMap: Record<string, string> = {
    red: 'typeRed',
    white: 'typeWhite',
    rose: 'typeRose',
    sparkling: 'typeSparkling',
    dessert: 'typeDessert',
  };

  const statCards = [
    {
      label: t('winesOpened'),
      value: stats.winesOpened,
      icon: GlassWater,
      color: 'text-amber-500',
      bg: 'bg-amber-50',
      href: '/cellar?filter=opened&tab=list',
    },
    {
      label: t('winesConsumed'),
      value: stats.winesConsumed,
      icon: CircleCheck,
      color: 'text-bordeaux-500',
      bg: 'bg-bordeaux-50',
      href: '/consumed',
    },
    {
      label: t('bottlesInCellar'),
      value: stats.bottlesInCellar,
      icon: Wine,
      color: 'text-bordeaux-400',
      bg: 'bg-bordeaux-50',
      href: '/cellar',
    },
    {
      label: t('readyToDrink'),
      value: stats.readyToDrink,
      icon: Clock,
      color: 'text-success',
      bg: 'bg-success-muted',
      href: '/cellar?filter=ready&tab=list',
    },
    {
      label: t('wishlistCount'),
      value: stats.wishlistCount,
      icon: Heart,
      color: 'text-ruby-500',
      bg: 'bg-ruby-50',
      href: '/wishlist',
    },
  ];

  return (
    <AppShell>
      <div className="animate-page">
        {/* Header */}
        <header className="relative bg-bordeaux-600 px-4 pb-24 pt-[max(2rem,env(safe-area-inset-top))] dark:bg-charcoal-800 md:rounded-b-2xl">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center gap-2 mb-1 md:hidden">
              <WineLogo size={28} className="text-copper-400" />
              <span className="text-sm font-medium text-bordeaux-200 tracking-wide">WineJourney</span>
            </div>
            <h1 className="heading-serif text-2xl text-white mt-3 md:mt-0">
              {greeting}
            </h1>
          </div>
          <div className="absolute -bottom-px left-0 right-0 h-6 overflow-hidden">
            <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute bottom-0 w-full" preserveAspectRatio="none">
              <path d="M0 48h1440V16C1200 42 960 48 720 48S240 42 0 16v32Z" className="fill-background" />
            </svg>
          </div>
        </header>

        <div className="mx-auto -mt-14 relative z-10 max-w-5xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Interactive Journey Tracker */}
        {showJourney && (
          <Card className="relative overflow-hidden border border-copper-200/40 bg-gradient-to-br from-white to-copper-50/30 dark:from-charcoal-800 dark:to-charcoal-700/30">
            <button
              onClick={dismissGuide}
              className="absolute top-3 end-3 rounded-full p-2 text-muted-foreground hover:bg-muted transition-all duration-150"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <CardContent className="px-5 py-5">
              <p className="text-sm font-semibold text-foreground mb-1">{t('journeyTitle')}</p>
              <p className="text-xs text-muted-foreground mb-4">{t('journeySubtitle', g)}</p>

              {/* Progress bar */}
              <div className="flex gap-1.5 mb-5">
                {[hasSearchedWine, hasLikedWine, hasUnlockedRecommendations, hasCellarOrWishlist].map((done, i) => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${done ? 'bg-bordeaux-500' : 'bg-muted'}`} />
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 sm:gap-3">
                <JourneyStep
                  done={hasSearchedWine}
                  icon={<Camera className="h-4 w-4" strokeWidth={1.5} />}
                  title={t('journeyStep1Title', g)}
                  desc={t('journeyStep1Desc', g)}
                />
                <JourneyStep
                  done={hasLikedWine}
                  icon={<Heart className="h-4 w-4" strokeWidth={1.5} />}
                  title={t('journeyStep2Title', g)}
                  desc={t('journeyStep2Desc', g)}
                />
                <JourneyStep
                  done={hasUnlockedRecommendations}
                  icon={<Compass className="h-4 w-4" strokeWidth={1.5} />}
                  title={t('journeyStep3Title', g)}
                  desc={t('journeyStep3Desc', g)}
                />
                <JourneyStep
                  done={hasCellarOrWishlist}
                  icon={<BookmarkPlus className="h-4 w-4" strokeWidth={1.5} />}
                  title={t('journeyStep4Title', g)}
                  desc={t('journeyStep4Desc', g)}
                />
              </div>

              <button
                onClick={dismissGuide}
                className="mt-4 block w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('guideDismiss')}
              </button>
            </CardContent>
          </Card>
        )}

        {/* Open Wine Alerts */}
        {!isLoading && stats.openWineAlerts.length > 0 && (
          <div className="space-y-2">
            {stats.openWineAlerts.map((alert, idx) => (
              <Card key={idx} className={`overflow-hidden border ${alert.isExpired ? 'border-destructive/40 bg-destructive/5' : 'border-amber-300/40 bg-amber-50/50 dark:bg-amber-900/10'}`}>
                <CardContent className="flex items-center gap-3 p-3">
                  <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${alert.isExpired ? 'bg-destructive/10' : 'bg-amber-100 dark:bg-amber-800/20'}`}>
                    <AlertTriangle className={`h-4 w-4 ${alert.isExpired ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'}`} strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{alert.wineName}</p>
                    <p className={`text-xs ${alert.isExpired ? 'text-destructive' : 'text-amber-700 dark:text-amber-300'}`}>
                      {alert.isExpired ? t('openWineExpired') : t('openWineAlert', { days: Math.abs(alert.remaining) })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {statCards.map((stat, idx) => {
            const card = (
              <Card className={`overflow-hidden ${stat.href ? 'cursor-pointer card-hover' : ''}`}>
                <CardContent className="p-4">
                  <div className={`mb-2 inline-flex rounded-xl p-2.5 ${stat.bg}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} strokeWidth={1.5} />
                  </div>
                  <p className="heading-serif text-2xl text-foreground tabular-nums">
                    <AnimatedNumber value={stat.value} isLoading={isLoading} />
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                </CardContent>
              </Card>
            );
            return stat.href ? (
              <Link key={idx} href={stat.href}>{card}</Link>
            ) : (
              <div key={idx}>{card}</div>
            );
          })}
        </div>

        {/* Spend Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/cellar">
            <Card className="cursor-pointer card-hover">
              <CardContent className="p-4">
                <div className="mb-2 inline-flex rounded-xl p-2.5 bg-copper-50 dark:bg-copper-700/20">
                  <TrendingUp className="h-5 w-5 text-copper-400" strokeWidth={1.5} />
                </div>
                <p className="heading-serif text-2xl text-foreground tabular-nums">
                  {isLoading ? '—' : formatCurrency(stats.totalSpent)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('totalSpent')}</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/cellar">
            <Card className="cursor-pointer card-hover">
              <CardContent className="p-4">
                <div className="mb-2 inline-flex rounded-xl p-2.5 bg-green-50 dark:bg-green-900/20">
                  <Wallet className="h-5 w-5 text-green-500" strokeWidth={1.5} />
                </div>
                <p className="heading-serif text-2xl text-foreground tabular-nums">
                  {isLoading ? '—' : formatCurrency(rackValue)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('currentRackValue')}</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Two-column layout for insights + activity on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">

        {/* Cellar Insights */}
        {!isLoading && stats.bottlesInCellar > 0 && (
          <div>
            <h2 className="mb-3 text-heading text-sm text-foreground uppercase tracking-wider">{t('cellarInsights')}</h2>
            <Card>
              <CardContent className="p-4 space-y-4">
                {typeTotal > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">{t('wineTypes')}</p>
                    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                      {typeEntries.map(([type, count]) => (
                        <div
                          key={type}
                          className={`h-full ${typeColorMap[type] || 'bg-stone-300'} transition-all duration-500`}
                          style={{ width: `${(count / typeTotal) * 100}%` }}
                        />
                      ))}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      {typeEntries.map(([type, count]) => (
                        <div key={type} className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${typeColorMap[type] || 'bg-stone-300'}`} />
                          <span className="text-xs text-muted-foreground">
                            {t(typeLabelMap[type] || type)} ({count})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {stats.topCountries.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">{t('topCountries')}</p>
                    <div className="flex flex-wrap gap-2">
                      {stats.topCountries.map((c) => (
                        <Badge key={c.name} variant="wine">
                          {c.name} ({c.count})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {stats.totalSpent > 0 && stats.bottlesInCellar > 0 && (
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <p className="text-xs text-muted-foreground">{t('avgBottleValue')}</p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(Math.round(stats.totalSpent / stats.bottlesInCellar))}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Activity */}
        {!isLoading && stats.recentCellarItems.length > 0 && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-heading text-sm text-foreground uppercase tracking-wider">{t('recentActivity')}</h2>
              <Link href="/cellar" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                {t('viewAll')}
              </Link>
            </div>
            <div className="space-y-2">
              {stats.recentCellarItems.map((item) => (
                <button key={item.id} onClick={() => setSelectedRecentItem(item)} className="w-full text-start">
                  <Card className="card-hover">
                    <CardContent className="flex items-center gap-3 p-3">
                      <RecentItemImage item={item} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{item.wineName}</p>
                        <p className="truncate text-xs text-muted-foreground">{item.winery}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          </div>
        )}

        </div>{/* close two-column grid */}

        {/* Guide & Plans shortcuts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link href="/guide" className="block">
            <Card className="overflow-hidden border-copper-200/30 bg-gradient-to-r from-copper-50/40 to-ivory-50/60 dark:from-charcoal-700/40 dark:to-charcoal-800/30 dark:border-copper-700/20 card-hover h-full">
              <CardContent className="flex items-center gap-3.5 p-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-copper-100/80 dark:bg-copper-800/30">
                  <BookOpen className="h-5 w-5 text-copper-600 dark:text-copper-400" strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{t('guideCardTitle')}</p>
                  <p className="text-xs text-muted-foreground">{t('guideCardDesc')}</p>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-copper-400" strokeWidth={1.5} />
              </CardContent>
            </Card>
          </Link>
          <Link href="/plans" className="block">
            <Card className="overflow-hidden border-amber-200/30 bg-gradient-to-r from-amber-50/40 to-ivory-50/60 dark:from-charcoal-700/40 dark:to-charcoal-800/30 dark:border-amber-700/20 card-hover h-full">
              <CardContent className="flex items-center gap-3.5 p-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100/80 dark:bg-amber-800/30">
                  <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{t('plansCardTitle')}</p>
                  <p className="text-xs text-muted-foreground">{t('plansCardDesc')}</p>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-amber-400" strokeWidth={1.5} />
              </CardContent>
            </Card>
          </Link>
        </div>

      </div>

      {/* Recent Activity Detail Modal */}
      <Dialog
        open={!!selectedRecentItem}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRecentItem(null);
            setRecentDetailWine(null);
            setRecentDetailMatch(null);
          }
        }}
      >
        <DialogContent
          onClose={() => {
            setSelectedRecentItem(null);
            setRecentDetailWine(null);
            setRecentDetailMatch(null);
          }}
          className="max-w-lg max-h-[90vh] overflow-y-auto"
        >
          {selectedRecentItem && (
            <>
              {isFetchingRecentDetails && !recentDetailWine ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
              ) : recentDetailWine ? (
                <WineCard
                  wine={recentDetailWine}
                  matchResult={recentDetailMatch || undefined}
                  matchLoading={isFetchingRecentMatch}
                />
              ) : null}
            </>
          )}
        </DialogContent>
      </Dialog>
      <FeatureTour />

      {/* Celebration modal — shown once when journey is fully unlocked */}
      <Dialog open={showCelebration} onOpenChange={(open) => {
        if (!open) {
          localStorage.setItem(CELEBRATION_KEY, 'true');
          setShowCelebration(false);
        }
      }}>
        <DialogContent className="max-w-md text-center">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-bordeaux-400 to-bordeaux-600 shadow-lg">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h2 className="heading-serif text-xl text-foreground">{t('celebrationTitle')}</h2>
            <div className="space-y-3 text-sm text-muted-foreground text-start">
              <p>{t('celebrationPier', g)}</p>
              <p>{t('celebrationMatch', g)}</p>
              <p>{t('celebrationGrowing', g)}</p>
            </div>
            <Button
              className="mt-2 w-full"
              onClick={() => {
                localStorage.setItem(CELEBRATION_KEY, 'true');
                setShowCelebration(false);
              }}
            >
              {t('celebrationCta')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      </div>
    </AppShell>
  );
}

function RecentItemImage({ item }: { item: RecentCellarItem }) {
  const [lazyUrl, setLazyUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (item.imageUrl || lazyUrl || loading || fetchedRef.current || !item.wineName) return;
    let cancelled = false;
    setLoading(true);
    fetchedRef.current = true;
    fetch(`/api/wine-image?name=${encodeURIComponent(item.wineName)}&winery=${encodeURIComponent(item.winery)}`)
      .then((r) => r.json())
      .then((data) => { if (!cancelled && data.imageUrl) setLazyUrl(data.imageUrl); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [item.wineName, item.winery, item.imageUrl, lazyUrl, loading]);

  const src = imgError ? null : (item.imageUrl || lazyUrl);

  if (src) {
    return (
      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-ivory-300 dark:bg-charcoal-700">
        <img src={src} alt="" className="h-full w-full object-contain" loading="lazy" onError={() => setImgError(true)} />
      </div>
    );
  }
  if (loading) {
    return (
      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-ivory-300 dark:bg-charcoal-700">
        <div className="h-full w-full animate-pulse bg-gradient-to-b from-ivory-200 to-ivory-400 dark:from-charcoal-600 dark:to-charcoal-800" />
      </div>
    );
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bordeaux-50 dark:bg-bordeaux-900/20">
      <Wine className="h-4 w-4 text-primary" strokeWidth={1.5} />
    </div>
  );
}

function JourneyStep({ done, icon, title, desc }: { done: boolean; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-2 sm:gap-3">
      <div className={`flex h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors ${done ? 'bg-success-muted text-success' : 'bg-muted text-muted-foreground'}`}>
        {icon}
      </div>
      <div className="min-w-0 pt-0.5">
        <p className={`text-[11px] sm:text-xs font-semibold ${done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{title}</p>
        <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed hidden sm:block">{desc}</p>
      </div>
    </div>
  );
}
