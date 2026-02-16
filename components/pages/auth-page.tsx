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
        // Sign up directly via the browser Supabase client.
        // This automatically establishes the session and sets cookies.
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
        // Login directly via browser Supabase client
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

      // Full page reload so RootGate re-initializes with the new session.
      // The /api/me endpoint (called by RootGate) auto-creates the user profile if missing.
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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-wine-900 to-wine-950 px-4">
      {/* Decorative background rings */}
      <div className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full border border-wine-700/20" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full border border-wine-700/15" />
      <div className="pointer-events-none absolute top-1/4 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-wine-800/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-md space-y-8">
        <div className="text-center">
          <WineLogo size={64} className="mx-auto text-gold-500" />
          <h1 className="mt-6 text-3xl font-bold text-white">{t('welcome')}</h1>
          <p className="mt-2 text-sm text-wine-200">{t('subtitle')}</p>
        </div>

        <Card data-app="signin-screen" className="shadow-xl">
          <CardContent className="py-8">
            {/* Tabs */}
            <div className="mb-6 flex rounded-lg bg-cream-100 p-1">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); }}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                  mode === 'login'
                    ? 'bg-white text-wine-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('loginTab')}
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setError(null); }}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                  mode === 'register'
                    ? 'bg-white text-wine-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('registerTab')}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Display Name (register only) */}
              {mode === 'register' && (
                <div>
                  <label htmlFor="displayName" className="mb-1 block text-sm font-medium text-gray-700">
                    {t('displayNameLabel')}
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={t('displayNamePlaceholder')}
                    className="w-full rounded-lg border border-cream-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-wine-500 focus:ring-1 focus:ring-wine-500"
                  />
                </div>
              )}

              {/* Email */}
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                  {t('emailLabel')}
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('emailPlaceholder')}
                  className="w-full rounded-lg border border-cream-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-wine-500 focus:ring-1 focus:ring-wine-500"
                  dir="ltr"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
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
                    className="w-full rounded-lg border border-cream-200 bg-white px-4 py-2.5 pe-10 text-sm outline-none transition-colors focus:border-wine-500 focus:ring-1 focus:ring-wine-500"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {mode === 'register' && (
                  <p className="mt-1 text-xs text-gray-400">{t('passwordHint')}</p>
                )}
              </div>

              {/* Error message */}
              {error && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Submit */}
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

            {/* Switch mode link */}
            <p className="mt-4 text-center text-sm text-gray-500">
              {mode === 'login' ? t('noAccount') : t('hasAccount')}{' '}
              <button
                type="button"
                onClick={switchMode}
                className="font-medium text-wine-700 hover:text-wine-900"
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
