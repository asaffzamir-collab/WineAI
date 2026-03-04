'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Loader2, Wine, Cookie } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WineLogo } from '@/components/wine-logo';

function getAge(birthday: string): number {
  const birth = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

interface Props {
  userId: string;
  initialDisplayName: string;
}

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

export function ProfileSetupPage({ initialDisplayName }: Props) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('profileSetup');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [alias, setAlias] = useState(initialDisplayName);
  const [country, setCountry] = useState('Israel');
  const [birthday, setBirthday] = useState('');
  const [gender, setGender] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState(locale);
  const [cookieConsent, setCookieConsent] = useState<'accepted' | 'declined' | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isUnderage = useMemo(
    () => birthday !== '' && getAge(birthday) < 18,
    [birthday],
  );

  const handleLanguageChange = useCallback((lang: string) => {
    setPreferredLanguage(lang);
    document.cookie = `locale=${lang};path=/;max-age=31536000`;
    window.location.reload();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/profile/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          alias: alias || firstName,
          country,
          birthday,
          gender: gender || null,
          preferredLanguage,
          cookieConsent,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to save profile');
        setIsLoading(false);
        return;
      }

      localStorage.setItem('wj_age_verified', '1');
      localStorage.setItem('wj_cookie_consent', cookieConsent);
      router.replace('/sommelier/welcome');
    } catch {
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  const isValid =
    firstName.trim() &&
    lastName.trim() &&
    alias.trim() &&
    birthday !== '' &&
    !isUnderage &&
    cookieConsent !== '';

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bordeaux-600 px-4 dark:bg-charcoal-900">
      <div className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full border border-bordeaux-400/15" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full border border-bordeaux-400/10" />

      <div className="relative z-10 w-full max-w-md space-y-6 animate-page">
        <div className="text-center">
          <WineLogo size={48} className="mx-auto text-copper-400" />
          <h1 className="mt-4 text-display text-2xl text-white">{t('title')}</h1>
          <p className="mt-2 text-sm text-bordeaux-200">{t('subtitle')}</p>
        </div>

        <Card className="shadow-lift">
          <CardContent className="py-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Language toggle at top — immediate switch */}
              <div>
                <Label>{t('language')}</Label>
                <div className="mt-1.5 flex rounded-xl bg-secondary p-1">
                  <button
                    type="button"
                    onClick={() => preferredLanguage !== 'he' && handleLanguageChange('he')}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-150 ${
                      preferredLanguage === 'he'
                        ? 'bg-card text-foreground shadow-soft'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t('languageHe')}
                  </button>
                  <button
                    type="button"
                    onClick={() => preferredLanguage !== 'en' && handleLanguageChange('en')}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-150 ${
                      preferredLanguage === 'en'
                        ? 'bg-card text-foreground shadow-soft'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t('languageEn')}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="firstName">{t('firstName')} *</Label>
                  <Input
                    id="firstName"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder={t('firstNamePlaceholder')}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">{t('lastName')} *</Label>
                  <Input
                    id="lastName"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder={t('lastNamePlaceholder')}
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="alias">{t('alias')} *</Label>
                <Input
                  id="alias"
                  required
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder={t('aliasPlaceholder')}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="country">{t('country')}</Label>
                <select
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">{t('countryPlaceholder')}</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="birthday">{t('birthday')} *</Label>
                <Input
                  id="birthday"
                  type="date"
                  required
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="mt-1.5"
                  dir="ltr"
                  max={new Date().toISOString().split('T')[0]}
                />
                {isUnderage ? (
                  <p className="mt-1 text-xs text-destructive">{t('birthdayAgeError')}</p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">{t('birthdayHelper')}</p>
                )}
              </div>

              <div>
                <Label htmlFor="gender">{t('gender')}</Label>
                <select
                  id="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">{t('genderPlaceholder')}</option>
                  <option value="male">{t('genderMale')}</option>
                  <option value="female">{t('genderFemale')}</option>
                  <option value="non-binary">{t('genderNonBinary')}</option>
                  <option value="prefer-not-to-say">{t('genderPreferNot')}</option>
                </select>
              </div>

              <div>
                <Label className="flex items-center gap-1.5">
                  <Cookie className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {t('cookieConsentLabel')} *
                </Label>
                <p className="mt-1 text-xs text-muted-foreground">{t('cookieConsentDescription')}</p>
                <div className="mt-2 flex rounded-xl bg-secondary p-1">
                  <button
                    type="button"
                    onClick={() => setCookieConsent('accepted')}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-150 ${
                      cookieConsent === 'accepted'
                        ? 'bg-card text-foreground shadow-soft'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t('cookieAcceptAll')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCookieConsent('declined')}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-150 ${
                      cookieConsent === 'declined'
                        ? 'bg-card text-foreground shadow-soft'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t('cookieEssentialOnly')}
                  </button>
                </div>
              </div>

              {error && (
                <div role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !isValid}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    {t('saving')}
                  </>
                ) : (
                  <>
                    <Wine className="me-2 h-4 w-4" strokeWidth={1.5} />
                    {t('continue')}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
