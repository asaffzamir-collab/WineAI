'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Globe, LogOut, User, Moon, Sun, Shield, ChevronRight, BookOpen, RotateCcw, FileText, Scale, Pencil, Check, Loader2, Crown, Bell, BellOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { isPushSupported, isNotificationGranted, subscribeToPush, unsubscribeFromPush } from '@/lib/push-notifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { FeatureTour, resetTour } from '@/components/feature-tour';

const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
  'Bahrain', 'Bangladesh', 'Belarus', 'Belgium', 'Bolivia', 'Bosnia and Herzegovina', 'Brazil', 'Bulgaria',
  'Cambodia', 'Cameroon', 'Canada', 'Chile', 'China', 'Colombia', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic',
  'Denmark', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador', 'Estonia', 'Ethiopia',
  'Finland', 'France', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Guatemala',
  'Honduras', 'Hong Kong', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
  'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kuwait', 'Latvia', 'Lebanon', 'Libya', 'Lithuania', 'Luxembourg',
  'Malaysia', 'Mexico', 'Moldova', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar',
  'Nepal', 'Netherlands', 'New Zealand', 'Nigeria', 'North Macedonia', 'Norway',
  'Oman', 'Pakistan', 'Palestine', 'Panama', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal',
  'Qatar', 'Romania', 'Russia', 'Saudi Arabia', 'Senegal', 'Serbia', 'Singapore', 'Slovakia', 'Slovenia',
  'South Africa', 'South Korea', 'Spain', 'Sri Lanka', 'Sweden', 'Switzerland', 'Syria',
  'Taiwan', 'Tanzania', 'Thailand', 'Tunisia', 'Turkey', 'UAE', 'Uganda', 'UK', 'Ukraine', 'Uruguay', 'USA',
  'Uzbekistan', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe',
];

interface UserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  country?: string;
  birthday?: string;
  gender?: string;
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
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: profile?.first_name || '',
    lastName: profile?.last_name || '',
    displayName: profile?.display_name || '',
    country: profile?.country || '',
    birthday: profile?.birthday || '',
    gender: profile?.gender || '',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const tCommon = useTranslations('common');
  const tGuide = useTranslations('guide');

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains('dark'));
    setPushSupported(isPushSupported());
    setPushEnabled(isNotificationGranted());
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
    setIsTranslating(true);
    document.cookie = `locale=${lang};path=/;max-age=31536000`;
    const supabase = createClient();
    await supabase
      .from('user_profiles')
      .update({ preferred_language: lang })
      .eq('id', userId);

    try {
      await fetch('/api/profile/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, targetLanguage: lang }),
      });
    } catch {}

    setIsTranslating(false);
    router.refresh();
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    setProfileMessage(null);
    try {
      const res = await fetch('/api/profile/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: profileForm.firstName,
          lastName: profileForm.lastName,
          alias: profileForm.displayName || profileForm.firstName,
          country: profileForm.country || null,
          birthday: profileForm.birthday || null,
          gender: profileForm.gender || null,
          preferredLanguage: currentLanguage,
        }),
      });
      if (!res.ok) {
        setProfileMessage({ type: 'error', text: t('profileSaveError') });
      } else {
        setProfileMessage({ type: 'success', text: t('profileSaved') });
        setIsEditingProfile(false);
        router.refresh();
      }
    } catch {
      setProfileMessage({ type: 'error', text: t('profileSaveError') });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const togglePush = async () => {
    setPushLoading(true);
    try {
      if (pushEnabled) {
        await unsubscribeFromPush();
        setPushEnabled(false);
      } else {
        const ok = await subscribeToPush(userId);
        setPushEnabled(ok);
      }
    } finally {
      setPushLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <AppShell>
      <div className="animate-page pt-[max(1.5rem,calc(env(safe-area-inset-top)+0.75rem))] pb-6 md:pt-8 md:pb-8 lg:pt-10 lg:pb-10">
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

            {/* Personal Info — Editable */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Pencil className="h-4 w-4" strokeWidth={1.5} />
                    {t('personalInfo')}
                  </CardTitle>
                  {!isEditingProfile && (
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(true)}
                      className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      <Pencil className="h-3 w-3" strokeWidth={1.5} />
                      {tCommon('edit')}
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isEditingProfile ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="settings-firstName">{t('firstName')}</Label>
                        <Input
                          id="settings-firstName"
                          value={profileForm.firstName}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, firstName: e.target.value }))}
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor="settings-lastName">{t('lastName')}</Label>
                        <Input
                          id="settings-lastName"
                          value={profileForm.lastName}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, lastName: e.target.value }))}
                          className="mt-1.5"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="settings-displayName">{t('displayName')}</Label>
                      <Input
                        id="settings-displayName"
                        value={profileForm.displayName}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, displayName: e.target.value }))}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="settings-country">{t('country')}</Label>
                      <select
                        id="settings-country"
                        value={profileForm.country}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, country: e.target.value }))}
                        className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="">{t('countryPlaceholder')}</option>
                        {COUNTRIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="settings-birthday">{t('birthday')}</Label>
                      <Input
                        id="settings-birthday"
                        type="date"
                        value={profileForm.birthday}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, birthday: e.target.value }))}
                        className="mt-1.5"
                        dir="ltr"
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div>
                      <Label htmlFor="settings-gender">{t('gender')}</Label>
                      <select
                        id="settings-gender"
                        value={profileForm.gender}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, gender: e.target.value }))}
                        className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="">{t('genderPlaceholder')}</option>
                        <option value="male">{t('genderMale')}</option>
                        <option value="female">{t('genderFemale')}</option>
                        <option value="non-binary">{t('genderNonBinary')}</option>
                        <option value="prefer-not-to-say">{t('genderPreferNot')}</option>
                      </select>
                    </div>
                    {profileMessage && (
                      <div className={`rounded-xl px-4 py-3 text-sm ${profileMessage.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-destructive/10 text-destructive'}`}>
                        {profileMessage.text}
                      </div>
                    )}
                    <div className="flex gap-3">
                      <Button
                        onClick={handleSaveProfile}
                        disabled={isSavingProfile || !profileForm.firstName.trim() || !profileForm.lastName.trim()}
                        className="flex-1"
                      >
                        {isSavingProfile ? (
                          <>
                            <Loader2 className="me-2 h-4 w-4 animate-spin" />
                            {t('savingProfile')}
                          </>
                        ) : (
                          <>
                            <Check className="me-2 h-4 w-4" strokeWidth={1.5} />
                            {t('saveProfile')}
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditingProfile(false);
                          setProfileMessage(null);
                          setProfileForm({
                            firstName: profile?.first_name || '',
                            lastName: profile?.last_name || '',
                            displayName: profile?.display_name || '',
                            country: profile?.country || '',
                            birthday: profile?.birthday || '',
                            gender: profile?.gender || '',
                          });
                        }}
                      >
                        {tCommon('cancel')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    {profileForm.firstName && (
                      <p>
                        <span className="text-stone-600 dark:text-stone-400">{t('firstName')}:</span>{' '}
                        <span className="font-medium">{profileForm.firstName}</span>
                        {profileForm.lastName && <span className="font-medium"> {profileForm.lastName}</span>}
                      </p>
                    )}
                    {profileForm.displayName && (
                      <p>
                        <span className="text-stone-600 dark:text-stone-400">{t('displayName')}:</span>{' '}
                        <span className="font-medium">{profileForm.displayName}</span>
                      </p>
                    )}
                    {profileForm.country && (
                      <p>
                        <span className="text-stone-600 dark:text-stone-400">{t('country')}:</span>{' '}
                        <span className="font-medium">{profileForm.country}</span>
                      </p>
                    )}
                    {profileForm.gender && (
                      <p>
                        <span className="text-stone-600 dark:text-stone-400">{t('gender')}:</span>{' '}
                        <span className="font-medium">
                          {profileForm.gender === 'male' ? t('genderMale') :
                           profileForm.gender === 'female' ? t('genderFemale') :
                           profileForm.gender === 'non-binary' ? t('genderNonBinary') :
                           profileForm.gender === 'prefer-not-to-say' ? t('genderPreferNot') :
                           profileForm.gender}
                        </span>
                      </p>
                    )}
                    {profileForm.birthday && (
                      <p>
                        <span className="text-stone-600 dark:text-stone-400">{t('birthday')}:</span>{' '}
                        <span className="font-medium" dir="ltr">{profileForm.birthday}</span>
                      </p>
                    )}
                    {!profileForm.firstName && !profileForm.displayName && !profileForm.country && !profileForm.gender && !profileForm.birthday && (
                      <p className="text-muted-foreground italic">{t('personalInfo')}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(true)}
                      className="mt-2 text-xs font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      <Pencil className="h-3 w-3" strokeWidth={1.5} />
                      {tCommon('edit')}
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Plans & Pricing */}
            <Link href="/plans">
              <Card className="cursor-pointer card-hover">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/20">
                      <Crown className="h-4 w-4 text-amber-500" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t('plansCard')}</p>
                      <p className="text-xs text-muted-foreground">{t('plansCardDesc')}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                </CardContent>
              </Card>
            </Link>

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
                    disabled={isTranslating}
                    className={`flex-1 rounded-xl border-2 p-3 text-center transition-all duration-200 ${
                      currentLanguage === 'he'
                        ? 'border-bordeaux-500 bg-bordeaux-50 text-bordeaux-600 shadow-soft dark:bg-bordeaux-900/20 dark:text-bordeaux-300 dark:border-bordeaux-400'
                        : 'border-ivory-400 hover:border-bordeaux-300 dark:border-charcoal-700 dark:hover:border-bordeaux-600'
                    } ${isTranslating ? 'opacity-60 cursor-wait' : ''}`}
                  >
                    {isTranslating && currentLanguage === 'he' ? (
                      <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{t('hebrew')}</span>
                    ) : t('hebrew')}
                  </button>
                  <button
                    onClick={() => handleLanguageChange('en')}
                    disabled={isTranslating}
                    className={`flex-1 rounded-xl border-2 p-3 text-center transition-all duration-200 ${
                      currentLanguage === 'en'
                        ? 'border-bordeaux-500 bg-bordeaux-50 text-bordeaux-600 shadow-soft dark:bg-bordeaux-900/20 dark:text-bordeaux-300 dark:border-bordeaux-400'
                        : 'border-ivory-400 hover:border-bordeaux-300 dark:border-charcoal-700 dark:hover:border-bordeaux-600'
                    } ${isTranslating ? 'opacity-60 cursor-wait' : ''}`}
                  >
                    {isTranslating && currentLanguage === 'en' ? (
                      <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{t('english')}</span>
                    ) : t('english')}
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

            {/* Push Notifications */}
            {pushSupported && (
              <Card>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-2">
                    {pushEnabled ? <Bell className="h-4 w-4" strokeWidth={1.5} /> : <BellOff className="h-4 w-4" strokeWidth={1.5} />}
                    <div>
                      <span className="text-sm font-semibold">{t('notifications')}</span>
                      <p className="text-xs text-muted-foreground">{t('notificationsDesc')}</p>
                    </div>
                  </div>
                  <button
                    dir="ltr"
                    onClick={togglePush}
                    disabled={pushLoading}
                    className={`relative inline-flex h-[26px] w-[46px] shrink-0 items-center rounded-full transition-colors duration-200 ${
                      pushEnabled ? 'bg-bordeaux-500' : 'bg-ivory-400 dark:bg-charcoal-600'
                    } ${pushLoading ? 'opacity-60 cursor-wait' : ''}`}
                    role="switch"
                    aria-checked={pushEnabled}
                    aria-label={t('notifications')}
                  >
                    <span
                      className={`pointer-events-none inline-block h-[20px] w-[20px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        pushEnabled ? 'translate-x-[23px]' : 'translate-x-[3px]'
                      }`}
                    />
                  </button>
                </CardContent>
              </Card>
            )}

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

            {/* Legal */}
            <div className="pt-2 space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">{t('legal')}</h3>
              <Link href="/terms" className="block">
                <Card className="cursor-pointer hover:shadow-soft-lg hover:translate-y-[-1px] transition-all duration-200">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 dark:bg-stone-800/30">
                        <Scale className="h-4.5 w-4.5 text-stone-500 dark:text-stone-400" strokeWidth={1.5} />
                      </div>
                      <p className="text-sm font-semibold text-bordeaux-600 dark:text-ivory-200">{t('termsOfService')}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-stone-400" strokeWidth={1.5} />
                  </CardContent>
                </Card>
              </Link>
              <Link href="/privacy" className="block">
                <Card className="cursor-pointer hover:shadow-soft-lg hover:translate-y-[-1px] transition-all duration-200">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 dark:bg-stone-800/30">
                        <FileText className="h-4.5 w-4.5 text-stone-500 dark:text-stone-400" strokeWidth={1.5} />
                      </div>
                      <p className="text-sm font-semibold text-bordeaux-600 dark:text-ivory-200">{t('privacyPolicy')}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-stone-400" strokeWidth={1.5} />
                  </CardContent>
                </Card>
              </Link>
            </div>

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
