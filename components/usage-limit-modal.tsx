'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertCircle, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UsageLimitInfo {
  type: 'wine_search' | 'pier_message';
  current: number;
  limit: number;
  tier: string;
}

interface UsageLimitModalProps {
  info: UsageLimitInfo;
  onClose: () => void;
}

export function UsageLimitModal({ info, onClose }: UsageLimitModalProps) {
  const t = useTranslations('usageLimit');
  const router = useRouter();

  const isSearch = info.type === 'wine_search';
  const desc = isSearch
    ? t('searchDesc', { limit: String(info.limit) })
    : t('pierDesc', { limit: String(info.limit) });

  const nextTierKey = info.tier === 'free' ? 'nextTierFree' : 'nextTierPlus';
  const nextLimitKey = info.tier === 'free'
    ? (isSearch ? 'nextLimitFreeSearch' : 'nextLimitFreeMessage')
    : (isSearch ? 'nextLimitPlusSearch' : 'nextLimitPlusMessage');

  const upgradePrompt = t('upgradePrompt', {
    nextTier: t(nextTierKey),
    nextLimit: t(nextLimitKey),
  });

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-background p-6 shadow-xl animate-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30">
            <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" strokeWidth={1.5} />
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h3 className="text-lg font-semibold text-foreground">
          {t('title')}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          {desc}
        </p>
        <p className="mt-2 text-sm text-foreground font-medium">
          {upgradePrompt}
        </p>

        <div className="mt-6 space-y-2">
          <Button
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700"
            onClick={() => {
              onClose();
              router.push('/plans');
            }}
          >
            {t('viewPlans')}
            <ArrowRight className="h-4 w-4 ms-2" />
          </Button>
          <button
            onClick={onClose}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            {t('maybeLater')}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Parse a 429 usage_limit_reached response into UsageLimitInfo, or null if not a usage error.
 */
export function parseUsageLimitError(status: number, data: Record<string, unknown>): UsageLimitInfo | null {
  if (status === 429 && data?.error === 'usage_limit_reached') {
    return {
      type: data.type as 'wine_search' | 'pier_message',
      current: data.current as number,
      limit: data.limit as number,
      tier: data.tier as string,
    };
  }
  return null;
}
