'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search, Sparkles, Wine, Heart, User, ArrowRight, ChevronLeft,
  ChevronDown, Camera, MessageCircle, BookOpen, HelpCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';
import { changelog, fetchChangelog, markUpdatesSeen } from '@/lib/changelog';
import { useSommelier } from '@/components/sommelier/sommelier-context';
import type { ChangelogEntry, ChangelogHighlight } from '@/lib/changelog';

type Tab = 'quickstart' | 'features' | 'whats-new' | 'faq';

const FEATURES = [
  { id: 'search', icon: Search, href: '/search', color: 'bg-bordeaux-500/10 text-bordeaux-600 dark:text-bordeaux-400' },
  { id: 'sommelier', icon: Sparkles, href: null, color: 'bg-garnet-500/10 text-garnet-600 dark:text-garnet-400' },
  { id: 'cellar', icon: Wine, href: '/cellar', color: 'bg-ruby-500/10 text-ruby-600 dark:text-ruby-400' },
  { id: 'wishlist', icon: Heart, href: '/wishlist', color: 'bg-copper-500/10 text-copper-600 dark:text-copper-400' },
  { id: 'profile', icon: User, href: '/profile', color: 'bg-olive-500/10 text-olive-600 dark:text-olive-400' },
] as const;

const QUICKSTART_STEPS = [
  { id: 'scan', icon: Camera, href: '/search', color: 'bg-bordeaux-500' },
  { id: 'ask', icon: MessageCircle, href: null, color: 'bg-garnet-500' },
  { id: 'collect', icon: Wine, href: '/cellar', color: 'bg-ruby-500' },
  { id: 'discover', icon: Sparkles, href: null, color: 'bg-copper-500' },
] as const;

const TAG_STYLES: Record<ChangelogHighlight['tag'], string> = {
  new: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  improved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  fix: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

function QuickStartCard({
  step,
  index,
  t,
  onClick,
}: {
  step: typeof QUICKSTART_STEPS[number];
  index: number;
  t: ReturnType<typeof useTranslations>;
  onClick?: () => void;
}) {
  const Icon = step.icon;
  const content = (
    <Card className="h-full transition-all duration-200 card-hover overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-start gap-4 p-4">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl text-white flex-shrink-0', step.color)}>
            <Icon className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                {index + 1}
              </span>
              <h3 className="text-sm font-semibold text-foreground">
                {t(`quickstart_${step.id}_title`)}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t(`quickstart_${step.id}_desc`)}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" strokeWidth={1.5} />
        </div>
      </CardContent>
    </Card>
  );

  if (step.href) {
    return <Link href={step.href} className="block">{content}</Link>;
  }
  if (onClick) {
    return <button type="button" onClick={onClick} className="block w-full text-start">{content}</button>;
  }
  return content;
}

function FeatureCard({ feature, t, onClick }: { feature: typeof FEATURES[number]; t: ReturnType<typeof useTranslations>; onClick?: () => void }) {
  const Icon = feature.icon;
  const isInteractive = !!feature.href || !!onClick;
  const content = (
    <Card className={cn('h-full transition-all duration-200 group', isInteractive && 'card-hover')}>
      <CardContent className="p-5 flex flex-col h-full">
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl mb-4', feature.color)}>
          <Icon className="h-5.5 w-5.5" strokeWidth={1.5} />
        </div>
        <h3 className="text-heading text-foreground mb-1.5">
          {t(`feature_${feature.id}_title`)}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed flex-1">
          {t(`feature_${feature.id}_desc`)}
        </p>
        {isInteractive && (
          <div className="mt-4 flex items-center gap-1 text-xs font-medium text-primary group-hover:gap-2 transition-all duration-200">
            {t('tryIt')}
            <ArrowRight className="h-3 w-3" strokeWidth={2} />
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (feature.href) {
    return <Link href={feature.href} className="block h-full">{content}</Link>;
  }
  if (onClick) {
    return <button type="button" onClick={onClick} className="block h-full w-full text-start">{content}</button>;
  }
  return content;
}

function formatDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function ChangelogCard({ entry, locale, t }: { entry: ChangelogEntry; locale: string; t: ReturnType<typeof useTranslations> }) {
  const isHe = locale === 'he';
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            v{entry.version}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDate(entry.date, locale)}
          </span>
        </div>
        <h3 className="text-heading text-foreground mb-3">
          {isHe ? entry.titleHe : entry.title}
        </h3>
        <ul className="space-y-2">
          {entry.highlights.map((h, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className={cn(
                'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider flex-shrink-0 mt-0.5',
                TAG_STYLES[h.tag],
              )}>
                {t(`tag_${h.tag}`)}
              </span>
              <span className="text-sm text-foreground/80 leading-relaxed">
                {isHe ? h.textHe : h.text}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-start min-h-[48px]"
      >
        <span className="text-sm font-medium text-foreground pe-4">{question}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
          strokeWidth={1.5}
        />
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-4 pb-4 border-t border-border/50 pt-3">
          <p className="text-sm text-muted-foreground leading-relaxed">{answer}</p>
        </div>
      </div>
    </Card>
  );
}

export function GuidePage() {
  return (
    <AppShell>
      <GuideContent />
    </AppShell>
  );
}

function GuideContent() {
  const t = useTranslations('guide');
  const tNav = useTranslations('nav');
  const { open: openSommelier } = useSommelier();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('quickstart');
  const [locale, setLocale] = useState('en');
  const [changelogEntries, setChangelogEntries] = useState<ChangelogEntry[]>(changelog);

  useEffect(() => {
    const cookie = document.cookie.split(';').find(c => c.trim().startsWith('locale='));
    if (cookie) {
      setLocale(cookie.split('=')[1]?.trim() || 'en');
    }
  }, []);

  useEffect(() => {
    fetchChangelog().then(setChangelogEntries);
  }, []);

  useEffect(() => {
    if (activeTab === 'whats-new') {
      markUpdatesSeen();
    }
  }, [activeTab]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'quickstart', label: t('tabQuickStart') },
    { id: 'features', label: t('tabFeatures') },
    { id: 'whats-new', label: t('tabWhatsNew') },
    { id: 'faq', label: t('tabFaq') },
  ];

  const faqItems = Array.from({ length: 6 }, (_, i) => ({
    question: t(`faq_q${i + 1}`),
    answer: t(`faq_a${i + 1}`),
  }));

  return (
    <div className="animate-page py-6 md:py-8 lg:py-10">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          {tNav('settings')}
        </Link>

        <PageHeader
          title={t('title')}
          description={t('subtitle')}
        />

        {/* Tabs */}
        <div className="mt-6 flex gap-1 rounded-xl bg-muted/50 p-1 overflow-x-auto scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-background text-foreground shadow-soft'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="mt-8">
          {activeTab === 'quickstart' && (
            <div className="space-y-6">
              <p className="text-muted-foreground max-w-2xl">{t('quickstartIntro')}</p>
              <div className="space-y-3">
                {QUICKSTART_STEPS.map((step, i) => (
                  <QuickStartCard
                    key={step.id}
                    step={step}
                    index={i}
                    t={t}
                    onClick={
                      step.id === 'ask' || step.id === 'discover'
                        ? () => { router.push('/'); setTimeout(() => openSommelier(), 300); }
                        : undefined
                    }
                  />
                ))}
              </div>

              <Card className="bg-bordeaux-50/50 dark:bg-bordeaux-900/10 border-bordeaux-100 dark:border-bordeaux-800/30">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bordeaux-100 dark:bg-bordeaux-900/30 flex-shrink-0">
                    <HelpCircle className="h-5 w-5 text-bordeaux-600 dark:text-bordeaux-400" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">{t('quickstartTip')}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{t('quickstartTipDesc')}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'features' && (
            <div className="space-y-8">
              <p className="text-muted-foreground max-w-2xl">{t('featuresIntro')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {FEATURES.map((feature) => (
                  <FeatureCard
                    key={feature.id}
                    feature={feature}
                    t={t}
                    onClick={feature.id === 'sommelier' ? () => openSommelier() : undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'whats-new' && (
            <div className="space-y-4 max-w-2xl">
              {changelogEntries.map((entry) => (
                <ChangelogCard key={entry.version} entry={entry} locale={locale} t={t} />
              ))}
            </div>
          )}

          {activeTab === 'faq' && (
            <div className="space-y-3 max-w-2xl">
              <p className="text-muted-foreground mb-4">{t('faqIntro')}</p>
              {faqItems.map((item, i) => (
                <FaqItem key={i} question={item.question} answer={item.answer} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
