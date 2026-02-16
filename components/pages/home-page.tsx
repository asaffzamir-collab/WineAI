'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Wine,
  Search,
  Sparkles,
  TrendingUp,
  Clock,
  GlassWater,
  Heart,
  AlertTriangle,
  User,
  ChevronRight,
  X,
  Camera,
  BookmarkPlus,
  Compass,
  Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { BottomNav } from '@/components/bottom-nav';
import { WineLogo } from '@/components/wine-logo';
import { formatCurrency } from '@/lib/utils';
import type { WineData } from '@/lib/openai';

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
}

interface TopCountry {
  name: string;
  count: number;
}

interface Stats {
  winesTasted: number;
  bottlesInCellar: number;
  wishlistCount: number;
  readyToDrink: number;
  totalSpent: number;
  displayName?: string;
  expiringWines: number;
  recentCellarItems: RecentCellarItem[];
  wineTypeDistribution: Record<string, number>;
  topCountries: TopCountry[];
  hasRedProfile: boolean;
  hasWhiteProfile: boolean;
  hasRoseProfile: boolean;
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

  if (isLoading) return <span className="text-bordeaux-200">—</span>;
  return <>{displayed}</>;
}

export function HomePage({ userId, displayName: initialDisplayName }: HomePageProps) {
  const t = useTranslations('home');
  const [stats, setStats] = useState<Stats>({
    winesTasted: 0,
    bottlesInCellar: 0,
    wishlistCount: 0,
    readyToDrink: 0,
    totalSpent: 0,
    displayName: initialDisplayName,
    expiringWines: 0,
    recentCellarItems: [],
    wineTypeDistribution: {},
    topCountries: [],
    hasRedProfile: false,
    hasWhiteProfile: false,
    hasRoseProfile: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [guideDismissed, setGuideDismissed] = useState(true);
  const [selectedRecentItem, setSelectedRecentItem] = useState<RecentCellarItem | null>(null);
  const [recentDetailWine, setRecentDetailWine] = useState<WineData | null>(null);
  const [isFetchingRecentDetails, setIsFetchingRecentDetails] = useState(false);

  useEffect(() => {
    setGuideDismissed(localStorage.getItem(GUIDE_DISMISSED_KEY) === 'true');
  }, []);

  useEffect(() => {
    if (!selectedRecentItem) {
      setRecentDetailWine(null);
      return;
    }

    let cancelled = false;
    setIsFetchingRecentDetails(true);
    setRecentDetailWine(null);

    const query = `${selectedRecentItem.wineName} ${selectedRecentItem.winery}`;
    fetch('/api/wine-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, userId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.wine) {
          setRecentDetailWine(data.wine);
        } else {
          setRecentDetailWine({
            name: selectedRecentItem.wineName,
            winery: selectedRecentItem.winery,
            wine_type: 'red',
            country: '',
            grapes: [],
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRecentDetailWine({
            name: selectedRecentItem.wineName,
            winery: selectedRecentItem.winery,
            wine_type: 'red',
            country: '',
            grapes: [],
          });
        }
      })
      .finally(() => {
        if (!cancelled) setIsFetchingRecentDetails(false);
      });

    return () => { cancelled = true; };
  }, [selectedRecentItem, userId]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/stats?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) return;
      const data = await res.json();
      setStats({
        displayName: data.displayName ?? initialDisplayName ?? undefined,
        winesTasted: data.winesTasted ?? 0,
        bottlesInCellar: data.bottlesInCellar ?? 0,
        wishlistCount: data.wishlistCount ?? 0,
        readyToDrink: data.readyToDrink ?? 0,
        totalSpent: data.totalSpent ?? 0,
        expiringWines: data.expiringWines ?? 0,
        recentCellarItems: data.recentCellarItems ?? [],
        wineTypeDistribution: data.wineTypeDistribution ?? {},
        topCountries: data.topCountries ?? [],
        hasRedProfile: data.hasRedProfile ?? false,
        hasWhiteProfile: data.hasWhiteProfile ?? false,
        hasRoseProfile: data.hasRoseProfile ?? false,
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

  const name = stats.displayName || initialDisplayName;
  const greetingKey = getTimeGreetingKey(!!name);
  const greeting = name ? t(greetingKey, { name }) : t(greetingKey);

  const dismissGuide = () => {
    localStorage.setItem(GUIDE_DISMISSED_KEY, 'true');
    setGuideDismissed(true);
  };

  const showGuide = !guideDismissed && !isLoading && stats.bottlesInCellar === 0 && stats.winesTasted === 0;

  const notifications = useMemo(() => {
    if (isLoading) return [];
    const items: { key: string; icon: React.ElementType; text: string; color: string; bg: string; href?: string }[] = [];

    if (stats.readyToDrink > 0) {
      items.push({
        key: 'ready',
        icon: GlassWater,
        text: t('notifReadyToDrink', { count: stats.readyToDrink }),
        color: 'text-success',
        bg: 'bg-success-muted',
        href: '/cellar',
      });
    }
    if (stats.expiringWines > 0) {
      items.push({
        key: 'expiring',
        icon: AlertTriangle,
        text: t('notifExpiring', { count: stats.expiringWines }),
        color: 'text-warning',
        bg: 'bg-warning-muted',
        href: '/cellar',
      });
    }
    if (!stats.hasRedProfile) {
      items.push({
        key: 'red-profile',
        icon: User,
        text: t('notifMissingProfile', { type: t('notifProfileRed') }),
        color: 'text-bordeaux-500',
        bg: 'bg-bordeaux-50',
        href: '/profile',
      });
    }
    if (!stats.hasWhiteProfile) {
      items.push({
        key: 'white-profile',
        icon: User,
        text: t('notifMissingProfile', { type: t('notifProfileWhite') }),
        color: 'text-bordeaux-500',
        bg: 'bg-bordeaux-50',
        href: '/profile',
      });
    }
    if (!stats.hasRoseProfile) {
      items.push({
        key: 'rose-profile',
        icon: User,
        text: t('notifMissingProfile', { type: t('notifProfileRose') }),
        color: 'text-bordeaux-500',
        bg: 'bg-bordeaux-50',
        href: '/profile',
      });
    }
    return items;
  }, [isLoading, stats, t]);

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
      label: t('winesTasted'),
      value: stats.winesTasted,
      icon: Sparkles,
      color: 'text-bordeaux-500',
      bg: 'bg-bordeaux-50',
      href: '/cellar',
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
      href: '/cellar?filter=ready',
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
    <div className="min-h-screen bg-ivory-200 pb-24 dark:bg-charcoal-900">
      {/* Header */}
      <header className="relative bg-bordeaux-600 px-4 pb-10 pt-8 dark:bg-charcoal-900 dark:border-b dark:border-charcoal-700">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-2 mb-1">
            <WineLogo size={28} className="text-copper-400" />
            <span className="text-sm font-medium text-bordeaux-200 tracking-wide">WineJourney</span>
          </div>
          <h1 className="heading-serif text-2xl text-white mt-3">
            {greeting}
          </h1>
        </div>
        <div className="absolute -bottom-px left-0 right-0 h-6 overflow-hidden">
          <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute bottom-0 w-full" preserveAspectRatio="none">
            <path d="M0 48h1440V16C1200 42 960 48 720 48S240 42 0 16v32Z" className="fill-ivory-200 dark:fill-charcoal-900" />
          </svg>
        </div>
      </header>

      <div className="mx-auto -mt-4 max-w-lg px-4 space-y-8 animate-page">
        {/* Getting-Started Guide */}
        {showGuide && (
          <Card className="relative overflow-hidden border border-copper-200/40 bg-gradient-to-br from-white to-copper-50/30 dark:from-charcoal-800 dark:to-charcoal-700/30">
            <button
              onClick={dismissGuide}
              className="absolute top-3 end-3 rounded-full p-2 text-stone-600 hover:bg-ivory-300 hover:text-stone-600 transition-all duration-200 dark:hover:bg-charcoal-700"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <CardContent className="px-5 py-5">
              <p className="text-sm font-semibold text-bordeaux-600 mb-4 dark:text-ivory-200">{t('guideTitle')}</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bordeaux-50 dark:bg-bordeaux-900/30">
                    <Camera className="h-5 w-5 text-bordeaux-500 dark:text-bordeaux-300" strokeWidth={1.5} />
                  </div>
                  <p className="text-xs font-semibold text-bordeaux-600 dark:text-ivory-200">{t('guideStep1Title')}</p>
                  <p className="text-xs leading-tight text-stone-600 dark:text-stone-400">{t('guideStep1Desc')}</p>
                </div>
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-copper-50 dark:bg-copper-700/20">
                    <BookmarkPlus className="h-5 w-5 text-copper-500 dark:text-copper-400" strokeWidth={1.5} />
                  </div>
                  <p className="text-xs font-semibold text-bordeaux-600 dark:text-ivory-200">{t('guideStep2Title')}</p>
                  <p className="text-xs leading-tight text-stone-600 dark:text-stone-400">{t('guideStep2Desc')}</p>
                </div>
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/20">
                    <Compass className="h-5 w-5 text-green-700 dark:text-green-400" strokeWidth={1.5} />
                  </div>
                  <p className="text-xs font-semibold text-bordeaux-600 dark:text-ivory-200">{t('guideStep3Title')}</p>
                  <p className="text-xs leading-tight text-stone-600 dark:text-stone-400">{t('guideStep3Desc')}</p>
                </div>
              </div>
              <button
                onClick={dismissGuide}
                className="mt-4 block w-full text-center text-xs text-stone-600 hover:text-stone-600 transition-colors dark:text-stone-400"
              >
                {t('guideDismiss')}
              </button>
            </CardContent>
          </Card>
        )}

        {/* Notifications removed — stats grid provides same info */}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {statCards.map((stat, idx) => (
            <Link key={idx} href={stat.href}>
              <Card className="overflow-hidden cursor-pointer hover:shadow-soft-lg hover:translate-y-[-1px] hover:bg-ivory-50 dark:hover:bg-charcoal-700 transition-all duration-200">
                <CardContent className="p-4">
                  <div className={`mb-2 inline-flex rounded-xl p-2.5 ${stat.bg}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} strokeWidth={1.5} />
                  </div>
                  <p className="heading-serif text-2xl text-bordeaux-600 tabular-nums dark:text-ivory-200">
                    <AnimatedNumber value={stat.value} isLoading={isLoading} />
                  </p>
                  <p className="text-xs text-stone-600 mt-0.5 dark:text-stone-400">{stat.label}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Total Spent */}
        <Link href="/cellar" className="block">
          <Card className="cursor-pointer hover:shadow-soft-lg hover:translate-y-[-1px] hover:bg-ivory-50 dark:hover:bg-charcoal-700 transition-all duration-200">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-stone-600 dark:text-stone-400">{t('totalSpent')}</p>
                <p className="heading-serif text-2xl text-bordeaux-600 tabular-nums dark:text-ivory-200">
                  {isLoading ? '—' : formatCurrency(stats.totalSpent)}
                </p>
              </div>
              <div className="rounded-2xl bg-copper-50 p-3 dark:bg-copper-700/20">
                <TrendingUp className="h-6 w-6 text-copper-400" strokeWidth={1.5} />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Cellar Insights */}
        {!isLoading && stats.bottlesInCellar > 0 && (
          <div>
            <h2 className="mb-3 heading-serif text-sm text-bordeaux-600 uppercase tracking-wider dark:text-ivory-200">{t('cellarInsights')}</h2>
            <Card>
              <CardContent className="p-4 space-y-4">
                {typeTotal > 0 && (
                  <div>
                    <p className="text-xs text-stone-600 mb-2 dark:text-stone-400">{t('wineTypes')}</p>
                    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-ivory-300 dark:bg-charcoal-700">
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
                          <span className="text-xs text-stone-600 dark:text-stone-400">
                            {t(typeLabelMap[type] || type)} ({count})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {stats.topCountries.length > 0 && (
                  <div>
                    <p className="text-xs text-stone-600 mb-2 dark:text-stone-400">{t('topCountries')}</p>
                    <div className="flex flex-wrap gap-2">
                      {stats.topCountries.map((c) => (
                        <span
                          key={c.name}
                          className="rounded-full bg-ivory-300 px-3 py-1 text-xs font-medium text-bordeaux-500 dark:bg-charcoal-700 dark:text-bordeaux-300"
                        >
                          {c.name} ({c.count})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {stats.totalSpent > 0 && stats.bottlesInCellar > 0 && (
                  <div className="flex items-center justify-between border-t border-ivory-300 pt-3 dark:border-charcoal-700">
                    <p className="text-xs text-stone-600 dark:text-stone-400">{t('avgBottleValue')}</p>
                    <p className="text-sm font-semibold text-bordeaux-600 dark:text-ivory-200">
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
              <h2 className="heading-serif text-sm text-bordeaux-600 uppercase tracking-wider dark:text-ivory-200">{t('recentActivity')}</h2>
              <Link href="/cellar" className="text-xs font-medium text-bordeaux-400 hover:text-bordeaux-600 transition-colors dark:text-bordeaux-300">
                {t('viewAll')}
              </Link>
            </div>
            <div className="space-y-2">
              {stats.recentCellarItems.map((item) => (
                <button key={item.id} onClick={() => setSelectedRecentItem(item)} className="w-full text-start">
                  <Card className="hover:shadow-soft-lg hover:translate-y-[-1px] hover:bg-ivory-50 dark:hover:bg-charcoal-700 transition-all duration-200">
                    <CardContent className="flex items-center gap-3 p-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bordeaux-50 dark:bg-bordeaux-900/20">
                        <Wine className="h-4 w-4 text-bordeaux-500 dark:text-bordeaux-300" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-bordeaux-600 dark:text-ivory-200">{item.wineName}</p>
                        <p className="truncate text-xs text-stone-600 dark:text-stone-400">{item.winery}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-stone-400" strokeWidth={1.5} />
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h2 className="mb-3 heading-serif text-sm text-bordeaux-600 uppercase tracking-wider dark:text-ivory-200">
            {t('quickActions')}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/search">
              <Button variant="secondary" className="h-auto w-full flex-col gap-2 py-5 shadow-soft rounded-2xl">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bordeaux-50 dark:bg-bordeaux-900/20">
                  <Search className="h-5 w-5 text-bordeaux-500 dark:text-bordeaux-300" strokeWidth={1.5} />
                </div>
                <span className="text-sm">{t('searchWine')}</span>
              </Button>
            </Link>
            <Link href="/cellar">
              <Button variant="secondary" className="h-auto w-full flex-col gap-2 py-5 shadow-soft rounded-2xl">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bordeaux-50 dark:bg-bordeaux-900/20">
                  <Wine className="h-5 w-5 text-bordeaux-500 dark:text-bordeaux-300" strokeWidth={1.5} />
                </div>
                <span className="text-sm">{t('viewCellar')}</span>
              </Button>
            </Link>
            <Link href="/profile">
              <Button variant="secondary" className="h-auto w-full flex-col gap-2 py-5 shadow-soft rounded-2xl">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-copper-50 dark:bg-copper-700/20">
                  <Sparkles className="h-5 w-5 text-copper-400" strokeWidth={1.5} />
                </div>
                <span className="text-sm">{t('viewProfile')}</span>
              </Button>
            </Link>
            <Link href="/wishlist">
              <Button variant="secondary" className="h-auto w-full flex-col gap-2 py-5 shadow-soft rounded-2xl">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ruby-50 dark:bg-ruby-900/20">
                  <Heart className="h-5 w-5 text-ruby-500 dark:text-ruby-400" strokeWidth={1.5} />
                </div>
                <span className="text-sm">{t('viewWishlist')}</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity Detail Modal */}
      <Dialog
        open={!!selectedRecentItem}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRecentItem(null);
            setRecentDetailWine(null);
          }
        }}
      >
        <DialogContent
          onClose={() => {
            setSelectedRecentItem(null);
            setRecentDetailWine(null);
          }}
          className="max-w-lg"
        >
          {selectedRecentItem && (
            <>
              {isFetchingRecentDetails && !recentDetailWine ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-10 w-10 animate-spin text-bordeaux-400" />
                </div>
              ) : recentDetailWine ? (
                <WineCard wine={recentDetailWine} />
              ) : null}
            </>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
