'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Crown,
  Check,
  X,
  Search,
  MessageCircle,
  Wine,
  Heart,
  UtensilsCrossed,
  Moon,
  ShoppingBag,
  BarChart3,
  TrendingUp,
  Compass,
  Sparkles,
  Package,
  ChevronDown,
  ChevronUp,
  PartyPopper,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { usePremium } from '@/lib/use-premium';
import { cn } from '@/lib/utils';

type BillingCycle = 'monthly' | 'annual';

interface TierFeature {
  label: string;
  free: string | boolean;
  plus: string | boolean;
  pro: string | boolean;
  icon: React.ReactNode;
}

export function PlansPage() {
  const t = useTranslations('plans');
  const { paywallActive } = usePremium();
  const [billing, setBilling] = useState<BillingCycle>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const isBeta = !paywallActive;

  const features: TierFeature[] = [
    {
      label: t('searchesPerMonth', { count: '5 / 40 / 150' }),
      free: t('searchesPerMonth', { count: '5' }),
      plus: t('searchesPerMonth', { count: '40' }),
      pro: t('searchesPerMonth', { count: '150' }),
      icon: <Search className="h-4 w-4" strokeWidth={1.5} />,
    },
    {
      label: t('pierPerMonth', { count: '5 / 40 / 150' }),
      free: t('pierPerMonth', { count: '5' }),
      plus: t('pierPerMonth', { count: '40' }),
      pro: t('pierPerMonth', { count: '150' }),
      icon: <MessageCircle className="h-4 w-4" strokeWidth={1.5} />,
    },
    {
      label: t('tasteFull'),
      free: true,
      plus: true,
      pro: true,
      icon: <Heart className="h-4 w-4" strokeWidth={1.5} />,
    },
    {
      label: t('wishlistUnlimited'),
      free: true,
      plus: true,
      pro: true,
      icon: <Wine className="h-4 w-4" strokeWidth={1.5} />,
    },
    {
      label: t('cellarLocked'),
      free: false,
      plus: t('cellarLimit', { count: '30' }),
      pro: t('cellarLimit', { count: '500' }),
      icon: <Wine className="h-4 w-4" strokeWidth={1.5} />,
    },
    {
      label: t('foodPairing'),
      free: false,
      plus: false,
      pro: true,
      icon: <UtensilsCrossed className="h-4 w-4" strokeWidth={1.5} />,
    },
    {
      label: t('tonightMode'),
      free: false,
      plus: false,
      pro: true,
      icon: <Moon className="h-4 w-4" strokeWidth={1.5} />,
    },
    {
      label: t('buyingIntel'),
      free: false,
      plus: false,
      pro: true,
      icon: <ShoppingBag className="h-4 w-4" strokeWidth={1.5} />,
    },
    {
      label: t('cellarIntel'),
      free: false,
      plus: false,
      pro: true,
      icon: <BarChart3 className="h-4 w-4" strokeWidth={1.5} />,
    },
    {
      label: t('tasteEvolution'),
      free: false,
      plus: false,
      pro: true,
      icon: <TrendingUp className="h-4 w-4" strokeWidth={1.5} />,
    },
    {
      label: t('wineDiscovery'),
      free: false,
      plus: false,
      pro: true,
      icon: <Compass className="h-4 w-4" strokeWidth={1.5} />,
    },
    {
      label: t('smartRecs'),
      free: false,
      plus: false,
      pro: true,
      icon: <Sparkles className="h-4 w-4" strokeWidth={1.5} />,
    },
    {
      label: t('overagePacks'),
      free: false,
      plus: false,
      pro: true,
      icon: <Package className="h-4 w-4" strokeWidth={1.5} />,
    },
  ];

  const premiumHighlights = [
    { title: t('feature1Title'), desc: t('feature1Desc'), icon: <MessageCircle className="h-6 w-6" strokeWidth={1.5} /> },
    { title: t('feature2Title'), desc: t('feature2Desc'), icon: <Moon className="h-6 w-6" strokeWidth={1.5} /> },
    { title: t('feature3Title'), desc: t('feature3Desc'), icon: <Compass className="h-6 w-6" strokeWidth={1.5} /> },
    { title: t('feature4Title'), desc: t('feature4Desc'), icon: <BarChart3 className="h-6 w-6" strokeWidth={1.5} /> },
  ];

  const faqs = [
    { q: t('faq1Q'), a: t('faq1A') },
    { q: t('faq2Q'), a: t('faq2A') },
    { q: t('faq3Q'), a: t('faq3A') },
    { q: t('faq4Q'), a: t('faq4A') },
  ];

  const plusPrice = billing === 'monthly' ? t('plusMonthly') : t('plusAnnual');
  const proPrice = billing === 'monthly' ? t('proMonthly') : t('proAnnual');
  const perLabel = billing === 'monthly' ? t('month') : t('year');

  return (
    <AppShell>
      <div className="animate-page pt-[max(1.5rem,calc(env(safe-area-inset-top)+0.75rem))] pb-6 md:pt-8 md:pb-8 lg:pt-10 lg:pb-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <PageHeader title={t('title')} description={t('subtitle')} />

          {/* Beta Banner */}
          {isBeta && (
            <div className="mb-8 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-5 dark:border-emerald-800 dark:from-emerald-950/30 dark:to-teal-950/30">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                  <PartyPopper className="h-5 w-5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
                </div>
                <p className="text-sm leading-relaxed text-emerald-800 dark:text-emerald-200">
                  {t('betaBanner')}
                </p>
              </div>
            </div>
          )}

          {/* Billing Toggle */}
          <div className="mb-8 flex items-center justify-center gap-2">
            <div className="inline-flex rounded-xl bg-muted p-1">
              <button
                onClick={() => setBilling('monthly')}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150',
                  billing === 'monthly'
                    ? 'bg-card text-foreground shadow-soft'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t('monthly')}
              </button>
              <button
                onClick={() => setBilling('annual')}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150',
                  billing === 'annual'
                    ? 'bg-card text-foreground shadow-soft'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t('annual')}
                {billing !== 'annual' && (
                  <span className="ms-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    {t('savePercent', { percent: '25' })}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Tier Cards */}
          <div className={cn('grid gap-4 md:grid-cols-3', isBeta && 'opacity-60')}>
            {/* Free */}
            <Card className="relative overflow-hidden border-2 border-muted">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-foreground">{t('free')}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{t('freeDesc')}</p>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-foreground">{t('currencySymbol')}0</span>
                  <span className="ms-1 text-sm text-muted-foreground">/ {t('month')}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{t('freePriceLabel')}</p>
                <button
                  disabled
                  className="mt-5 w-full rounded-xl border-2 border-muted bg-muted/50 py-2.5 text-sm font-semibold text-muted-foreground"
                >
                  {isBeta ? t('comingSoon') : t('currentPlan')}
                </button>

                <div className="mt-6 space-y-3">
                  {features.map((f, i) => (
                    <FeatureRow key={i} icon={f.icon} value={f.free} label={typeof f.free === 'string' ? f.free : f.label} />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Plus */}
            <Card className="relative overflow-hidden border-2 border-bordeaux-300 dark:border-bordeaux-600">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-foreground">{t('plus')}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{t('plusDesc')}</p>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-foreground">{t('currencySymbol')}{plusPrice}</span>
                  <span className="ms-1 text-sm text-muted-foreground">/ {perLabel}</span>
                </div>
                {billing === 'annual' && (
                  <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">{t('savePercent', { percent: '28' })}</p>
                )}
                <button
                  disabled
                  className="mt-5 w-full rounded-xl bg-bordeaux-500 py-2.5 text-sm font-semibold text-white opacity-80"
                >
                  {t('comingSoon')}
                </button>

                <div className="mt-6 space-y-3">
                  {features.map((f, i) => (
                    <FeatureRow key={i} icon={f.icon} value={f.plus} label={typeof f.plus === 'string' ? f.plus : f.label} />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Pro */}
            <Card className="relative overflow-hidden border-2 border-amber-400 dark:border-amber-600">
              <div className="absolute top-0 end-0 rounded-es-xl bg-amber-500 px-3 py-1">
                <span className="text-xs font-bold text-white">{t('bestValue')}</span>
              </div>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground">{t('pro')}</h3>
                  <Crown className="h-5 w-5 text-amber-500" strokeWidth={1.5} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{t('proDesc')}</p>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-foreground">{t('currencySymbol')}{proPrice}</span>
                  <span className="ms-1 text-sm text-muted-foreground">/ {perLabel}</span>
                </div>
                {billing === 'annual' && (
                  <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">{t('savePercent', { percent: '25' })}</p>
                )}
                <button
                  disabled
                  className="mt-5 w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-2.5 text-sm font-semibold text-white opacity-80"
                >
                  {t('comingSoon')}
                </button>

                <div className="mt-6 space-y-3">
                  {features.map((f, i) => (
                    <FeatureRow key={i} icon={f.icon} value={f.pro} label={typeof f.pro === 'string' ? f.pro : f.label} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {isBeta && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {t('comingSoon')}
            </p>
          )}

          {/* Premium Feature Highlights */}
          <section className="mt-16">
            <h2 className="mb-8 text-center text-xl font-bold text-foreground">{t('featuresTitle')}</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              {premiumHighlights.map((h, i) => (
                <div key={i} className="flex gap-4 rounded-2xl border border-border bg-card p-5">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-bordeaux-50 text-bordeaux-500 dark:bg-bordeaux-900/20 dark:text-bordeaux-300">
                    {h.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{h.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{h.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Add-on Packages */}
          <section className="mt-16">
            <h2 className="mb-2 text-center text-xl font-bold text-foreground">{t('addonsTitle')}</h2>
            <p className="mb-6 text-center text-sm text-muted-foreground">{t('addonsDesc')}</p>
            <div className="mx-auto max-w-md space-y-3">
              {[t('addon1'), t('addon2'), t('addon3')].map((addon, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                  <Package className="h-4 w-4 flex-shrink-0 text-amber-500" strokeWidth={1.5} />
                  <span className="text-sm text-foreground">{addon}</span>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section className="mt-16 mb-8">
            <h2 className="mb-6 text-center text-xl font-bold text-foreground">{t('faqTitle')}</h2>
            <div className="mx-auto max-w-2xl space-y-3">
              {faqs.map((faq, i) => (
                <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center justify-between px-5 py-4 text-start"
                  >
                    <span className="text-sm font-semibold text-foreground">{faq.q}</span>
                    {openFaq === i ? (
                      <ChevronUp className="h-4 w-4 flex-shrink-0 text-muted-foreground" strokeWidth={1.5} />
                    ) : (
                      <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" strokeWidth={1.5} />
                    )}
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-4">
                      <p className="text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function FeatureRow({ icon, value, label }: { icon: React.ReactNode; value: string | boolean; label: string }) {
  const isIncluded = value === true || typeof value === 'string';

  return (
    <div className={cn('flex items-start gap-2.5 text-sm', !isIncluded && 'opacity-40')}>
      <div className="mt-0.5 flex-shrink-0">
        {isIncluded ? (
          <Check className="h-4 w-4 text-emerald-500" strokeWidth={2} />
        ) : (
          <X className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
        )}
      </div>
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-foreground">{typeof value === 'string' ? value : label}</span>
      </div>
    </div>
  );
}
