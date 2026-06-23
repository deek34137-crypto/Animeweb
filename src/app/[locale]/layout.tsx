import React from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import QueryProvider from '@/providers/QueryProvider';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { CursorProvider } from '@/providers/CursorProvider';
import AppShell from '@/components/AppShell';
import CommandPalette from '@/components/ui/CommandPalette';
import NavigationLoader from '@/components/ui/NavigationLoader';
import QuickMenu from '@/components/dashboard/QuickMenu';
import ShortcutHelper from '@/components/ui/ShortcutHelper';
import { Analytics } from '@vercel/analytics/next';
import { Outfit, Inter, JetBrains_Mono } from 'next/font/google';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import '../globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata = {
  title: 'AnimeWorld RJ - Premium Anime Streaming & Discovery Platform',
  description: 'High-performance, premium anime discovery website showing trending, top-rated, and seasonal shows, search filters, and real-time streaming availability with subtitles and dubs.',
  keywords: 'anime, discovery, streaming, crunchyroll, netflix, dub, sub, jikan, mal, MyAnimeList, seasons, reviews',
};

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();
  const session = await auth();
  const userId = session?.user?.id;

  let myAnimeCount = 0;
  let continueWatchingCount = 0;

  if (userId) {
    try {
      myAnimeCount = await db.listEntry.count({
        where: { userId },
      });
      continueWatchingCount = await db.listEntry.count({
        where: { userId, status: 'watching' },
      });
    } catch (error) {
      console.error('Failed to load sidebar badges from database:', error);
    }
  }

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
        <NextIntlClientProvider messages={messages}>
          <SessionProvider>
            <QueryProvider>
              <ThemeProvider>
                <CursorProvider>
                  <NavigationLoader />
                  <AppShell
                    myAnimeCount={myAnimeCount}
                    continueWatchingCount={continueWatchingCount}
                  >
                    {children}
                  </AppShell>
                  <CommandPalette />
                  <QuickMenu />
                  <ShortcutHelper />
                </CursorProvider>
              </ThemeProvider>
            </QueryProvider>
          </SessionProvider>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
