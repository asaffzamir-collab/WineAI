'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Download, X, MoreHorizontal, Share, Plus, Bell } from 'lucide-react';
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

let _earlyPrompt: BeforeInstallPromptEvent | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _earlyPrompt = e as BeforeInstallPromptEvent;
  });
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

    if (_earlyPrompt) {
      setDeferredPrompt(_earlyPrompt);
      setVisible(true);
      _earlyPrompt = null;
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
        'fixed inset-x-0 z-[45] mx-3 md:hidden',
        'bottom-[calc(5rem+env(safe-area-inset-bottom)+8px)]',
        'animate-in slide-in-from-bottom-4 fade-in duration-300',
      )}
    >
      <div className="rounded-2xl bg-white dark:bg-charcoal-800 shadow-xl border border-bordeaux-100 dark:border-charcoal-700 p-4 pe-10">
        <button
          onClick={dismiss}
          className="absolute top-3 end-3 p-1.5 rounded-full text-foreground/40 hover:text-foreground/70 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          aria-label={t('dismiss')}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-bordeaux-50 dark:bg-bordeaux-900/30">
            <Download className="h-5 w-5 text-bordeaux-600 dark:text-bordeaux-300" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              {t('title')}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              {t('body')}
            </p>
          </div>
        </div>

        {showIos ? (
          <div className="mt-3 space-y-2 border-t border-bordeaux-50 dark:border-charcoal-700 pt-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-bordeaux-50 dark:bg-bordeaux-900/30 text-[10px] font-bold text-bordeaux-600 dark:text-bordeaux-300">1</span>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>{t('iosStep1')}</span>
                <MoreHorizontal className="inline h-4 w-4 text-bordeaux-500" />
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-bordeaux-50 dark:bg-bordeaux-900/30 text-[10px] font-bold text-bordeaux-600 dark:text-bordeaux-300">2</span>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>{t('iosStep2')}</span>
                <Share className="inline h-3.5 w-3.5 text-bordeaux-500" />
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-bordeaux-50 dark:bg-bordeaux-900/30 text-[10px] font-bold text-bordeaux-600 dark:text-bordeaux-300">3</span>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>{t('iosStep3')}</span>
                <Plus className="inline h-3.5 w-3.5 text-bordeaux-500" />
              </div>
            </div>
            <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50/80 dark:bg-amber-900/10 px-3 py-2">
              <Bell className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                {t('notificationTip')}
              </p>
            </div>
          </div>
        ) : deferredPrompt ? (
          <div className="mt-3 border-t border-bordeaux-50 dark:border-charcoal-700 pt-3">
            <button
              onClick={install}
              className="w-full rounded-lg bg-bordeaux-600 px-4 py-2 text-xs font-medium text-white hover:bg-bordeaux-700 transition-colors"
            >
              {t('install')}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
