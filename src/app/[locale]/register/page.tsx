import React from 'react';
import { Metadata } from 'next';
import RegisterClient from './RegisterClient';
import { getSeoMetadata } from '@/lib/seo';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return getSeoMetadata({
    title: locale === 'ja' ? 'アカウント作成 - AnimeWorld RJ' : locale === 'es' ? 'Crear Cuenta - AnimeWorld RJ' : 'Create a Free Account - AnimeWorld RJ',
    description: 'Create an account on AnimeWorld RJ to track your watchlist, earn achievements, and review your favorite anime.',
    path: '/register',
    locale,
    preventIndexing: true, // Register page must not be indexed
  });
}

export default async function RegisterPage() {
  return <RegisterClient />;
}
