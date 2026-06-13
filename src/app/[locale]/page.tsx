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
import { Globe } from 'lucide-react';
import { Link } from '@/navigation';

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
        {data.slice(0, 8).map((anime, i) => {
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
        {data.slice(0, 8).map((anime, i) => {
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

async function BrowseByLanguageSection() {
  const languages = [
    { code: 'hindi', name: 'Hindi', label: 'हिंदी', bg: 'from-orange-600 to-amber-500', glow: 'shadow-orange-500/20' },
    { code: 'japanese', name: 'Japanese', label: '日本語', bg: 'from-red-600 to-rose-500', glow: 'shadow-red-500/20' },
    { code: 'english', name: 'English', label: 'English', bg: 'from-blue-600 to-indigo-500', glow: 'shadow-blue-500/20' },
    { code: 'tamil', name: 'Tamil', label: 'தமிழ்', bg: 'from-teal-600 to-emerald-500', glow: 'shadow-teal-500/20' },
    { code: 'telugu', name: 'Telugu', label: 'తెలుగు', bg: 'from-purple-600 to-pink-500', glow: 'shadow-purple-500/20' },
  ];

  return (
    <section className="space-y-4">
      <SectionHeader title="Browse By Language" icon={<Globe size={20} />} />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {languages.map((lang) => (
          <Link
            key={lang.code}
            href={`/search?lang=${lang.code}`}
            className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${lang.bg} p-5 flex flex-col justify-between aspect-[16/10] border border-white/10 shadow-lg ${lang.glow} transition-all duration-300 hover:scale-[1.05] hover:shadow-2xl`}
          >
            {/* Ambient Background Light */}
            <div className="absolute inset-0 bg-black/15 group-hover:bg-black/5 transition-colors duration-300" />
            <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-300" />

            <span className="text-[10px] font-black tracking-widest uppercase text-white/70 select-none">
              {lang.name}
            </span>
            <div className="space-y-1 z-10">
              <h3 className="text-sm sm:text-base font-black text-white font-display tracking-tight leading-tight">
                {lang.name} Dub
              </h3>
              <p className="text-[11px] font-bold text-white/85 font-mono tracking-wide">
                {lang.label}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
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

      {/* Browse By Language */}
      <BrowseByLanguageSection />

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
