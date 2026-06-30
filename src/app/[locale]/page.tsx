import React, { Suspense } from 'react';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { AnimeApi } from '@/lib/api';
import HeroBanner from '@/components/dashboard/HeroBanner';
import QuickActions from '@/components/dashboard/QuickActions';
import StatCard from '@/components/dashboard/StatCard';
import GuestWelcome from '@/components/dashboard/GuestWelcome';
import ContinueWatchingCard from '@/components/dashboard/ContinueWatchingCard';
import RecentWatchCard from '@/components/dashboard/RecentWatchCard';
import SectionHeader from '@/components/dashboard/SectionHeader';
import RecentHistory from '@/components/dashboard/RecentHistory';
import { Play, CheckCircle, Tv, Clock, Flame } from 'lucide-react';
import { AnimeData } from '@/services/jikan';

import TrendingNow from '@/components/dashboard/TrendingNow';
import TopRated from '@/components/dashboard/TopRated';
import SeasonalAnime from '@/components/dashboard/SeasonalAnime';
import RecentlyUpdated from '@/components/dashboard/RecentlyUpdated';
import RecommendedForYou from '@/components/dashboard/RecommendedForYou';
import Genres from '@/components/dashboard/Genres';

// Helper: Calculate watch streak
async function calculateCurrentStreak(userId: string): Promise<number> {
  try {
    const history = await db.watchHistory.findMany({
      where: { userId },
      select: { completedAt: true },
      orderBy: { completedAt: 'desc' },
    });
    
    if (history.length === 0) return 0;
    
    const uniqueDates = Array.from(
      new Set(
        history.map((h) => {
          const d = new Date(h.completedAt);
          d.setHours(0, 0, 0, 0);
          return d.getTime();
        })
      )
    ).sort((a, b) => b - a);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();
    const yesterdayTime = todayTime - 24 * 60 * 60 * 1000;

    const latestWatchTime = uniqueDates[0];
    if (latestWatchTime !== todayTime && latestWatchTime !== yesterdayTime) {
      return 0;
    }

    let streak = 1;
    let expectedTime = latestWatchTime - 24 * 60 * 60 * 1000;

    for (let i = 1; i < uniqueDates.length; i++) {
      if (uniqueDates[i] === expectedTime) {
        streak++;
        expectedTime -= 24 * 60 * 60 * 1000;
      } else if (uniqueDates[i] < expectedTime) {
        break;
      }
    }

    return streak;
  } catch (error) {
    console.error('Failed to calculate watch streak:', error);
    return 0;
  }
}

// Helper: Format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

// ─── Main Landing Page (Compiles Static Shell Instantly) ──────────────────────
export default async function HomePage() {
  // ─── Jikan API Feeds Loading (Parallelized, Aggressively Cached via AnimeApi) ───
  let trending: AnimeData[] = [];
  let seasonal: AnimeData[] = [];
  let topRated: AnimeData[] = [];
  let recommendations: AnimeData[] = [];
  let schedules: AnimeData[] = [];
  let jikanDown = false;

  try {
    const [
      trendingRes,
      seasonalRes,
      topRatedRes,
      recsRes,
      schedulesRes,
    ] = await Promise.all([
      AnimeApi.getTrendingAnime(1).catch(() => ({ data: [] as AnimeData[] })),
      AnimeApi.getSeasonalAnime(1).catch(() => ({ data: [] as AnimeData[] })),
      AnimeApi.getTopRatedAnime(1).catch(() => ({ data: [] as AnimeData[] })),
      AnimeApi.getRecentAnimeRecommendations(1).catch(() => ({ data: [] as AnimeData[] })),
      AnimeApi.getAiringSchedule(1).catch(() => ({ data: [] as AnimeData[] })),
    ]);

    trending = trendingRes.data || [];
    seasonal = seasonalRes.data || [];
    topRated = topRatedRes.data || [];
    recommendations = ((recsRes.data || []) as any[]).map((item) => ({
      mal_id: item.entry.mal_id,
      title: item.entry.title,
      images: item.entry.images,
      url: item.entry.url,
      score: null,
      type: 'TV',
      episodes: null,
    })) as unknown as AnimeData[];
    schedules = (schedulesRes.data as unknown as AnimeData[]) || [];

    // If every feed came back empty simultaneously, the API is likely down
    jikanDown = [
      trending, seasonal, topRated, recommendations, schedules,
    ].every((feed) => feed.length === 0);
  } catch (error) {
    console.error('Failed to fetch dashboard content feeds:', error);
    jikanDown = true;
  }

  return (
    <div className="space-y-10 pb-16 animate-fade-in">

      {/* Jikan API outage banner */}
      {jikanDown && (
        <div className="mx-4 md:mx-0 flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
          <span className="mt-0.5 text-yellow-400">⚠️</span>
          <div>
            <p className="font-semibold">Anime catalog temporarily unavailable</p>
            <p className="text-yellow-300/70 text-xs mt-0.5">
              MyAnimeList / Jikan API is experiencing downtime. Trending, seasonal, and top-rated
              sections will reappear automatically once the service recovers. Streaming still works normally.
            </p>
          </div>
        </div>
      )}

      {/* 1. Hero Spotlight Carousel Rotation (Suspended) */}
      <Suspense fallback={<div className="h-[480px] shimmer-loader rounded-2xl animate-pulse" />}>
        <HeroSection
          trending={trending}
          seasonal={seasonal}
          schedules={schedules}
          topRated={topRated}
          recommendations={recommendations}
        />
      </Suspense>

      {/* 2. Quick Actions Row (Suspended) */}
      <Suspense fallback={<div className="h-16 shimmer-loader rounded-xl animate-pulse" />}>
        <QuickActionsSection />
      </Suspense>

      {/* Recently Visited Links */}
      <RecentHistory />

      {/* 3. Continue Watching & User Dashboard Stats (Suspended) */}
      <Suspense fallback={<div className="h-64 shimmer-loader rounded-2xl animate-pulse" />}>
        <UserDashboardSection />
      </Suspense>

      {/* ─── Content Feed Carousels ─── */}
      <div className="space-y-12">
        {/* Trending Now */}
        <TrendingNow items={trending} />

        {/* Popular This Season */}
        <SeasonalAnime items={seasonal} />

        {/* Top Rated */}
        <TopRated items={topRated} />

        {/* New Episodes Today */}
        <RecentlyUpdated items={seasonal.slice(6, 18)} />

        {/* Recommended For You (logged-in only; Suspended) */}
        <Suspense fallback={null}>
          <UserRecommendationsSection recommendations={recommendations} />
        </Suspense>

        {/* Genres */}
        <Genres />
      </div>
    </div>
  );
}

// ─── Suspenseful Server Component: Hero Section ──────────────────────────────
async function HeroSection({
  trending,
  seasonal,
  schedules,
  topRated,
  recommendations,
}: {
  trending: AnimeData[];
  seasonal: AnimeData[];
  schedules: AnimeData[];
  topRated: AnimeData[];
  recommendations: AnimeData[];
}) {
  const session = await auth();
  const userId = session?.user?.id;

  let continueWatching: any[] = [];
  if (userId) {
    continueWatching = await AnimeApi.getContinueWatching(userId).catch(() => []);
  }

  return (
    <HeroBanner
      continueWatching={continueWatching.length > 0 ? continueWatching[0] : null}
      trendingToday={trending.length > 0 ? trending[0] : null}
      seasonSpotlight={seasonal.length > 0 ? seasonal[0] : null}
      upcomingRelease={schedules.length > 0 ? schedules[0] : null}
      editorsPick={topRated.length > 0 ? topRated[0] : null}
      randomRec={recommendations.length > 0 ? recommendations[Math.floor(Math.random() * recommendations.length)] : null}
      guestMode={!userId}
    />
  );
}

// ─── Suspenseful Server Component: Quick Actions ─────────────────────────────
async function QuickActionsSection() {
  const session = await auth();
  const userId = session?.user?.id;

  let continueWatching: any[] = [];
  if (userId) {
    continueWatching = await AnimeApi.getContinueWatching(userId).catch(() => []);
  }

  const resumeUrl = continueWatching.length > 0
    ? `/watch/${continueWatching[0].animeId}/${continueWatching[0].episodesWatched}`
    : null;

  return <QuickActions resumeUrl={resumeUrl} guestMode={!userId} />;
}

// ─── Suspenseful Server Component: User Dashboard Stats & Continue Watching ───
async function UserDashboardSection() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return <GuestWelcome />;
  }

  let listEntries: any[] = [];
  let continueWatching: any[] = [];
  let watchHistory: any[] = [];
  let streak = 0;

  try {
    const [entriesRes, continueRes, historyRes, streakRes] = await Promise.all([
      db.listEntry.findMany({ where: { userId } }),
      AnimeApi.getContinueWatching(userId),
      db.watchHistory.findMany({
        where: { userId },
        orderBy: { completedAt: 'desc' },
        take: 6,
      }),
      calculateCurrentStreak(userId),
    ]);

    listEntries = entriesRes;
    continueWatching = continueRes;
    watchHistory = historyRes.map((h) => ({
      animeId: h.animeId,
      animeTitle: h.animeTitle,
      animeImage: h.animeImage,
      episode: h.episode,
      completedAt: formatRelativeTime(new Date(h.completedAt)),
    }));
    streak = streakRes;
  } catch (error) {
    console.error('Failed to load personalized database tracker:', error);
  }

  const watchingCount = listEntries.filter((e) => e.status === 'watching').length;
  const completedCount = listEntries.filter((e) => e.status === 'completed').length;
  const totalEpisodesWatched = listEntries.reduce((sum, e) => sum + e.episodesWatched, 0);
  const totalHours = Math.round((totalEpisodesWatched * 24) / 60);

  return (
    <div className="space-y-8">
      {/* Tracker Statistics */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Dashboard Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard title="Watching" value={watchingCount} icon={<Play size={16} className="text-accent-violet" />} />
          <StatCard title="Completed" value={completedCount} icon={<CheckCircle size={16} className="text-emerald-500" />} />
          <StatCard title="Episodes Watched" value={totalEpisodesWatched} icon={<Tv size={16} className="text-accent-pink" />} />
          <StatCard title="Hours Watched" value={`${totalHours}h`} icon={<Clock size={16} className="text-accent-cyan" />} />
          <StatCard title="Current Streak" value={`${streak} days`} icon={<Flame size={16} className="text-amber-500" />} description={streak > 0 ? "Keep it up!" : "Watch today to start!"} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Other Continue Watching */}
        <div className="lg:col-span-2 space-y-3">
          <SectionHeader title="Other Continue Watching" />
          {continueWatching.length > 1 ? (
            <div className="flex gap-4 overflow-x-auto pb-3 rail-scroll snap-x scrollbar-thin">
              {continueWatching.slice(1).map((entry) => (
                <div key={entry.animeId} className="snap-start">
                  <ContinueWatchingCard entry={entry} />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-border-subtle bg-bg-secondary/20 py-8 text-center text-xs text-text-muted">
              No other shows in progress.
            </div>
          )}
        </div>

        {/* Right: Recently Watched list */}
        <div className="space-y-3">
          <SectionHeader title="Recently Watched" />
          {watchHistory.length > 0 ? (
            <div className="grid grid-cols-1 gap-2.5">
              {watchHistory.map((entry) => (
                <RecentWatchCard key={`${entry.animeId}-${entry.episode}`} entry={entry} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-border-subtle bg-bg-secondary/20 py-8 text-center text-xs text-text-muted">
              No recently watched episodes.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Suspenseful Server Component: User Recommendations ─────────────────────
async function UserRecommendationsSection({
  recommendations,
}: {
  recommendations: AnimeData[];
}) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return null;

  return <RecommendedForYou items={recommendations} />;
}
