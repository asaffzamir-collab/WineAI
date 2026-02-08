'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Wine } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState('Signing you in...');

  useEffect(() => {
    const handleAuth = async () => {
      // Get the hash fragment or search params from the URL
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const searchParams = new URLSearchParams(window.location.search);
      
      // Check for errors first
      const error = hashParams.get('error') || searchParams.get('error');
      const errorDescription = hashParams.get('error_description') || searchParams.get('error_description');
      
      if (error) {
        router.replace(`/auth/auth-code-error?error=${error}&error_description=${encodeURIComponent(errorDescription || '')}`);
        return;
      }

      try {
        const supabase = createClient();

        // For PKCE flow, the code is in the URL search params
        const code = searchParams.get('code');
        
        if (code) {
          setStatus('Verifying your credentials...');
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error('Exchange error:', exchangeError);
            router.replace(`/auth/auth-code-error?error=exchange_failed&error_description=${encodeURIComponent(exchangeError.message)}`);
            return;
          }
        }

        // Check for access_token in hash (implicit flow fallback)
        const accessToken = hashParams.get('access_token');
        if (accessToken) {
          setStatus('Setting up your session...');
          const refreshToken = hashParams.get('refresh_token') || '';
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        }

        // Wait a moment then check session
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.replace('/auth/auth-code-error?error=no_user&error_description=Could not retrieve user information');
          return;
        }

        setStatus('Setting up your profile...');

        // Check if profile exists
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id, onboarding_completed')
          .eq('id', user.id)
          .single();

        if (!profile) {
          const meta = user.user_metadata as { given_name?: string; full_name?: string } | undefined;
          const displayName =
            meta?.given_name ||
            (meta?.full_name?.trim() ? meta.full_name.split(/\s+/)[0] : null) ||
            user.email?.split('@')[0] ||
            'Wine Lover';
          const { error: insertError } = await supabase.from('user_profiles').insert({
            id: user.id,
            display_name: displayName,
            preferred_language: 'he',
            preferred_currency: 'ILS',
            onboarding_completed: false,
          });
          
          if (insertError) {
            console.error('Profile creation error:', insertError);
          }
          
          // New user - go to onboarding
          router.replace('/onboarding');
          return;
        }

        // Existing user - check onboarding status
        if (!profile.onboarding_completed) {
          router.replace('/onboarding');
        } else {
          router.replace('/');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        router.replace(`/auth/auth-code-error?error=unexpected&error_description=${encodeURIComponent(String(err))}`);
      }
    };

    handleAuth();
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-wine-900 to-wine-950">
      <Wine className="h-16 w-16 text-gold-500 mb-4" />
      <Loader2 className="h-8 w-8 animate-spin text-white" />
      <p className="mt-4 text-wine-200">{status}</p>
    </div>
  );
}
