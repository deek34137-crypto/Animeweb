import React from 'react';
import SearchClient from './SearchClient';
import { Metadata } from 'next';
import { getSeoMetadata } from '@/lib/seo';

// This page is 100% client-side (SearchClient is a 'use client' component).
// force-dynamic removed due to Next.js 16 cacheComponents incompatibility
// export const dynamic = 'force-dynamic'; // removed for Next.js 16 compatibility

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; lang?: string; sort?: string; genre?: string; year?: string; status?: string }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const { q = '' } = await searchParams;
  return getSeoMetadata({
    title: q ? `Search results for "${q}" - AnimeWorld RJ` : 'Anime Search & Explorer - AnimeWorld RJ',
    description: 'Search for your favorite anime titles, sort by genres, seasons, and ratings.',
    path: '/search',
    locale,
    preventIndexing: true, // Dynamically prevent search page indexing
  });
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q = '', lang = '', genre, year = '', status = '' } = await searchParams;
  const parsedGenre = genre ? parseInt(genre, 10) : null;
  return (
    <SearchClient
      initialQuery={q}
      initialLang={lang}
      initialGenre={parsedGenre}
      initialYear={year}
      initialStatus={status}
    />
  );
}
