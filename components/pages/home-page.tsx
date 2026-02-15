'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Wine, Search, Sparkles, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BottomNav } from '@/components/bottom-nav';
import { formatCurrency } from '@/lib/utils';

interface HomePageProps {
  userId: string;
  /** Display name from /api/me; used for greeting until stats load, then stats can override */
  displayName?: string;
}

interface Stats {
  winesTasted: number;
  bottlesInCellar: number;
  wishlistCount: number;
  readyToDrink: number;
  totalSpent: number;
  displayName?: string;
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
  });
  const [isLoading, setIsLoading] = useState(true);

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
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, initialDisplayName]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Re-fetch stats when user returns to the tab or window so dashboard stays in sync (e.g. after adding a wine)
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
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
  ];

  return (
    <div className="min-h-screen bg-cream-50 pb-20">
      {/* Header */}
      <header className="bg-gradient-to-r from-wine-900 to-wine-800 px-4 pb-12 pt-8">
        <div className="mx-auto max-w-lg">
          <h1 className="text-2xl font-bold text-white">
            {(stats.displayName || initialDisplayName)
              ? t('welcome', { name: stats.displayName || initialDisplayName || '' })
              : t('welcomeGuest')}
          </h1>
          <p className="mt-1 text-wine-200">WineJourney</p>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="mx-auto -mt-8 max-w-lg px-4">
        <div className="grid grid-cols-3 gap-3">
          {statCards.map((stat, idx) => (
            <Card key={idx} className="overflow-hidden">
              <CardContent className="p-4">
                <div className={`mb-2 inline-flex rounded-lg p-2 ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <p className="text-2xl font-bold text-wine-900">
                  {isLoading ? '—' : stat.value}
                </p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Total Spent Card */}
        <Card className="mt-3">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-gray-500">{t('totalSpent')}</p>
              <p className="text-2xl font-bold text-wine-900">
                {isLoading ? '—' : formatCurrency(stats.totalSpent)}
              </p>
            </div>
            <div className="rounded-full bg-gold-100 p-3">
              <TrendingUp className="h-6 w-6 text-gold-600" />
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-wine-900">
            {t('quickActions')}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/search">
              <Button variant="secondary" className="h-auto w-full flex-col gap-2 py-4">
                <Search className="h-6 w-6 text-wine-700" />
                <span>{t('searchWine')}</span>
              </Button>
            </Link>
            <Link href="/cellar">
              <Button variant="secondary" className="h-auto w-full flex-col gap-2 py-4">
                <Wine className="h-6 w-6 text-wine-700" />
                <span>{t('viewCellar')}</span>
              </Button>
            </Link>
            <Link href="/profile">
              <Button variant="secondary" className="h-auto w-full flex-col gap-2 py-4">
                <Sparkles className="h-6 w-6 text-wine-700" />
                <span>{t('viewProfile')}</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
