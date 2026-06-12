import React, { Suspense } from 'react';
import { AnimeApi } from '@/lib/api';
import { auth } from '@/auth';
import AnimeCard from '@/components/AnimeCard';
import HeroSpotlight, {
  SectionHeader,
  ContinueWatchingRail,
  WatchLaterRail,
  Flame,
  Star,
  Sparkles,
} from '@/components/HomeComponents';
import { SectionSkeleton, HeroSkeleton } from '@/components/ui/Skeleton';

export const revalidate = 1800; // Revalidate every 30 minutes

async function HeroSection() {
  const res = await AnimeApi.getTrendingAnime(1);
  const trending = res.data || [];
  // Use top 8 as hero candidates
  return <HeroSpotlight items={trending.slice(0, 8)} />;
}

async function TrendingSection() {
  const res = await AnimeApi.getTrendingAnime(1);
  const data = res.data || [];
  return (
    <section className="space-y-4">
      <SectionHeader title="Trending Now" icon={<Flame size={20} />} viewAllHref="/search" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 auto-rows-fr grid-flow-row-dense">
        {data.slice(0, 9).map((anime, i) => {
          let variant: 'standard' | 'large' | 'wide' = 'standard';
          if (i === 0) variant = 'large';
          else if (i === 1) variant = 'wide';
          return (
            <AnimeCard key={anime.mal_id} anime={anime} rank={i + 1} variant={variant} />
          );
        })}
      </div>
    </section>
  );
}

async function SeasonalSection() {
  const res = await AnimeApi.getSeasonalAnime(1);
  const data = res.data || [];
  return (
    <section className="space-y-4">
      <SectionHeader title="This Season" icon={<Sparkles size={20} />} viewAllHref="/search?season=current" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 auto-rows-fr grid-flow-row-dense">
        {data.slice(0, 9).map((anime, i) => {
          let variant: 'standard' | 'large' | 'wide' = 'standard';
          if (i === 0) variant = 'large';
          else if (i === 1) variant = 'wide';
          return (
            <AnimeCard key={anime.mal_id} anime={anime} variant={variant} />
          );
        })}
      </div>
    </section>
  );
}

async function TopRatedSection() {
  const res = await AnimeApi.getTopRatedAnime(1);
  const data = res.data || [];
  return (
    <section className="space-y-4">
      <SectionHeader title="All-Time Top Rated" icon={<Star size={20} />} viewAllHref="/search?sort=score" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {data.slice(0, 12).map((anime, i) => (
          <AnimeCard key={anime.mal_id} anime={anime} rank={i + 1} />
        ))}
      </div>
    </section>
  );
}

async function ContinueWatchingSection({ userId }: { userId: string }) {
  const entries = await AnimeApi.getContinueWatching(userId);
  if (!entries.length) return null;
  return <ContinueWatchingRail entries={entries} />;
}

async function WatchLaterSection({ userId }: { userId: string }) {
  const entries = await AnimeApi.getUserList(userId, 'planning');
  if (!entries.length) return null;
  return <WatchLaterRail entries={entries} />;
}

export default async function HomePage() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;

  return (
    <div className="space-y-12 pb-20">
      {/* Hero Spotlight */}
      <Suspense fallback={<HeroSkeleton />}>
        <HeroSection />
      </Suspense>

      {/* Continue Watching — only for logged-in users */}
      {userId && (
        <Suspense fallback={null}>
          <ContinueWatchingSection userId={userId} />
        </Suspense>
      )}

      {/* Watch Later — only for logged-in users */}
      {userId && (
        <Suspense fallback={null}>
          <WatchLaterSection userId={userId} />
        </Suspense>
      )}

      {/* Trending */}
      <Suspense fallback={<SectionSkeleton />}>
        <TrendingSection />
      </Suspense>

      {/* Seasonal */}
      <Suspense fallback={<SectionSkeleton />}>
        <SeasonalSection />
      </Suspense>

      {/* Top Rated */}
      <Suspense fallback={<SectionSkeleton />}>
        <TopRatedSection />
      </Suspense>
    </div>
  );
}
