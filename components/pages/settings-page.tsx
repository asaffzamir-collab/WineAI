'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Globe, LogOut, User, Moon, Sun } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BottomNav } from '@/components/bottom-nav';
import { PageHeader } from '@/components/ui/page-header';

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
}

export function SettingsPage({ userId, profile, userEmail }: SettingsPageProps) {
  const t = useTranslations('settings');
  const router = useRouter();
  const [currentLanguage, setCurrentLanguage] = useState(
    profile?.preferred_language || 'he'
  );
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Initialize dark mode from document class on mount
  useState(() => {
    if (typeof document !== 'undefined') {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    }
  });

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
  };

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-ivory-200 pb-24 dark:bg-charcoal-900">
      <PageHeader title={t('title')} />

      <div className="mx-auto max-w-lg space-y-6 px-4 pt-6 animate-page">
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
                <span className="text-stone-500 dark:text-stone-400">Email:</span>{' '}
                <span className="font-medium" dir="ltr">{userEmail}</span>
              </p>
              {profile?.display_name && (
                <p>
                  <span className="text-stone-500 dark:text-stone-400">Name:</span>{' '}
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {isDarkMode ? <Moon className="h-4 w-4" strokeWidth={1.5} /> : <Sun className="h-4 w-4" strokeWidth={1.5} />}
              {isDarkMode ? 'Dark Mode' : 'Light Mode'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <button
              onClick={toggleDarkMode}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 ${
                isDarkMode ? 'bg-bordeaux-500' : 'bg-ivory-400'
              }`}
              role="switch"
              aria-checked={isDarkMode}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-soft transition-transform duration-200 ${
                  isDarkMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </CardContent>
        </Card>

        {/* Sign Out */}
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

      <BottomNav />
    </div>
  );
}
