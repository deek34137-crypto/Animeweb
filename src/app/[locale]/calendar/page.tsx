import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { db } from '@/lib/db';
import { JikanAPI } from '@/services/jikan';
import { getNextAiringTime } from '@/app/api/discover/schedule/route';
import CalendarDashboard from '@/components/calendar/CalendarDashboard';
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
    title: locale === 'ja' ? '毎週のアニメ放映スケジュール＆カウントダウン' : locale === 'es' ? 'Calendario de Estrenos y Cuenta Regresiva de Anime' : 'Weekly Anime Airing Schedule & Countdown Calendar',
    description: locale === 'ja' ? '今週放映されるアニメのスケジュール、放映カウントダウン、リリース日をローカルタイムゾーンで確認しましょう。' : locale === 'es' ? 'Vea el calendario semanal de estrenos de anime, la cuenta regresiva de los episodios y las fechas de lanzamiento.' : 'Check the weekly anime release schedule, episode airing countdowns, and launch times adjusted to your local timezone.',
    path: '/calendar',
    locale,
  });
}

export default async function CalendarPage({ params }: Props) {
  const { locale } = await params;
  
  const breadcrumbJson = getBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Discover', path: '/discover' },
    { name: 'Calendar', path: '/calendar' },
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
      <div className="space-y-8 text-text-primary">
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
        <div className="space-y-8">
          <SectionSkeleton count={6} />
        </div>
      </div>
    }>
      <CalendarContent />
    </Suspense>
    </>
  );
}

function CalendarContent() {
  return (
    <div className="space-y-8 text-text-primary">
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
