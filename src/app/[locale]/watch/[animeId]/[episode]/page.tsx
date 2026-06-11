import React, { Suspense } from 'react';
import { auth } from '@/auth';
import { AnimeApi } from '@/lib/api';
import { db } from '@/lib/db';
import { StreamingManager } from '@/lib/streaming';
import { ArrowLeft, Play, Calendar, Film, Bookmark } from 'lucide-react';
import { Link } from '@/navigation';
import VideoPlayer from '@/components/video/VideoPlayer';
import EpisodeSidebar from './EpisodeSidebar';

interface WatchPageProps {
  params: Promise<{ animeId: string; episode: string; locale: string }>;
}

export const revalidate = 0; // Dynamic route

export default async function WatchPage({ params }: WatchPageProps) {
  const { animeId, episode, locale } = await params;
  const malId = parseInt(animeId, 10);
  const epNum = parseInt(episode, 10);

  const session = await auth();
  const userId = session?.user?.id;

  if (isNaN(malId) || isNaN(epNum)) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-black text-text-primary">Invalid Route Parameters</h1>
        <Link href="/" className="mt-4 inline-block text-accent-violet hover:underline">← Return Home</Link>
      </div>
    );
  }

  // Fetch anime details, episodes, and stream info in parallel
  const [anime, streamInfo, episodes] = await Promise.all([
    AnimeApi.getAnimeDetail(malId, userId),
    StreamingManager.getStreamInfo(animeId, epNum).catch(() => ({ sources: [], sub: [], dub: [], subtitles: [], providers: [], currentProvider: 'mock' })),
    StreamingManager.getEpisodes(animeId).catch(() => []),
  ]);

  if (!anime) {
    return (
      <div className="py-20 text-center space-y-4">
        <h1 className="text-2xl font-black text-text-primary">Anime Not Found</h1>
        <Link href="/" className="mt-4 inline-block text-accent-violet hover:underline">← Return Home</Link>
      </div>
    );
  }

  // Fetch last saved position if authenticated
  let initialPosition = 0;
  let watchedEpisodes: number[] = [];

  if (userId) {
    const progress = await db.watchProgress.findUnique({
      where: {
        userId_animeId_episode: {
          userId,
          animeId: String(animeId),
          episode: epNum,
        },
      },
    });
    if (progress) {
      initialPosition = progress.position;
    }

    const history = await db.watchHistory.findMany({
      where: {
        userId,
        animeId: String(animeId),
      },
      select: {
        episode: true,
      },
    });
    watchedEpisodes = history.map((h) => h.episode);
  }

  const mainTitle = anime.title_english || anime.title;
  const currentEp = episodes.find((e) => e.number === epNum);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-up">
      {/* Back to details header */}
      <div className="flex items-center gap-2">
        <Link
          href={`/anime/${animeId}` as '/'}
          className="inline-flex items-center gap-2 text-xs font-bold text-text-muted hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Details
        </Link>
      </div>

      {/* Main Grid Layout: Player and Episodes Browser */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* Left Area: Video Player & Details */}
        <div className="space-y-6 min-w-0">
          <Suspense fallback={<div className="aspect-video w-full rounded-2xl shimmer-loader" />}>
            <VideoPlayer
              animeId={animeId}
              animeImage={anime.images.webp.large_image_url || ''}
              sources={streamInfo.sources}
              subSources={streamInfo.sub}
              dubSources={streamInfo.dub}
              subtitles={streamInfo.subtitles}
              animeTitle={mainTitle}
              episodeNumber={epNum}
              totalEpisodes={episodes.length}
              initialPosition={initialPosition}
              providers={streamInfo.providers}
              currentProvider={streamInfo.currentProvider}
            />
          </Suspense>

          {/* Episode Info & Meta */}
          <div className="glass-panel border border-border-default rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border-subtle">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-text-primary font-display leading-tight">
                  Episode {epNum} {currentEp?.title ? `: ${currentEp.title}` : ''}
                </h1>
                <p className="text-xs text-accent-violet font-semibold mt-1">
                  {mainTitle}
                </p>
              </div>
              {currentEp?.aired && (
                <div className="flex items-center gap-1.5 text-xs text-text-muted flex-shrink-0">
                  <Calendar size={13} />
                  <span>Aired: {new Date(currentEp.aired).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {/* Synopsis / Summary */}
            <div className="space-y-2 text-sm text-text-secondary leading-relaxed">
              {anime.synopsis && (
                <p className="line-clamp-3 md:line-clamp-none">
                  {anime.synopsis}
                </p>
              )}
            </div>

            {/* Genres / Stats quick view */}
            <div className="flex flex-wrap gap-2 pt-2">
              {anime.type && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-surface-3 border border-border-subtle text-text-secondary rounded-lg">
                  {anime.type}
                </span>
              )}
              {anime.rating && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-surface-3 border border-border-subtle text-text-secondary rounded-lg">
                  {anime.rating}
                </span>
              )}
              {currentEp?.filler && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-lg">
                  Filler
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Area: Episode Selector Sidebar */}
        <aside className="w-full lg:sticky lg:top-[88px] z-20">
          <Suspense fallback={<div className="h-[520px] w-full rounded-2xl shimmer-loader" />}>
            <EpisodeSidebar
              episodes={episodes}
              animeId={animeId}
              currentEpisode={epNum}
              watchedEpisodes={watchedEpisodes}
              animeTitle={mainTitle}
              animeImage={anime.images.webp.large_image_url || ''}
              totalEpisodes={anime.episodes}
            />
          </Suspense>
        </aside>
      </div>
    </div>
  );
}
