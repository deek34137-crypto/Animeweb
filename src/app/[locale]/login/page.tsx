import React from 'react';
import { Metadata } from 'next';
import LoginClient from './LoginClient';
import { getSeoMetadata } from '@/lib/seo';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return getSeoMetadata({
    title: locale === 'ja' ? 'ログイン - AnimeWorld RJ' : locale === 'es' ? 'Iniciar Sesión - AnimeWorld RJ' : 'Sign In to Your Account - AnimeWorld RJ',
    description: 'Log in to your AnimeWorld RJ account to sync your watchlist, track history, and personalize your experience.',
    path: '/login',
    locale,
    preventIndexing: true, // Login page must not be indexed
  });
}

export default async function LoginPage() {
  return <LoginClient />;
}
