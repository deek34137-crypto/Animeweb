import React from 'react';
import SearchClient from './SearchClient';

interface PageProps {
  searchParams: Promise<{ q?: string; lang?: string }>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q = '', lang = '' } = await searchParams;
  return <SearchClient initialQuery={q} initialLang={lang} />;
}
