'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Crown, X, Sparkles } from 'lucide-react';
import { usePremium } from '@/lib/use-premium';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PremiumGateProps {
  feature: string;
  children: React.ReactNode;
  className?: string;
}

const FEATURE_ICONS: Record<string, string> = {
  sommelier_chat: 'Chat with your personal AI sommelier',
  tonight_mode: 'Get personalized recommendations from your cellar',
  food_pairing: 'AI-powered food and wine pairing suggestions',
  buying_intelligence: 'Smart buying advice before you purchase',
  cellar_intelligence: 'Deep insights into your wine collection',
  taste_evolution: 'Track how your palate evolves over time',
  wine_discovery: 'Discover wines matched to your taste',
  smart_refinement: 'Refine your taste profile with AI guidance',
  palate_game: 'Fun interactive palate training exercises',
  unlimited_search: 'Unlimited wine searches per day',
};

export function PremiumGate({ feature, children, className }: PremiumGateProps) {
  const { isPremium, paywallActive, isLoading } = usePremium();
  const [showModal, setShowModal] = useState(false);
  const t = useTranslations('premium');

  if (isLoading || !paywallActive || isPremium) {
    return <>{children}</>;
  }

  return (
    <>
      <div
        className={cn('relative cursor-pointer', className)}
        onClick={() => setShowModal(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setShowModal(true)}
      >
        <div className="pointer-events-none opacity-50">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex items-center gap-1.5 rounded-full bg-amber-500/90 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
            <Crown className="h-3.5 w-3.5" />
            {t('premium')}
          </span>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-background p-6 shadow-xl animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <h3 className="text-lg font-semibold text-foreground">
              {t('upgradeTitle')}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {FEATURE_ICONS[feature] || t('upgradeDesc')}
            </p>

            <div className="mt-5 space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <Crown className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <span className="text-foreground">{t('benefit1')}</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Crown className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <span className="text-foreground">{t('benefit2')}</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Crown className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <span className="text-foreground">{t('benefit3')}</span>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <Button
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700"
                onClick={() => setShowModal(false)}
              >
                <Crown className="h-4 w-4 me-2" />
                {t('comingSoon')}
              </Button>
              <button
                onClick={() => setShowModal(false)}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                {t('maybeLater')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
