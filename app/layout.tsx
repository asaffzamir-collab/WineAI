import type { Metadata } from 'next';
import { Heebo, Inter, Playfair_Display } from 'next/font/google';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { UserProvider } from '@/lib/user-context';
import { DirectionProvider } from '@/lib/direction-provider';
import './globals.css';

const heebo = Heebo({
  subsets: ['latin', 'hebrew'],
  variable: '--font-heebo',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'WineJourney - Your Personal Wine Companion',
  description: 'Discover wines tailored to your taste, manage your cellar, and explore new favorites.',
  themeColor: '#5A1E2A',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
  },
  metadataBase: new URL('https://winejourney.co'),
  openGraph: {
    title: 'WineJourney - Your Personal Wine Companion',
    description: 'Discover wines tailored to your taste, manage your cellar, and explore new favorites.',
    url: 'https://winejourney.co',
    siteName: 'WineJourney',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'WineJourney - Your Personal Wine Companion',
    description: 'Discover wines tailored to your taste, manage your cellar, and explore new favorites.',
  },
  manifest: '/manifest.webmanifest',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let locale = 'en';
  let messages: Record<string, unknown> = {};
  try {
    locale = await getLocale();
    messages = (await getMessages()) as Record<string, unknown>;
  } catch (e) {
    console.error('RootLayout: getLocale/getMessages failed', e);
    try {
      messages = (await import('@/messages/en.json')).default;
    } catch {
      // leave messages empty so app still renders
    }
  }

  return (
    <html lang={locale} dir={locale === 'he' ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="WineJourney" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* iPhone 15 Pro Max, 15 Plus, 14 Pro Max (430x932 @3x) */}
        <link rel="apple-touch-startup-image" media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)" href="/icon-512.png" />
        {/* iPhone 15 Pro, 15, 14 Pro, 14 (393x852 @3x) */}
        <link rel="apple-touch-startup-image" media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)" href="/icon-512.png" />
        {/* iPhone SE 3rd gen, 8 (375x667 @2x) */}
        <link rel="apple-touch-startup-image" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" href="/icon-512.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.theme==='dark'||(!('theme' in localStorage)&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}`,
          }}
        />
      </head>
      <body className={`${heebo.variable} ${inter.variable} ${playfair.variable} font-sans antialiased`}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-lg">
          Skip to content
        </a>
        <DirectionProvider dir={locale === 'he' ? 'rtl' : 'ltr'}>
          <NextIntlClientProvider
            messages={messages as AbstractIntlMessages}
            defaultTranslationValues={{ gender: 'male' }}
          >
            <UserProvider>
              <div id="main-content">{children}</div>
            </UserProvider>
          </NextIntlClientProvider>
        </DirectionProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
