import React from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import QueryProvider from '@/providers/QueryProvider';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import '../globals.css';

export const metadata = {
  title: 'Aniworld - Anime Discovery Platform',
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
    <html lang={locale} className="h-full scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>
            <Navbar />
            <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </main>
            <Footer />
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
