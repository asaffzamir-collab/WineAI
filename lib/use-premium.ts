'use client';

import { useState, useEffect } from 'react';
import type { PremiumStatus } from '@/lib/premium';

const DEFAULT_STATUS: PremiumStatus = {
  paywallActive: false,
  tier: 'free',
  isPremium: true,
};

let cachedStatus: PremiumStatus | null = null;

export function usePremium() {
  const [status, setStatus] = useState<PremiumStatus>(cachedStatus ?? DEFAULT_STATUS);
  const [isLoading, setIsLoading] = useState(!cachedStatus);

  useEffect(() => {
    if (cachedStatus) return;
    fetch('/api/premium/status')
      .then((r) => r.json())
      .then((data: PremiumStatus) => {
        cachedStatus = data;
        setStatus(data);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return { ...status, isLoading };
}
