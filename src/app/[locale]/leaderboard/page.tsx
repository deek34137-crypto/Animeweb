import React from 'react';
import { Metadata } from 'next';
import LeaderboardClient from './LeaderboardClient';
import { getSeoMetadata, getBreadcrumbSchema } from '@/lib/seo';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return getSeoMetadata({
    title: locale === 'ja' ? 'グローバルリーダーボード - AnimeWorld RJ' : locale === 'es' ? 'Clasificación Global - AnimeWorld RJ' : 'Anime Leaderboard - Top-Rated and Most Active Users - AnimeWorld RJ',
    description: locale === 'ja' ? 'AnimeWorld RJのグローバルリーダーボード。ユーザーランキング、合計XP、現在のストリークをチェックします。' : locale === 'es' ? 'Clasificación global de AnimeWorld RJ. Consulta los rangos de los usuarios, la experiencia total ganada y las rachas activas.' : 'Explore the top active anime fans on AnimeWorld RJ. Compare global XP rankings, levels, and active watching streaks updated in real time.',
    path: '/leaderboard',
    locale,
  });
}

export default async function LeaderboardPage({ params }: Props) {
  const { locale } = await params;

  const breadcrumbJson = getBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Leaderboard', path: '/leaderboard' },
  ], locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJson).replace(/</g, '\\u003c'),
        }}
      />
      <LeaderboardClient />
    </>
  );
}
