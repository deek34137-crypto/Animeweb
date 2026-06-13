import React from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import QueryProvider from '@/providers/QueryProvider';
import { SessionProvider } from 'next-auth/react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CommandPalette from '@/components/ui/CommandPalette';
import { Analytics } from '@vercel/analytics/next';
import { Outfit, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import '../globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
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
  keywords: 'anime, discovery, streaming, crunchyroll, netflix, dub, sub, jikan, mal, myanimelist, seasons, reviews',
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

  return (
    <html lang={locale} className={`${plusJakartaSans.variable} ${outfit.variable} ${jetbrainsMono.variable} h-full scroll-smooth`}>
      <head>
        {/* Font loading is handled via next/font */}
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <NextIntlClientProvider messages={messages}>
          <SessionProvider>
            <QueryProvider>
              <Navbar />
              <CommandPalette />
              <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {children}
              </main>
              <Footer />
            </QueryProvider>
          </SessionProvider>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
