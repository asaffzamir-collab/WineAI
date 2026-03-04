'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

const CONSENT_KEY = 'wj_cookie_consent';

export function CookieConsent() {
  const t = useTranslations('cookieConsent');
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setShow(false);
  };

  const handleDecline = () => {
    localStorage.setItem(CONSENT_KEY, 'declined');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[9998] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-lg rounded-2xl border border-border/50 bg-white/95 p-4 shadow-xl backdrop-blur-sm dark:bg-charcoal-800/95 dark:border-charcoal-700">
        <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed mb-3">
          {t('description')}
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleAccept}
            className="flex-1 rounded-xl bg-bordeaux-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-bordeaux-700 dark:bg-bordeaux-500"
          >
            {t('acceptAll')}
          </button>
          <button
            onClick={handleDecline}
            className="flex-1 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t('essentialOnly')}
          </button>
        </div>
        <a
          href="/privacy"
          className="mt-2 block text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('privacyPolicy')}
        </a>
      </div>
    </div>
  );
}
