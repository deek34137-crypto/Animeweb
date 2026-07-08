import React, { Suspense } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import enMessages from '../../../messages/en.json';
import esMessages from '../../../messages/es.json';
import jaMessages from '../../../messages/ja.json';
import QueryProvider from '@/providers/QueryProvider';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { CursorProvider } from '@/providers/CursorProvider';
import AppShell from '@/components/AppShell';
import NavigationLoader from '@/components/ui/NavigationLoader';
import PWAProvider from '@/providers/PWAProvider';
import { Analytics } from '@vercel/analytics/next';
import { WebVitals } from '@/components/analytics/WebVitals';
import { Inter, Outfit, JetBrains_Mono } from 'next/font/google';
import { Metadata } from 'next';
import '../globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || 'https://aniworld.rj'),
  title: {
    default: 'AnimeWorld RJ - Premium Anime Streaming & Discovery Platform',
    template: '%s | AnimeWorld RJ',
  },
  description: 'High-performance, premium anime discovery website showing trending, top-rated, and seasonal shows, search filters, and real-time streaming availability with subtitles and dubs.',
  keywords: 'anime, discovery, streaming, crunchyroll, netflix, dub, sub, jikan, mal, MyAnimeList, seasons, reviews',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Aniworld',
  },
  icons: {
    icon: '/app-icon.jpg',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export const viewport = {
  themeColor: '#7c3aed',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export function generateStaticParams() {
  return [
    { locale: 'en' },
    { locale: 'es' },
    { locale: 'ja' }
  ];
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Enables static rendering for this locale segment — populates the per-request
  // locale cache so getMessages() reads from memory instead of calling headers().
  // Required when using generateStaticParams() with next-intl server APIs.
  setRequestLocale(locale);
  const messages = locale === 'es' ? esMessages : locale === 'ja' ? jaMessages : enMessages;

  return (
    <html lang={locale} suppressHydrationWarning className={`${inter.variable} ${outfit.variable} ${jetbrainsMono.variable} h-full scroll-smooth`}>
      <head>
        {/* Inline Theme Detection Script to prevent flash of theme on load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('theme') || 'system';
                var isLight = false;
                if (theme === 'system') {
                  isLight = !window.matchMedia('(prefers-color-scheme: dark)').matches;
                } else {
                  isLight = theme === 'light';
                }
                if (isLight) {
                  document.documentElement.classList.add('light');
                  document.documentElement.setAttribute('data-theme', 'light');
                } else {
                  document.documentElement.classList.remove('light');
                  document.documentElement.removeAttribute('data-theme');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-bg-primary text-text-primary font-sans transition-colors duration-200">
        <Suspense fallback={null}>
          <WebVitals />
        </Suspense>
        <NextIntlClientProvider messages={messages}>
          <SessionProvider>
            <QueryProvider>
              <ThemeProvider>
                <PWAProvider>
                  <CursorProvider>
                    <Suspense fallback={<div className="min-h-screen bg-bg-primary" />}>
                      <NavigationLoader />
                      <AppShell>
                        <Suspense fallback={null}>
                          {children}
                        </Suspense>
                      </AppShell>
                    </Suspense>
                  </CursorProvider>
                </PWAProvider>
              </ThemeProvider>
            </QueryProvider>
          </SessionProvider>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
