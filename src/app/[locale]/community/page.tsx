import React from 'react';
import { Metadata } from 'next';
import CommunityClient from './CommunityClient';
import { getSeoMetadata, getBreadcrumbSchema } from '@/lib/seo';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return getSeoMetadata({
    title: locale === 'ja' ? 'コミュニティフォーラム - AnimeWorld RJ' : locale === 'es' ? 'Foro de la Comunidad - AnimeWorld RJ' : 'Community Forum - Discuss Anime & Share Lists - AnimeWorld RJ',
    description: locale === 'ja' ? 'AnimeWorld RJで他のアニメファンとつながりましょう。トレンドのトピックについて話し合ったり、ウォッチリストを共有したりします。' : locale === 'es' ? 'Conéctese con otros fans de anime en AnimeWorld RJ. Participe en debates, comparta listas de reproducción y más.' : 'Connect with other anime fans on AnimeWorld RJ. Join discussions about trending episodes, share custom watchlists, reviews, and theories.',
    path: '/community',
    locale,
  });
}

export default async function CommunityPage({ params }: Props) {
  const { locale } = await params;

  const breadcrumbJson = getBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Community', path: '/community' },
  ], locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJson).replace(/</g, '\\u003c'),
        }}
      />
      <CommunityClient />
    </>
  );
}
