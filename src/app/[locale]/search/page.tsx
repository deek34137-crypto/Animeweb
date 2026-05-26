import React from 'react';
import SearchClient from './SearchClient';

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q = '' } = await searchParams;
  return <SearchClient initialQuery={q} />;
}
