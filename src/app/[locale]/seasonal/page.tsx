import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { AnimeData } from '@/services/jikan';
import { AnimeApi } from '@/lib/api';
import SeasonalDashboard from '@/components/seasonal/SeasonalDashboard';
import { Calendar, Compass } from 'lucide-react';
import { Link } from '@/navigation';
import { connection } from 'next/server';
import { rewriteImages } from '@/lib/image';
import { SectionSkeleton } from '@/components/ui/Skeleton';
import { getSeoMetadata, getBreadcrumbSchema } from '@/lib/seo';

export const unstable_instant = false;

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return getSeoMetadata({
    title: locale === 'ja' ? 'シーズンアニメセンター - 今期アニメと来期プレビュー' : locale === 'es' ? 'Centro de Anime de Temporada - Estrenos y Próximos' : 'Seasonal Anime Center - Active Releases & Previews',
    description: locale === 'ja' ? '今期および来期の新作アニメ情報を確認しましょう。あらすじ、キャスト、スタッフ、放映開始日の情報をお届けします。' : locale === 'es' ? 'Explore los lanzamientos activos de la temporada actual y los avances de los próximos títulos.' : 'Browse the seasonal anime lineup. Check summaries, studios, characters, genres, and release schedules for current and upcoming seasons.',
    path: '/seasonal',
    locale,
  });
}

export default async function SeasonalPage({ params }: Props) {
  const { locale } = await params;

  const breadcrumbJson = getBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Discover', path: '/discover' },
    { name: 'Seasonal', path: '/seasonal' },
  ], locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJson).replace(/</g, '\\u003c'),
        }}
      />
      <Suspense fallback={
      <div className="space-y-8 py-6 px-4 md:px-8 max-w-7xl mx-auto text-text-primary">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calendar size={22} className="text-accent-sakura" />
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Seasonal Anime Center
              </h1>
            </div>
            <p className="text-xs md:text-sm text-text-muted">
              Explore active releases for the current season and previews for upcoming titles.
            </p>
          </div>
        </div>
        <div className="space-y-8">
          <SectionSkeleton count={6} />
        </div>
      </div>
    }>
      <SeasonalContent />
    </Suspense>
    </>
  );
}

function SeasonalContent() {
  return (
    <div className="space-y-8 py-6 px-4 md:px-8 max-w-7xl mx-auto text-text-primary">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calendar size={22} className="text-accent-sakura" />
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Seasonal Anime Center
            </h1>
          </div>
          <p className="text-xs md:text-sm text-text-muted">
            Explore active releases for the current season and previews for upcoming titles.
          </p>
        </div>

        <Link
          href="/discover"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-secondary hover:bg-bg-elevated border border-border-subtle text-xs font-semibold transition-all cursor-pointer w-fit"
        >
          <Compass size={14} className="text-accent-sakura" />
          Back to Discover
        </Link>
      </div>

      <SeasonalLoader />
    </div>
  );
}

async function SeasonalLoader() {
  await connection();
  let currentSeason: AnimeData[] = [];
  let upcomingSeason: AnimeData[] = [];
  let seasonName = 'Current';
  let seasonYear = new Date().getFullYear();

  try {
    const [currentRes, upcomingRes] = await Promise.all([
      AnimeApi.getSeasonalAnime(1).catch(() => ({ data: [] })),
      AnimeApi.getUpcomingSeasonalAnime(1).catch(() => ({ data: [] })),
    ]);

    currentSeason = currentRes.data || [];
    upcomingSeason = upcomingRes.data || [];

    if (currentSeason.length > 0) {
      const first = currentSeason[0];
      if (first.season) {
        seasonName = first.season.charAt(0).toUpperCase() + first.season.slice(1);
      }
      if (first.year) {
        seasonYear = first.year;
      }
    }
  } catch (error) {
    console.error('Failed to load SSR Seasonal Anime Center:', error);
  }

  const proxiedCurrent = rewriteImages(currentSeason);
  const proxiedUpcoming = rewriteImages(upcomingSeason);

  return (
    <SeasonalDashboard
      currentSeason={proxiedCurrent}
      upcomingSeason={proxiedUpcoming}
      seasonName={seasonName}
      seasonYear={seasonYear}
    />
  );
}
