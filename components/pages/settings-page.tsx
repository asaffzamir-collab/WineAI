'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Globe, LogOut, User, Moon, Sun, Shield, ChevronRight, BookOpen, RotateCcw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { FeatureTour, resetTour } from '@/components/feature-tour';

interface UserProfile {
  id: string;
  display_name?: string;
  preferred_language?: string;
  preferred_currency?: string;
}

interface SettingsPageProps {
  userId: string;
  profile: UserProfile | null;
  userEmail: string;
  isAdmin?: boolean;
}

export function SettingsPage({ userId, profile, userEmail, isAdmin }: SettingsPageProps) {
  const t = useTranslations('settings');
  const router = useRouter();
  const [currentLanguage, setCurrentLanguage] = useState(
    profile?.preferred_language || 'he'
  );
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const tGuide = useTranslations('guide');

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleLanguageChange = async (lang: string) => {
    setCurrentLanguage(lang);
    document.cookie = `locale=${lang};path=/;max-age=31536000`;
    const supabase = createClient();
    await supabase
      .from('user_profiles')
      .update({ preferred_language: lang })
      .eq('id', userId);
    router.refresh();

    // Translate profile content to the new language in the background
    fetch('/api/profile/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, targetLanguage: lang }),
    }).catch(() => {});
  };

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <AppShell>
      <div className="animate-page py-6 md:py-8 lg:py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <PageHeader title={t('title')} />

          <div className="mt-6 max-w-2xl space-y-4">
            {/* Account Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4" strokeWidth={1.5} />
                  {t('account')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-stone-600 dark:text-stone-400">Email:</span>{' '}
                    <span className="font-medium" dir="ltr">{userEmail}</span>
                  </p>
                  {profile?.display_name && (
                    <p>
                      <span className="text-stone-600 dark:text-stone-400">Name:</span>{' '}
                      <span className="font-medium">{profile.display_name}</span>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Language Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="h-4 w-4" strokeWidth={1.5} />
                  {t('language')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleLanguageChange('he')}
                    className={`flex-1 rounded-xl border-2 p-3 text-center transition-all duration-200 ${
                      currentLanguage === 'he'
                        ? 'border-bordeaux-500 bg-bordeaux-50 text-bordeaux-600 shadow-soft dark:bg-bordeaux-900/20 dark:text-bordeaux-300 dark:border-bordeaux-400'
                        : 'border-ivory-400 hover:border-bordeaux-300 dark:border-charcoal-700 dark:hover:border-bordeaux-600'
                    }`}
                  >
                    {t('hebrew')}
                  </button>
                  <button
                    onClick={() => handleLanguageChange('en')}
                    className={`flex-1 rounded-xl border-2 p-3 text-center transition-all duration-200 ${
                      currentLanguage === 'en'
                        ? 'border-bordeaux-500 bg-bordeaux-50 text-bordeaux-600 shadow-soft dark:bg-bordeaux-900/20 dark:text-bordeaux-300 dark:border-bordeaux-400'
                        : 'border-ivory-400 hover:border-bordeaux-300 dark:border-charcoal-700 dark:hover:border-bordeaux-600'
                    }`}
                  >
                    {t('english')}
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Dark Mode */}
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-2">
                  {isDarkMode ? <Moon className="h-4 w-4" strokeWidth={1.5} /> : <Sun className="h-4 w-4" strokeWidth={1.5} />}
                  <span className="text-sm font-semibold">{isDarkMode ? t('darkMode') : t('lightMode')}</span>
                </div>
                <button
                  dir="ltr"
                  onClick={toggleDarkMode}
                  className={`relative inline-flex h-[26px] w-[46px] shrink-0 items-center rounded-full transition-colors duration-200 ${
                    isDarkMode ? 'bg-bordeaux-500' : 'bg-ivory-400 dark:bg-charcoal-600'
                  }`}
                  role="switch"
                  aria-checked={isDarkMode}
                  aria-label={isDarkMode ? t('darkMode') : t('lightMode')}
                >
                  <span
                    className={`pointer-events-none inline-block h-[20px] w-[20px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      isDarkMode ? 'translate-x-[23px]' : 'translate-x-[3px]'
                    }`}
                  />
                </button>
              </CardContent>
            </Card>

            {/* Admin Panel */}
            {isAdmin && (
              <Link href="/admin" className="block">
                <Card className="cursor-pointer hover:shadow-soft-lg hover:translate-y-[-1px] transition-all duration-200">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-charcoal-800 dark:bg-charcoal-700">
                        <Shield className="h-4.5 w-4.5 text-copper-400" strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-bordeaux-600 dark:text-ivory-200">{t('adminPanel')}</p>
                        <p className="text-xs text-stone-500 dark:text-stone-400">{t('adminPanelDesc')}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-stone-400" strokeWidth={1.5} />
                  </CardContent>
                </Card>
              </Link>
            )}

            {/* App Guide */}
            <Link href="/guide" className="block">
              <Card className="cursor-pointer hover:shadow-soft-lg hover:translate-y-[-1px] transition-all duration-200">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-bordeaux-50 dark:bg-bordeaux-900/20">
                      <BookOpen className="h-4.5 w-4.5 text-bordeaux-500 dark:text-bordeaux-400" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-bordeaux-600 dark:text-ivory-200">{t('guideCard')}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-400">{t('guideCardDesc')}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-stone-400" strokeWidth={1.5} />
                </CardContent>
              </Card>
            </Link>

            {/* Restart Tour */}
            <button
              type="button"
              onClick={() => { resetTour(); setShowTour(true); }}
              className="block w-full"
            >
              <Card className="cursor-pointer hover:shadow-soft-lg hover:translate-y-[-1px] transition-all duration-200">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-garnet-50 dark:bg-garnet-900/20">
                      <RotateCcw className="h-4.5 w-4.5 text-garnet-500 dark:text-garnet-400" strokeWidth={1.5} />
                    </div>
                    <div className="text-start">
                      <p className="text-sm font-semibold text-bordeaux-600 dark:text-ivory-200">{tGuide('restartTour')}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-stone-400" strokeWidth={1.5} />
                </CardContent>
              </Card>
            </button>

            {/* Sign Out */}
            <div className="pt-2">
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleSignOut}
                disabled={isLoggingOut}
              >
                <LogOut className="me-2 h-4 w-4" strokeWidth={1.5} />
                {t('signOut')}
              </Button>
            </div>
          </div>
        </div>
      </div>
      {showTour && <FeatureTour force onComplete={() => setShowTour(false)} />}
    </AppShell>
  );
}
