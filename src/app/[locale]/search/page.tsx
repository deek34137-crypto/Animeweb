import React from 'react';
import SearchClient from './SearchClient';

// This page is 100% client-side (SearchClient is a 'use client' component).
// force-dynamic removed due to Next.js 16 cacheComponents incompatibility
// export const dynamic = 'force-dynamic'; // removed for Next.js 16 compatibility

interface PageProps {
  searchParams: Promise<{ q?: string; lang?: string; sort?: string }>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q = '', lang = '' } = await searchParams;
  return <SearchClient initialQuery={q} initialLang={lang} />;
}
