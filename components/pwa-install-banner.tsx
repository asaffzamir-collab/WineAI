'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Download, X, Share } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_DAYS = 7;

function isDismissed(): boolean {
  try {
    const val = localStorage.getItem(DISMISS_KEY);
    if (!val) return false;
    const expiry = parseInt(val, 10);
    if (Date.now() > expiry) {
      localStorage.removeItem(DISMISS_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function setDismissed() {
  try {
    localStorage.setItem(
      DISMISS_KEY,
      String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000),
    );
  } catch {}
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  );
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

export function PwaInstallBanner() {
  const t = useTranslations('pwa');
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);

  useEffect(() => {
    if (isStandalone() || isDismissed()) return;

    if (isIos()) {
      setShowIos(true);
      setVisible(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = useCallback(() => {
    setDismissed();
    setVisible(false);
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setVisible(false);
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        'fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] inset-x-0 z-40 mx-3 md:hidden',
        'animate-in slide-in-from-bottom-4 fade-in duration-300',
      )}
    >
      <div className="rounded-2xl bg-white/95 dark:bg-charcoal-800/95 backdrop-blur-md shadow-xl border border-bordeaux-100 dark:border-charcoal-700 p-4">
        <button
          onClick={dismiss}
          className="absolute top-2.5 end-2.5 p-1.5 rounded-full text-foreground/40 hover:text-foreground/70 transition-colors"
          aria-label={t('dismiss')}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 pe-6">
          <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-bordeaux-50 dark:bg-bordeaux-900/30">
            <Download className="h-5 w-5 text-bordeaux-600 dark:text-bordeaux-300" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {t('title')}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              {showIos ? t('iosBody') : t('body')}
            </p>
            {showIos ? (
              <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                <span>{t('iosTap')}</span>
                <Share className="inline h-3.5 w-3.5 text-bordeaux-500" />
                <span>{t('iosThen')}</span>
              </p>
            ) : deferredPrompt ? (
              <button
                onClick={install}
                className="mt-2.5 rounded-lg bg-bordeaux-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-bordeaux-700 transition-colors"
              >
                {t('install')}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
