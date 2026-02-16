'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Globe, LogOut, User } from 'lucide-react';
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

  const handleLanguageChange = async (lang: string) => {
    setCurrentLanguage(lang);

    // Update cookie
    document.cookie = `locale=${lang};path=/;max-age=31536000`;

    // Update database
    const supabase = createClient();
    await supabase
      .from('user_profiles')
      .update({ preferred_language: lang })
      .eq('id', userId);

    // Refresh to apply language change
    router.refresh();
  };

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    // Full page reload to ensure all session state is cleared
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-cream-50 pb-24">
      {/* Header */}
      <PageHeader title={t('title')} />

      <div className="mx-auto max-w-lg space-y-4 px-4 pt-4">
        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              {t('account')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-gray-500">Email:</span>{' '}
                <span className="font-medium" dir="ltr">{userEmail}</span>
              </p>
              {profile?.display_name && (
                <p>
                  <span className="text-gray-500">Name:</span>{' '}
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
              <Globe className="h-4 w-4" />
              {t('language')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <button
                onClick={() => handleLanguageChange('he')}
                className={`flex-1 rounded-lg border-2 p-3 text-center transition-all ${
                  currentLanguage === 'he'
                    ? 'border-wine-900 bg-wine-50 text-wine-900'
                    : 'border-cream-200 hover:border-wine-300'
                }`}
              >
                {t('hebrew')}
              </button>
              <button
                onClick={() => handleLanguageChange('en')}
                className={`flex-1 rounded-lg border-2 p-3 text-center transition-all ${
                  currentLanguage === 'en'
                    ? 'border-wine-900 bg-wine-50 text-wine-900'
                    : 'border-cream-200 hover:border-wine-300'
                }`}
              >
                {t('english')}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Button
          variant="destructive"
          className="w-full"
          onClick={handleSignOut}
          disabled={isLoggingOut}
        >
          <LogOut className="me-2 h-4 w-4" />
          {t('signOut')}
        </Button>
      </div>

      <BottomNav />
    </div>
  );
}
