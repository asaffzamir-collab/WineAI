'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
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
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BottomNav } from '@/components/bottom-nav';
import { WineLogo } from '@/components/wine-logo';
import { formatCurrency } from '@/lib/utils';

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

  if (isLoading) return <span className="text-wine-300">—</span>;
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
  const [guideDismissed, setGuideDismissed] = useState(true); // default true to avoid flash

  useEffect(() => {
    setGuideDismissed(localStorage.getItem(GUIDE_DISMISSED_KEY) === 'true');
  }, []);

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

  // Build notifications
  const notifications = useMemo(() => {
    if (isLoading) return [];
    const items: { key: string; icon: React.ElementType; text: string; color: string; bg: string; href?: string }[] = [];

    if (stats.readyToDrink > 0) {
      items.push({
        key: 'ready',
        icon: GlassWater,
        text: t('notifReadyToDrink', { count: stats.readyToDrink }),
        color: 'text-green-700',
        bg: 'bg-green-50',
        href: '/cellar',
      });
    }
    if (stats.expiringWines > 0) {
      items.push({
        key: 'expiring',
        icon: AlertTriangle,
        text: t('notifExpiring', { count: stats.expiringWines }),
        color: 'text-amber-700',
        bg: 'bg-amber-50',
        href: '/cellar',
      });
    }
    if (!stats.hasRedProfile) {
      items.push({
        key: 'red-profile',
        icon: User,
        text: t('notifMissingProfile', { type: t('notifProfileRed') }),
        color: 'text-wine-700',
        bg: 'bg-wine-50',
        href: '/profile',
      });
    }
    if (!stats.hasWhiteProfile) {
      items.push({
        key: 'white-profile',
        icon: User,
        text: t('notifMissingProfile', { type: t('notifProfileWhite') }),
        color: 'text-wine-700',
        bg: 'bg-wine-50',
        href: '/profile',
      });
    }
    if (!stats.hasRoseProfile) {
      items.push({
        key: 'rose-profile',
        icon: User,
        text: t('notifMissingProfile', { type: t('notifProfileRose') }),
        color: 'text-wine-700',
        bg: 'bg-wine-50',
        href: '/profile',
      });
    }
    return items;
  }, [isLoading, stats, t]);

  // Wine type distribution for display
  const typeTotal = Object.values(stats.wineTypeDistribution).reduce((a, b) => a + b, 0);
  const typeEntries = Object.entries(stats.wineTypeDistribution).sort((a, b) => b[1] - a[1]);

  const typeColorMap: Record<string, string> = {
    red: 'bg-wine-700',
    white: 'bg-gold-400',
    rose: 'bg-pink-300',
    sparkling: 'bg-sky-300',
    dessert: 'bg-amber-400',
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
      color: 'text-wine-900',
      bg: 'bg-wine-50',
    },
    {
      label: t('bottlesInCellar'),
      value: stats.bottlesInCellar,
      icon: Wine,
      color: 'text-wine-700',
      bg: 'bg-wine-50',
    },
    {
      label: t('readyToDrink'),
      value: stats.readyToDrink,
      icon: Clock,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: t('wishlistCount'),
      value: stats.wishlistCount,
      icon: Heart,
      color: 'text-rose-500',
      bg: 'bg-rose-50',
    },
  ];

  return (
    <div className="min-h-screen bg-cream-50 pb-24">
      {/* ── Header ── */}
      <header className="relative bg-gradient-to-br from-wine-900 via-wine-900 to-wine-800 px-4 pb-16 pt-8">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-2 mb-1">
            <WineLogo size={28} className="text-gold-500" />
            <span className="text-sm font-medium text-wine-300 tracking-wide">WineJourney</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-2">
            {greeting}
          </h1>
        </div>
        {/* Curved bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 h-6 overflow-hidden">
          <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute bottom-0 w-full" preserveAspectRatio="none">
            <path d="M0 48h1440V16C1200 42 960 48 720 48S240 42 0 16v32Z" fill="rgb(254,253,251)" />
          </svg>
        </div>
      </header>

      <div className="mx-auto -mt-10 max-w-lg px-4 space-y-6">
        {/* ── Getting-Started Guide ── */}
        {showGuide && (
          <Card className="relative overflow-hidden border-gold-300/50 bg-gradient-to-br from-white to-gold-50/40">
            <button
              onClick={dismissGuide}
              className="absolute top-3 end-3 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
            <CardContent className="px-5 py-5">
              <p className="text-sm font-semibold text-wine-900 mb-4">{t('guideTitle')}</p>
              <div className="grid grid-cols-3 gap-3">
                {/* Step 1 */}
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-wine-100">
                    <Camera className="h-5 w-5 text-wine-700" />
                  </div>
                  <p className="text-xs font-semibold text-wine-900">{t('guideStep1Title')}</p>
                  <p className="text-[11px] leading-tight text-gray-500">{t('guideStep1Desc')}</p>
                </div>
                {/* Step 2 */}
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-100">
                    <BookmarkPlus className="h-5 w-5 text-gold-700" />
                  </div>
                  <p className="text-xs font-semibold text-wine-900">{t('guideStep2Title')}</p>
                  <p className="text-[11px] leading-tight text-gray-500">{t('guideStep2Desc')}</p>
                </div>
                {/* Step 3 */}
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                    <Compass className="h-5 w-5 text-green-700" />
                  </div>
                  <p className="text-xs font-semibold text-wine-900">{t('guideStep3Title')}</p>
                  <p className="text-[11px] leading-tight text-gray-500">{t('guideStep3Desc')}</p>
                </div>
              </div>
              <button
                onClick={dismissGuide}
                className="mt-4 block w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                {t('guideDismiss')}
              </button>
            </CardContent>
          </Card>
        )}

        {/* ── Notifications ── */}
        {notifications.length > 0 && (
          <div className="space-y-2">
            {notifications.slice(0, 2).map((notif) => {
              const Icon = notif.icon;
              const content = (
                <>
                  <Icon className={`h-4 w-4 shrink-0 ${notif.color}`} />
                  <span className={`text-sm ${notif.color}`}>{notif.text}</span>
                  {notif.href && <ChevronRight className={`ms-auto h-4 w-4 ${notif.color} opacity-50`} />}
                </>
              );
              const className = `flex items-center gap-3 rounded-xl px-4 py-3 ${notif.bg} transition-all hover:opacity-90`;

              return notif.href ? (
                <Link key={notif.key} href={notif.href} className={className}>
                  {content}
                </Link>
              ) : (
                <div key={notif.key} className={className}>
                  {content}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 gap-3">
          {statCards.map((stat, idx) => (
            <Card key={idx} className="overflow-hidden">
              <CardContent className="p-4">
                <div className={`mb-2 inline-flex rounded-xl p-2.5 ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <p className="text-2xl font-bold text-wine-900">
                  <AnimatedNumber value={stat.value} isLoading={isLoading} />
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Total Spent ── */}
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-gray-500">{t('totalSpent')}</p>
              <p className="text-2xl font-bold text-wine-900">
                {isLoading ? '—' : formatCurrency(stats.totalSpent)}
              </p>
            </div>
            <div className="rounded-2xl bg-gold-100 p-3">
              <TrendingUp className="h-6 w-6 text-gold-600" />
            </div>
          </CardContent>
        </Card>

        {/* ── Cellar Insights ── */}
        {!isLoading && stats.bottlesInCellar > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-semibold text-wine-900">{t('cellarInsights')}</h2>
            <Card>
              <CardContent className="p-4 space-y-4">
                {/* Wine type distribution bar */}
                {typeTotal > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">{t('wineTypes')}</p>
                    <div className="flex h-3 w-full overflow-hidden rounded-full bg-cream-200">
                      {typeEntries.map(([type, count]) => (
                        <div
                          key={type}
                          className={`h-full ${typeColorMap[type] || 'bg-gray-300'} transition-all duration-500`}
                          style={{ width: `${(count / typeTotal) * 100}%` }}
                        />
                      ))}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      {typeEntries.map(([type, count]) => (
                        <div key={type} className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${typeColorMap[type] || 'bg-gray-300'}`} />
                          <span className="text-[11px] text-gray-600">
                            {t(typeLabelMap[type] || type)} ({count})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top countries */}
                {stats.topCountries.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">{t('topCountries')}</p>
                    <div className="flex flex-wrap gap-2">
                      {stats.topCountries.map((c) => (
                        <span
                          key={c.name}
                          className="rounded-full bg-cream-200 px-3 py-1 text-xs font-medium text-wine-800"
                        >
                          {c.name} ({c.count})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Avg bottle value */}
                {stats.totalSpent > 0 && stats.bottlesInCellar > 0 && (
                  <div className="flex items-center justify-between border-t border-cream-200 pt-3">
                    <p className="text-xs text-gray-500">{t('avgBottleValue')}</p>
                    <p className="text-sm font-semibold text-wine-900">
                      {formatCurrency(Math.round(stats.totalSpent / stats.bottlesInCellar))}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Recent Activity ── */}
        {!isLoading && stats.recentCellarItems.length > 0 && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-wine-900">{t('recentActivity')}</h2>
              <Link href="/cellar" className="text-xs font-medium text-wine-600 hover:text-wine-800 transition-colors">
                {t('viewAll')}
              </Link>
            </div>
            <div className="space-y-2">
              {stats.recentCellarItems.map((item) => (
                <Link key={item.id} href="/cellar">
                  <Card className="hover:bg-cream-50 transition-colors">
                    <CardContent className="flex items-center gap-3 p-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-wine-50">
                        <Wine className="h-4 w-4 text-wine-700" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-wine-900">{item.wineName}</p>
                        <p className="truncate text-xs text-gray-400">{item.winery}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Quick Actions ── */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-wine-900">
            {t('quickActions')}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/search">
              <Button variant="secondary" className="h-auto w-full flex-col gap-2 py-5 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-wine-100">
                  <Search className="h-5 w-5 text-wine-700" />
                </div>
                <span className="text-sm">{t('searchWine')}</span>
              </Button>
            </Link>
            <Link href="/cellar">
              <Button variant="secondary" className="h-auto w-full flex-col gap-2 py-5 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-wine-100">
                  <Wine className="h-5 w-5 text-wine-700" />
                </div>
                <span className="text-sm">{t('viewCellar')}</span>
              </Button>
            </Link>
            <Link href="/profile">
              <Button variant="secondary" className="h-auto w-full flex-col gap-2 py-5 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-100">
                  <Sparkles className="h-5 w-5 text-gold-700" />
                </div>
                <span className="text-sm">{t('viewProfile')}</span>
              </Button>
            </Link>
            <Link href="/wishlist">
              <Button variant="secondary" className="h-auto w-full flex-col gap-2 py-5 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
                  <Heart className="h-5 w-5 text-rose-500" />
                </div>
                <span className="text-sm">{t('viewWishlist')}</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
