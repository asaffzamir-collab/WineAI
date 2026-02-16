import type { Metadata } from 'next';
import { Heebo } from 'next/font/google';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';

export const dynamic = 'force-dynamic';

const heebo = Heebo({
  subsets: ['latin', 'hebrew'],
  variable: '--font-heebo',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  title: 'WineJourney - Your Personal Wine Companion',
  description: 'Discover wines tailored to your taste, manage your cellar, and explore new favorites.',
  themeColor: '#722040',
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
    <html lang={locale} dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <body className={`${heebo.variable} ${heebo.className} font-sans antialiased`}>
        <NextIntlClientProvider messages={messages as AbstractIntlMessages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
