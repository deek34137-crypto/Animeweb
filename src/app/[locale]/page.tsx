import React, { Suspense } from 'react';
import { Metadata } from 'next';
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

import { HeroSkeleton, SectionSkeleton } from '@/components/ui/Skeleton';
import SectionErrorFallback from '@/components/ui/SectionErrorFallback';
import { getSeoMetadata, getOrganizationSchema, getWebsiteSchema } from '@/lib/seo';

// Helper: Calculate watch streak
async function calculateCurrentStreak(userId: string): Promise<number> {
  try {
    const history = await db.watchHistory.findMany({
      where: { userId },
      select: { completedAt: true },
      orderBy: { completedAt: 'desc' },
      take: 365,
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

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  return getSeoMetadata({
    title: locale === 'ja' ? 'AnimeWorld RJ - 無料アニメ追跡、レビュー、ディスカッションプラットフォーム' : locale === 'es' ? 'AnimeWorld RJ - Plataforma Gratuita para Seguir, Reseñar y Discutir Anime' : 'AnimeWorld RJ - Watch, Track, Review & Share Anime Online',
    description: locale === 'ja' ? 'AnimeWorld RJはアニメファンのための究極のソーシャルプラットフォームです。ウォッチリストを作成し、視聴履歴を記録し、他のオタクたちとコミュニティで語り合いましょう。' : locale === 'es' ? 'AnimeWorld RJ es la plataforma social definitiva para fans de anime. Crea listas de reproducción, haz un seguimiento de tu historial y conéctate con otros otakus.' : 'AnimeWorld RJ is the ultimate social platform for anime lovers. Track your watch progress, curated custom collections, earn achievements, and discuss characters in community.',
    path: '',
    locale,
  });
}

// ─── Main Landing Page (Compiles Static Shell Instantly) ──────────────────────
export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const orgSchema = getOrganizationSchema();
  const websiteSchema = getWebsiteSchema();

  return (
    <div className="space-y-10 pb-16 animate-fade-in">
      {/* JSON-LD Schemas */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(orgSchema).replace(/</g, '\\u003c'),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteSchema).replace(/</g, '\\u003c'),
        }}
      />

      {/* 1. Hero Spotlight Carousel Rotation (Suspended) */}
      <Suspense fallback={<HeroSkeleton />}>
        <HeroSection />
      </Suspense>

      {/* 2. Quick Actions Row (Suspended) */}
      <Suspense fallback={<div className="h-16 shimmer-loader rounded-xl" />}>
        <QuickActionsSection />
      </Suspense>

      {/* Recently Visited Links */}
      <RecentHistory />

      {/* 3. Continue Watching & User Dashboard Stats (Suspended) */}
      <Suspense fallback={<div className="h-64 shimmer-loader rounded-2xl" />}>
        <UserDashboardSection />
      </Suspense>

      {/* ─── Content Feed Carousels ─── */}
      <div className="space-y-12">
        {/* Trending Now */}
        <Suspense fallback={<SectionSkeleton count={6} />}>
          <TrendingSection />
        </Suspense>

        {/* Popular This Season */}
        <Suspense fallback={<SectionSkeleton count={6} />}>
          <SeasonalSection />
        </Suspense>

        {/* Top Rated */}
        <Suspense fallback={<SectionSkeleton count={6} />}>
          <TopRatedSection />
        </Suspense>

        {/* New Episodes Today */}
        <Suspense fallback={<SectionSkeleton count={6} />}>
          <RecentlyUpdatedSection />
        </Suspense>

        {/* Recommended For You (logged-in only; Suspended) */}
        <Suspense fallback={null}>
          <UserRecommendationsSection />
        </Suspense>

        {/* Genres */}
        <Genres />
      </div>
    </div>
  );
}

// ─── Suspenseful Server Component: Hero Section ──────────────────────────────
async function HeroSection() {
  let trending: AnimeData[] = [];
  let seasonal: AnimeData[] = [];
  let topRated: AnimeData[] = [];
  let recommendations: AnimeData[] = [];
  let schedules: AnimeData[] = [];
  let continueWatching: any[] = [];
  let userId: string | undefined = undefined;

  try {
    const session = await auth().catch(() => null);
    userId = session?.user?.id;

    const promises: Promise<any>[] = [
      AnimeApi.getTrendingAnime(1).catch(() => ({ data: [] })),
      AnimeApi.getSeasonalAnime(1).catch(() => ({ data: [] })),
      AnimeApi.getTopRatedAnime(1).catch(() => ({ data: [] })),
      AnimeApi.getRecentAnimeRecommendations(1).catch(() => ({ data: [] })),
      AnimeApi.getAiringSchedule(1).catch(() => ({ data: [] })),
    ];
    
    if (userId) {
      promises.push(AnimeApi.getContinueWatching(userId).catch(() => []));
    }

    const [
      trendingRes,
      seasonalRes,
      topRatedRes,
      recsRes,
      schedulesRes,
      continueWatchingRes,
    ] = await Promise.all(promises);

    trending = trendingRes.data || [];
    seasonal = seasonalRes.data || [];
    topRated = topRatedRes.data || [];
    const rawRecs = recsRes.data || [];
    recommendations = rawRecs
      .map((item: any) => {
        const entry = item?.entry || item;
        if (!entry) return null;
        return {
          mal_id: entry.mal_id || entry.id || 0,
          title: entry.title || 'Unknown',
          images: entry.images || { jpg: { image_url: '', large_image_url: '', small_image_url: '' } },
          url: entry.url || '',
          score: null,
          type: 'TV',
          episodes: null,
        };
      })
      .filter(Boolean) as unknown as AnimeData[];
    schedules = schedulesRes.data || [];
    continueWatching = continueWatchingRes || [];
  } catch (error) {
    console.error('Failed to load HeroSection feeds:', error);
  }

  if (trending.length === 0 && seasonal.length === 0) {
    return <SectionErrorFallback title="Spotlight Hero Spotlight" />;
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
  const session = await auth().catch(() => null);
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
  const session = await auth().catch(() => null);
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

// ─── Sibling Async component: Trending Now ────────────────────────────────────
async function TrendingSection() {
  let trending: AnimeData[] = [];
  let hasError = false;

  try {
    const res = await AnimeApi.getTrendingAnime(1);
    trending = res.data || [];
    if (trending.length === 0) throw new Error("Empty trending catalog");
  } catch (error) {
    console.error('TrendingSection failed to load:', error);
    hasError = true;
  }

  if (hasError) {
    return <SectionErrorFallback title="Trending Now" />;
  }
  return <TrendingNow items={trending} />;
}

// ─── Sibling Async component: Seasonal highlights ─────────────────────────────
async function SeasonalSection() {
  let seasonal: AnimeData[] = [];
  let hasError = false;

  try {
    const res = await AnimeApi.getSeasonalAnime(1);
    seasonal = res.data || [];
    if (seasonal.length === 0) throw new Error("Empty seasonal catalog");
  } catch (error) {
    console.error('SeasonalSection failed to load:', error);
    hasError = true;
  }

  if (hasError) {
    return <SectionErrorFallback title="Popular This Season" />;
  }
  return <SeasonalAnime items={seasonal} />;
}

// ─── Sibling Async component: Top Rated ───────────────────────────────────────
async function TopRatedSection() {
  let topRated: AnimeData[] = [];
  let hasError = false;

  try {
    const res = await AnimeApi.getTopRatedAnime(1);
    topRated = res.data || [];
    if (topRated.length === 0) throw new Error("Empty top rated catalog");
  } catch (error) {
    console.error('TopRatedSection failed to load:', error);
    hasError = true;
  }

  if (hasError) {
    return <SectionErrorFallback title="Top Rated Anime" />;
  }
  return <TopRated items={topRated} />;
}

// ─── Sibling Async component: Recently Updated ────────────────────────────────
async function RecentlyUpdatedSection() {
  let seasonal: AnimeData[] = [];
  let hasError = false;

  try {
    const res = await AnimeApi.getSeasonalAnime(1);
    seasonal = res.data || [];
    if (seasonal.length === 0) throw new Error("Empty seasonal catalog for updates");
  } catch (error) {
    console.error('RecentlyUpdatedSection failed to load:', error);
    hasError = true;
  }

  if (hasError) {
    return <SectionErrorFallback title="New Episodes Today" />;
  }
  return <RecentlyUpdated items={seasonal.slice(6, 18)} />;
}

// ─── Suspenseful Server Component: User Recommendations ─────────────────────
async function UserRecommendationsSection() {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;

  if (!userId) return null;

  let recommendations: AnimeData[] = [];
  let hasError = false;

  try {
    const recsRes = await AnimeApi.getRecentAnimeRecommendations(1);
    const rawRecs = (recsRes.data || []) as any[];
    recommendations = rawRecs
      .map((item) => {
        const entry = item?.entry || item;
        if (!entry) return null;
        return {
          mal_id: entry.mal_id || entry.id || 0,
          title: entry.title || 'Unknown',
          images: entry.images || { jpg: { image_url: '', large_image_url: '', small_image_url: '' } },
          url: entry.url || '',
          score: null,
          type: 'TV',
          episodes: null,
        };
      })
      .filter(Boolean) as unknown as AnimeData[];
  } catch (error) {
    console.error('UserRecommendationsSection failed to load:', error);
    hasError = true;
  }

  if (hasError || recommendations.length === 0) return null;
  return <RecommendedForYou items={recommendations} />;
}
