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

  // Fetch anime details first (we need the title for stream resolution)
  const anime = await AnimeApi.getAnimeDetail(malId, userId);

  if (!anime) {
    return (
      <div className="py-20 text-center space-y-4">
        <h1 className="text-2xl font-black text-text-primary">Anime Not Found</h1>
        <Link href="/" className="mt-4 inline-block text-accent-violet hover:underline">← Return Home</Link>
      </div>
    );
  }

  const mainTitle = anime.title_english || anime.title;

  // Now fetch stream info and episodes with the resolved title
  const [streamInfo, episodes, characters, recommendations] = await Promise.all([
    StreamingManager.getStreamInfo(animeId, epNum, mainTitle).catch(() => ({ sources: [], sub: [], dub: [], subtitles: [], providers: [], currentProvider: 'mock', isFallback: true, fallbackReason: 'Stream resolution threw an unhandled error.' } as any)),
    StreamingManager.getEpisodes(animeId, mainTitle).catch(() => []),
    AnimeApi.getAnimeCharacters(malId).catch(() => []),
    AnimeApi.getAnimeRecommendations(malId).catch(() => []),
  ]);

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
              hindiSources={streamInfo.hindi}
              subtitles={streamInfo.subtitles}
              animeTitle={mainTitle}
              episodeNumber={epNum}
              totalEpisodes={episodes.length}
              initialPosition={initialPosition}
              providers={streamInfo.providers}
              currentProvider={streamInfo.currentProvider}
              isFallback={streamInfo.isFallback}
              fallbackReason={streamInfo.fallbackReason}
              matchedTitle={streamInfo.matchedTitle}
              matchedSlug={streamInfo.matchedSlug}
              searchCount={streamInfo.searchCount}
              episodeCountFound={streamInfo.episodeCountFound}
              providerSlug={streamInfo.providerSlug}
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
            {(() => {
              const seasonsList = [
                {
                  malId: malId,
                  name: mainTitle,
                  relation: 'Current',
                  isCurrent: true,
                }
              ];

              if (anime.relations) {
                for (const rel of anime.relations) {
                  if (['Prequel', 'Sequel', 'Parent story', 'Alternative version', 'Full story', 'Alternative setting'].includes(rel.relation)) {
                    for (const entry of rel.entry) {
                      if (entry.type === 'anime' && entry.mal_id) {
                        if (!seasonsList.some((s) => s.malId === entry.mal_id)) {
                          seasonsList.push({
                            malId: entry.mal_id,
                            name: entry.name,
                            relation: rel.relation,
                            isCurrent: false,
                          });
                        }
                      }
                    }
                  }
                }
              }

              return (
                <EpisodeSidebar
                  episodes={episodes}
                  animeId={animeId}
                  currentEpisode={epNum}
                  watchedEpisodes={watchedEpisodes}
                  animeTitle={mainTitle}
                  animeImage={anime.images.webp.large_image_url || ''}
                  totalEpisodes={anime.episodes}
                  seasons={seasonsList}
                />
              );
            })()}
          </Suspense>
        </aside>
      </div>

      {/* Below Player: Rich Content */}
      <div className="space-y-8 mt-2">

        {/* Synopsis */}
        {anime.synopsis && (
          <section className="glass-panel border border-border-default rounded-2xl p-6">
            <h2 className="text-sm font-black text-text-primary uppercase tracking-widest font-display mb-3">Synopsis</h2>
            <p className="text-sm text-text-secondary leading-relaxed">{anime.synopsis}</p>
          </section>
        )}

        {/* Characters */}
        {characters.length > 0 && (
          <section className="glass-panel border border-border-default rounded-2xl p-6">
            <h2 className="text-sm font-black text-text-primary uppercase tracking-widest font-display mb-4">Characters</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {characters.slice(0, 8).map((c: any) => (
                <div key={c.character.mal_id} className="flex items-center gap-3 p-2 rounded-xl bg-surface-2/50 border border-border-subtle">
                  <img
                    src={c.character.images?.webp?.image_url || c.character.images?.jpg?.image_url}
                    alt={c.character.name}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text-primary truncate">{c.character.name}</p>
                    <p className="text-[10px] text-text-muted truncate">{c.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <section className="glass-panel border border-border-default rounded-2xl p-6">
            <h2 className="text-sm font-black text-text-primary uppercase tracking-widest font-display mb-4">Recommended</h2>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {recommendations.slice(0, 10).map((r: any) => (
                <Link
                  key={r.entry.mal_id}
                  href={`/anime/${r.entry.mal_id}` as '/'}
                  className="flex-shrink-0 w-32 group"
                >
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-border-subtle group-hover:border-accent-violet transition-colors">
                    <img
                      src={r.entry.images?.webp?.image_url || r.entry.images?.jpg?.image_url}
                      alt={r.entry.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                  </div>
                  <p className="text-[11px] font-bold text-text-secondary group-hover:text-accent-violet mt-1.5 truncate transition-colors">{r.entry.title}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Related Anime / Seasons */}
        {anime.relations && anime.relations.length > 0 && (
          <section className="glass-panel border border-border-default rounded-2xl p-6">
            <h2 className="text-sm font-black text-text-primary uppercase tracking-widest font-display mb-4">Related</h2>
            <div className="space-y-2">
              {anime.relations.slice(0, 6).map((rel: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-surface-2/50 border border-border-subtle">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text-primary truncate">{rel.entry?.[0]?.name || 'Unknown'}</p>
                    <p className="text-[10px] text-text-muted">{rel.relation}</p>
                  </div>
                  {rel.entry?.[0]?.mal_id && rel.entry?.[0]?.type === 'anime' && (
                    <Link
                      href={`/anime/${rel.entry[0].mal_id}` as '/'}
                      className="text-[10px] font-bold text-accent-violet hover:underline flex-shrink-0 ml-2"
                    >
                      View →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
