'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { WineLogo } from '@/components/wine-logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';

type AuthMode = 'login' | 'register';

export function AuthPage() {
  const t = useTranslations('auth');
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          <h1 className="mt-6 heading-serif text-3xl text-white">{t('welcome')}</h1>
          <p className="mt-2 text-sm text-bordeaux-200">{t('subtitle')}</p>
        </div>

        <Card data-app="signin-screen" className="shadow-lift">
          <CardContent className="py-8">
            {/* Tabs */}
            <div className="mb-6 flex rounded-xl bg-ivory-300 p-1 dark:bg-charcoal-700">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); }}
                className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all duration-200 ${
                  mode === 'login'
                    ? 'bg-white text-bordeaux-600 shadow-soft dark:bg-charcoal-800 dark:text-ivory-200'
                    : 'text-stone-600 hover:text-stone-600 dark:text-stone-400'
                }`}
              >
                {t('loginTab')}
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setError(null); }}
                className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all duration-200 ${
                  mode === 'register'
                    ? 'bg-white text-bordeaux-600 shadow-soft dark:bg-charcoal-800 dark:text-ivory-200'
                    : 'text-stone-600 hover:text-stone-600 dark:text-stone-400'
                }`}
              >
                {t('registerTab')}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label htmlFor="displayName" className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-400">
                    {t('displayNameLabel')}
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={t('displayNamePlaceholder')}
                    className="w-full rounded-xl border border-ivory-400 bg-white px-4 py-2.5 text-sm outline-none transition-all duration-200 focus:border-ruby-500/30 focus:ring-2 focus:ring-ruby-500/20 dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-ivory-200"
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-400">
                  {t('emailLabel')}
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('emailPlaceholder')}
                  className="w-full rounded-xl border border-ivory-400 bg-white px-4 py-2.5 text-sm outline-none transition-all duration-200 focus:border-ruby-500/30 focus:ring-2 focus:ring-ruby-500/20 dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-ivory-200"
                  dir="ltr"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-400">
                  {t('passwordLabel')}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('passwordPlaceholder')}
                    className="w-full rounded-xl border border-ivory-400 bg-white px-4 py-2.5 pe-10 text-sm outline-none transition-all duration-200 focus:border-ruby-500/30 focus:ring-2 focus:ring-ruby-500/20 dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-ivory-200"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-stone-600 hover:text-stone-400 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" strokeWidth={1.5} />
                    ) : (
                      <Eye className="h-4 w-4" strokeWidth={1.5} />
                    )}
                  </button>
                </div>
                {mode === 'register' && (
                  <p className="mt-1 text-xs text-stone-600/70 dark:text-stone-400/70">{t('passwordHint')}</p>
                )}
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {mode === 'login' ? t('loginButton') : t('registerButton')}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-stone-600 dark:text-stone-400">
              {mode === 'login' ? t('noAccount') : t('hasAccount')}{' '}
              <button
                type="button"
                onClick={switchMode}
                className="font-medium text-bordeaux-400 hover:text-bordeaux-600 transition-colors dark:text-bordeaux-300"
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
