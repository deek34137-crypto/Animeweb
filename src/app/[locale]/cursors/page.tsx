import React from 'react';
import { Metadata } from 'next';
import CursorsClient from './CursorsClient';
import { getSeoMetadata, getBreadcrumbSchema } from '@/lib/seo';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return getSeoMetadata({
    title: locale === 'ja' ? 'カスタムアニメカーソル - AnimeWorld RJ' : locale === 'es' ? 'Cursores de Anime Personalizados - AnimeWorld RJ' : 'Custom Anime Cursors - Personalize Your Experience - AnimeWorld RJ',
    description: locale === 'ja' ? 'アイコニックなアニメキャラクターにインスパイアされたプレミアムなカスタムカーソルを選択してアンロックし、ブラウジング体験をパーソナライズします。' : locale === 'es' ? 'Elige y desbloquea cursores personalizados premium inspirados en personajes icónicos de anime para personalizar tu navegación.' : 'Choose and unlock premium custom cursors inspired by iconic anime characters to personalize your browsing experience.',
    path: '/cursors',
    locale,
  });
}

export default async function CursorsPage({ params }: Props) {
  const { locale } = await params;
  
  const breadcrumbJson = getBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Cursors', path: '/cursors' },
  ], locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJson).replace(/</g, '\\u003c'),
        }}
      />
      <CursorsClient />
    </>
  );
}
