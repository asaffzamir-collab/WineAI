import type { Metadata } from 'next';
import { Heebo, Inter, Playfair_Display } from 'next/font/google';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';

export const dynamic = 'force-dynamic';

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
  metadataBase: new URL('https://winejourney.co'),
  openGraph: {
    title: 'WineJourney - Your Personal Wine Companion',
    description: 'Discover wines tailored to your taste, manage your cellar, and explore new favorites.',
    url: 'https://winejourney.co',
    siteName: 'WineJourney',
    locale: 'he_IL',
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
  let locale = 'he';
  let messages: Record<string, unknown> = {};
  try {
    locale = await getLocale();
    messages = (await getMessages()) as Record<string, unknown>;
  } catch (e) {
    console.error('RootLayout: getLocale/getMessages failed', e);
    try {
      messages = (await import('@/messages/he.json')).default;
    } catch {
      // leave messages empty so app still renders
    }
  }

  return (
    <html lang={locale} dir={locale === 'he' ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <head>
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
        <NextIntlClientProvider messages={messages as AbstractIntlMessages}>
          <div id="main-content">{children}</div>
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
