'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { WineLogo } from '@/components/wine-logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';

type AuthMode = 'login' | 'register';

export function AuthPage({ initialError }: { initialError?: string | null }) {
  const t = useTranslations('auth');
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();

      if (mode === 'register') {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName || email.split('@')[0],
              terms_accepted_at: new Date().toISOString(),
            },
          },
        });

        if (signUpError) {
          setError(signUpError.message || t('genericError'));
          setIsLoading(false);
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(signInError.message || t('genericError'));
          setIsLoading(false);
          return;
        }
      }

      window.location.href = '/';
    } catch {
      setError(t('genericError'));
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError(null);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bordeaux-600 px-4 dark:bg-charcoal-900">
      {/* Decorative background */}
      <div className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full border border-bordeaux-400/15" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full border border-bordeaux-400/10" />
      <div className="pointer-events-none absolute top-1/4 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-bordeaux-500/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-md space-y-8 animate-page">
        <div className="text-center">
          <WineLogo size={64} className="mx-auto text-copper-400" />
          <h1 className="mt-6 text-display text-3xl text-white">{t('welcome')}</h1>
          <p className="mt-2 text-sm text-bordeaux-200">{t('subtitle')}</p>
        </div>

        <Card className="shadow-lift">
          <CardContent className="py-8">
            {/* Tabs */}
            <div className="mb-6 flex rounded-xl bg-secondary p-1">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); }}
                className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all duration-150 ${
                  mode === 'login'
                    ? 'bg-card text-foreground shadow-soft'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('loginTab')}
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setError(null); }}
                className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all duration-150 ${
                  mode === 'register'
                    ? 'bg-card text-foreground shadow-soft'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('registerTab')}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <Label htmlFor="displayName">
                    {t('displayNameLabel')}
                  </Label>
                  <Input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={t('displayNamePlaceholder')}
                    className="mt-1.5"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="email">
                  {t('emailLabel')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('emailPlaceholder')}
                  className="mt-1.5"
                  dir="ltr"
                />
              </div>

              <div>
                <Label htmlFor="password">
                  {t('passwordLabel')}
                </Label>
                <div className="relative mt-1.5">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('passwordPlaceholder')}
                    className="pe-10"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" strokeWidth={1.5} />
                    ) : (
                      <Eye className="h-4 w-4" strokeWidth={1.5} />
                    )}
                  </button>
                </div>
                {mode === 'register' && (
                  <p className="mt-1 text-xs text-muted-foreground">{t('passwordHint')}</p>
                )}
              </div>

              {mode === 'register' && (
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-border accent-primary"
                  />
                  <span className="text-sm text-muted-foreground leading-snug">
                    {t('termsPrefix')}{' '}
                    <a href="/terms" target="_blank" className="text-primary hover:underline">{t('termsLink')}</a>
                    {' '}{t('termsAnd')}{' '}
                    <a href="/privacy" target="_blank" className="text-primary hover:underline">{t('privacyLink')}</a>
                  </span>
                </label>
              )}

              {error && (
                <div role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || (mode === 'register' && !termsAccepted)}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {mode === 'login' ? t('loginButton') : t('registerButton')}
              </Button>
            </form>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-3 text-muted-foreground">or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={isLoading}
              onClick={async () => {
                setError(null);
                setIsLoading(true);
                try {
                  const supabase = createClient();
                  const { error: oauthError } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                      redirectTo: `${window.location.origin}/auth/callback`,
                    },
                  });
                  if (oauthError) {
                    setError(oauthError.message);
                    setIsLoading(false);
                  }
                } catch {
                  setError(t('genericError'));
                  setIsLoading(false);
                }
              }}
            >
              <svg className="h-5 w-5 me-2" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </Button>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              {mode === 'login' ? t('noAccount') : t('hasAccount')}{' '}
              <button
                type="button"
                onClick={switchMode}
                className="font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {mode === 'login' ? t('registerLink') : t('loginLink')}
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
