import React, { Suspense } from 'react';
import { db } from '@/lib/db';
import { JikanAPI } from '@/services/jikan';
import { getNextAiringTime } from '@/app/api/discover/schedule/route';
import CalendarDashboard from '@/components/calendar/CalendarDashboard';
import { Calendar, Compass } from 'lucide-react';
import { Link } from '@/navigation';
import { connection } from 'next/server';
import { rewriteImages } from '@/lib/image';

export const unstable_instant = false;

export default function CalendarPage() {
  return (
    <Suspense fallback={
      <div className="space-y-8 py-6 px-4 md:px-8 max-w-7xl mx-auto text-text-primary">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calendar size={22} className="text-accent-sakura" />
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Airing Countdown Calendar
              </h1>
            </div>
            <p className="text-xs md:text-sm text-text-muted">
              Weekly release schedule synced directly to your browser's local timezone.
            </p>
          </div>
        </div>
        <div className="p-16 text-center rounded-xl bg-bg-secondary/40 border border-border-subtle max-w-md mx-auto animate-pulse">
          <Calendar size={32} className="mx-auto text-text-muted mb-3" />
          <h4 className="font-bold text-sm mb-1 text-text-primary">Loading Airing Schedule...</h4>
          <p className="text-xs text-text-muted">Fetching latest simulcast release times...</p>
        </div>
      </div>
    }>
      <CalendarContent />
    </Suspense>
  );
}

function CalendarContent() {
  return (
    <div className="space-y-8 py-6 px-4 md:px-8 max-w-7xl mx-auto text-text-primary">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calendar size={22} className="text-accent-sakura" />
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Airing Countdown Calendar
            </h1>
          </div>
          <p className="text-xs md:text-sm text-text-muted">
            Weekly release schedule synced directly to your browser's local timezone.
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

      <CalendarLoader />
    </div>
  );
}

async function CalendarLoader() {
  await connection();
  let schedule: any[] = [];
  const now = new Date();

  try {
    // 1. Try loading cached airing schedules from DB
    const cachedSchedules = await db.airingScheduleCache.findMany({
      include: {
        anime: true,
      },
      orderBy: { airingAt: 'asc' },
    });

    const isStale =
      cachedSchedules.length === 0 ||
      now.getTime() - cachedSchedules[0].updatedAt.getTime() > 24 * 60 * 60 * 1000;

    if (!isStale) {
      schedule = cachedSchedules.map((item) => ({
        animeId: item.animeId,
        title: item.anime.title,
        poster: item.anime.poster,
        broadcast: item.broadcast,
        airingAt: item.airingAt.toISOString(),
      }));
    } else {
      console.log('[Calendar SSR] Cache missing or stale. Fetching live airing schedule from Jikan...');
      // 2. Fetch live schedules from Jikan
      const liveSchedule = await JikanAPI.getAiringSchedule(1).catch(() => ({ data: [] }));
      const scheduledAnime = liveSchedule.data || [];

      for (const item of scheduledAnime) {
        const animeId = String(item.mal_id);
        const broadcast = item.broadcast?.string || null;

        if (!broadcast) continue;

        const airingAt = getNextAiringTime(broadcast);

        // Pre-seed AnimeCache
        await db.animeCache.upsert({
          where: { animeId },
          create: {
            animeId,
            title: item.title,
            poster: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || '',
            score: item.score || 0.0,
            type: item.type,
            episodes: item.episodes,
            popularity: item.popularity,
            members: item.members,
            favorites: item.favorites,
            updatedAt: now,
          },
          update: {
            score: item.score || 0.0,
            popularity: item.popularity,
            members: item.members,
            favorites: item.favorites,
            updatedAt: now,
          },
        });

        // Upsert AiringScheduleCache
        await db.airingScheduleCache.upsert({
          where: { animeId },
          create: {
            animeId,
            broadcast,
            airingAt,
            updatedAt: now,
          },
          update: {
            broadcast,
            airingAt,
            updatedAt: now,
          },
        });

        schedule.push({
          animeId,
          title: item.title,
          poster: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || '',
          broadcast,
          airingAt: airingAt.toISOString(),
        });
      }
    }
  } catch (error) {
    console.error('Failed to load SSR Airing Calendar:', error);
  }

  const proxiedSchedule = rewriteImages(schedule);
  return <CalendarDashboard schedule={proxiedSchedule} />;
}
