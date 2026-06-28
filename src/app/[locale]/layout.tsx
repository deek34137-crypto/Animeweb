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
import CommandPalette from '@/components/ui/CommandPalette';
import NavigationLoader from '@/components/ui/NavigationLoader';
import QuickMenu from '@/components/dashboard/QuickMenu';
import ShortcutHelper from '@/components/ui/ShortcutHelper';
import XPToastManager from '@/components/gamification/XPToastManager';
import PWAProvider from '@/providers/PWAProvider';
import InstallAppPrompt from '@/components/ui/InstallAppPrompt';
import { Analytics } from '@vercel/analytics/next';
import { WebVitals } from '@/components/analytics/WebVitals';
import '../globals.css';

export const metadata = {
  title: 'AnimeWorld RJ - Premium Anime Streaming & Discovery Platform',
  description: 'High-performance, premium anime discovery website showing trending, top-rated, and seasonal shows, search filters, and real-time streaming availability with subtitles and dubs.',
  keywords: 'anime, discovery, streaming, crunchyroll, netflix, dub, sub, jikan, mal, MyAnimeList, seasons, reviews',
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
    <html lang={locale} suppressHydrationWarning className="h-full scroll-smooth">
      <head>
        <style dangerouslySetInnerHTML={{__html: `
          :root {
            --font-display: 'Outfit', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            --font-body: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          }
        `}} />
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
                      <CommandPalette />
                      <QuickMenu />
                      <ShortcutHelper />
                      <XPToastManager />
                      <InstallAppPrompt />
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
