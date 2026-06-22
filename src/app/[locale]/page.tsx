import React from 'react';
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

export const revalidate = 900; // Cache homepage SSR data for 15 minutes to prevent Jikan rate limiting

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

export default async function HomePage() {
  const session = await auth();
  const userId = session?.user?.id;

  // ─── Logged In Personal Data Loading ───
  let listEntries: any[] = [];
  let continueWatching: any[] = [];
  let watchHistory: any[] = [];
  let streak = 0;

  if (userId) {
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
  }

  // ─── Jikan API Feeds Loading (Parallelized & Stable) ───
  let trending: AnimeData[] = [];
  let seasonal: AnimeData[] = [];
  let topAiring: AnimeData[] = [];
  let topRated: AnimeData[] = [];
  let schedules: AnimeData[] = [];
  let recommendations: AnimeData[] = [];
  let becauseWatchedTitle = '';
  let becauseWatchedRecs: AnimeData[] = [];

  try {
    const [
      trendingRes,
      seasonalRes,
      topAiringRes,
      topRatedRes,
      schedulesRes,
      recsRes,
    ] = await Promise.all([
      AnimeApi.getTrendingAnime(1).catch(() => ({ data: [] })),
      AnimeApi.getSeasonalAnime(1).catch(() => ({ data: [] })),
      AnimeApi.getTopAiringAnime(1).catch(() => ({ data: [] })),
      AnimeApi.getTopRatedAnime(1).catch(() => ({ data: [] })),
      AnimeApi.getAiringSchedule(1).catch(() => ({ data: [] })),
      AnimeApi.getRecentAnimeRecommendations(1).catch(() => ({ data: [] })),
    ]);

    trending = trendingRes.data || [];
    seasonal = seasonalRes.data || [];
    topAiring = topAiringRes.data || [];
    topRated = topRatedRes.data || [];
    schedules = schedulesRes.data || [];
    recommendations = recsRes.data || [];

    // Personalization logic: "Because You Watched"
    let completedShowId = '';
    const completedList = listEntries.filter((e) => e.status === 'completed');
    
    if (completedList.length > 0) {
      // Find highest rated completed show
      const topCompleted = completedList.sort((a, b) => (b.score || 0) - (a.score || 0))[0];
      completedShowId = topCompleted.animeId;
      becauseWatchedTitle = topCompleted.animeTitle;
    } else {
      // Fallback for guests / new users: recommend based on Demon Slayer (MAL ID: 38000)
      completedShowId = '38000';
      becauseWatchedTitle = 'Demon Slayer';
    }

    if (completedShowId) {
      try {
        const rawRecs = await AnimeApi.getAnimeRecommendations(parseInt(completedShowId, 10));
        becauseWatchedRecs = rawRecs.map((r) => r.entry).filter(Boolean) as AnimeData[];
      } catch (err) {
        console.error('Failed to load personalized recommendations:', err);
      }
    }
  } catch (error) {
    console.error('Failed to fetch dashboard content feeds:', error);
  }

  // Stats
  const watchingCount = listEntries.filter((e) => e.status === 'watching').length;
  const completedCount = listEntries.filter((e) => e.status === 'completed').length;
  const totalEpisodesWatched = listEntries.reduce((sum, e) => sum + e.episodesWatched, 0);
  const totalHours = Math.round((totalEpisodesWatched * 24) / 60);

  const resumeUrl = continueWatching.length > 0
    ? `/watch/${continueWatching[0].animeId}/${continueWatching[0].episodesWatched}`
    : null;

  return (
    <div className="space-y-10 pb-16 animate-fade-in">
      {/* 1. Hero Spotlight Carousel Rotation */}
      <HeroBanner
        continueWatching={continueWatching.length > 0 ? continueWatching[0] : null}
        trendingToday={trending.length > 0 ? trending[0] : null}
        seasonSpotlight={seasonal.length > 0 ? seasonal[0] : null}
        upcomingRelease={schedules.length > 0 ? schedules[0] : null}
        editorsPick={topRated.length > 0 ? topRated[0] : null}
        randomRec={recommendations.length > 0 ? recommendations[Math.floor(Math.random() * recommendations.length)] : null}
        guestMode={!userId}
      />

      {/* 2. Quick Actions Row */}
      <QuickActions resumeUrl={resumeUrl} guestMode={!userId} />

      {/* Recently Visited Links */}
      <RecentHistory />

      {/* 3. Continue Watching (logged-in only; including stats and progress) */}
      {userId ? (
        <div className="space-y-8">
          {/* Logged In Tracker Statistics */}
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
      ) : (
        /* Guest View Onboarding banner */
        <GuestWelcome />
      )}

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

        {/* Recommended For You (logged-in only) */}
        {userId && <RecommendedForYou items={recommendations} />}

        {/* Genres */}
        <Genres />
      </div>
    </div>
  );
}
