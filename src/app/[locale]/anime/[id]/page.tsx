import React, { Suspense } from 'react';
import { AnimeApi, UnifiedAnimeDetail } from '@/lib/api';
import { auth } from '@/auth';
import {
  Star, Clock, Tv, Users, Heart, Share2, Play, MessageSquare,
  ArrowRight, Calendar, Plus, BookMarked, CheckCircle2, Pause,
  XCircle, RefreshCw, ChevronRight
} from 'lucide-react';
import { Link } from '@/navigation';
import Badge from '@/components/ui/Badge';
import Progress from '@/components/ui/Progress';
import { SectionSkeleton } from '@/components/ui/Skeleton';
import AnimeDetailTabs from '@/components/AnimeDetailTabs';
import { db } from '@/lib/db';
import WatchActions from '@/components/video/WatchActions';
import AddToListButton from '@/components/AddToListButton';
import type { AnimeData, CharacterRoster, EpisodeData, RecommendationItem } from '@/services/jikan';

export const revalidate = 1800;

interface DetailPageProps {
  params: Promise<{ id: string; locale: string }>;
}

const STATUS_COLORS: Record<string, string> = {
  watching: 'text-status-watching',
  completed: 'text-status-completed',
  dropped: 'text-status-dropped',
  paused: 'text-status-paused',
  planning: 'text-status-planning',
  rewatching: 'text-status-rewatching',
};

// ─── Server Data Loader ───────────────────────────────────────────────────────
async function loadDetailData(animeId: number, userId?: string) {
  const [animeDetail, characters, recommendations, episodes] = await Promise.allSettled([
    AnimeApi.getAnimeDetail(animeId, userId),
    AnimeApi.getAnimeCharacters(animeId),
    AnimeApi.getAnimeRecommendations(animeId),
    AnimeApi.getAnimeEpisodes(animeId),
  ]);

  return {
    anime: animeDetail.status === 'fulfilled' ? animeDetail.value : null,
    characters: characters.status === 'fulfilled' ? characters.value : [],
    recommendations: recommendations.status === 'fulfilled' ? recommendations.value : [],
    episodes: episodes.status === 'fulfilled' ? episodes.value : [],
  };
}

export default async function AnimeDetailPage({ params }: DetailPageProps) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  let latestProgress = null;
  let watchedEpisodes: number[] = [];
  if (userId) {
    const [progress, history] = await Promise.all([
      db.watchProgress.findFirst({
        where: {
          userId,
          animeId: String(id),
        },
        orderBy: {
          lastWatchedAt: 'desc',
        },
      }),
      db.watchHistory.findMany({
        where: {
          userId,
          animeId: String(id),
        },
        select: {
          episode: true,
        },
      }),
    ]);
    latestProgress = progress;
    watchedEpisodes = history.map((h) => h.episode);
  }

  const isMalId = !id.startsWith('series-') && !id.startsWith('movies-');

  let anime: UnifiedAnimeDetail | null = null;
  let characters: CharacterRoster[] = [];
  let recommendations: RecommendationItem[] = [];
  let episodes: EpisodeData[] = [];

  if (!isMalId) {
    try {
      const TOONPLAY_HEADERS = {
        'Origin': 'https://toonplay.in',
        'Referer': 'https://toonplay.in/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      };
      const res = await fetch(`https://animesalt.streamindia.co.in/api/info?id=${id}`, {
        headers: TOONPLAY_HEADERS,
        next: { revalidate: 1800 }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.anime) {
          const tpAnime = data.anime;
          anime = {
            mal_id: id as any,
            title: tpAnime.title,
            title_english: tpAnime.title,
            title_japanese: tpAnime.title,
            synopsis: tpAnime.description || 'No description available.',
            images: {
              jpg: {
                image_url: tpAnime.image || '/app-icon.jpg',
                small_image_url: tpAnime.image || '/app-icon.jpg',
                large_image_url: tpAnime.image || '/app-icon.jpg',
              },
              webp: {
                image_url: tpAnime.image || '/app-icon.jpg',
                small_image_url: tpAnime.image || '/app-icon.jpg',
                large_image_url: tpAnime.image || '/app-icon.jpg',
              }
            },
            type: tpAnime.type === 'movie' ? 'Movie' : 'TV',
            episodes: tpAnime.episodesCount || null,
            score: 8.0,
            scored_by: 100,
            status: 'Finished Airing',
            genres: [],
            year: tpAnime.year || null,
            studios: [],
            producers: [],
            userTracking: null,
          } as unknown as UnifiedAnimeDetail;

          if (userId) {
            const entry = await db.listEntry.findUnique({
              where: {
                userId_animeId: {
                  userId,
                  animeId: id,
                },
              },
            });
            if (entry) {
              anime.userTracking = {
                status: entry.status,
                score: entry.score,
                episodesWatched: entry.episodesWatched,
                rewatchCount: entry.rewatchCount,
                startedAt: entry.startedAt,
                completedAt: entry.completedAt,
                notes: entry.notes,
                isPrivate: entry.isPrivate,
              };
            }
          }

          const seasons = tpAnime.seasonsList || [];
          let count = 1;
          seasons.forEach((season: any) => {
            if (season.episodes && Array.isArray(season.episodes)) {
              season.episodes.forEach((ep: any) => {
                episodes.push({
                  mal_id: count,
                  url: '',
                  title: ep.title || `Episode ${ep.number}`,
                  title_japanese: null,
                  title_romanji: null,
                  aired: null,
                  score: null,
                  filler: false,
                  recap: false,
                  forum_url: null,
                });
                count++;
              });
            }
          });

          if (episodes.length === 0 && tpAnime.type === 'movie') {
            episodes.push({
              mal_id: 1,
              url: '',
              title: 'Full Feature Film',
              title_japanese: null,
              title_romanji: null,
              aired: null,
              score: null,
              filler: false,
              recap: false,
              forum_url: null,
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to load ToonPlay direct catalog info:', error);
    }
  } else {
    const animeId = parseInt(id, 10);
    if (isNaN(animeId)) {
      return (
        <div className="py-20 text-center">
          <h1 className="text-2xl font-black text-text-primary">Invalid Anime ID</h1>
          <Link href="/" className="mt-4 inline-block text-accent-violet hover:underline">← Back to Home</Link>
        </div>
      );
    }

    const data = await loadDetailData(animeId, userId);
    anime = data.anime;
    characters = data.characters;
    recommendations = data.recommendations;
    episodes = data.episodes;
  }

  if (!anime) {
    return (
      <div className="py-20 text-center space-y-4 max-w-md mx-auto">
        <div className="text-5xl">⚠️</div>
        <h1 className="text-2xl font-black text-text-primary">Anime Not Found</h1>
        <p className="text-text-secondary text-sm">
          The Jikan API may be rate-limited or the requested custom catalog item does not exist.
        </p>
        <Link href="/" className="inline-flex items-center gap-2 mt-2 px-6 py-3 rounded-xl bg-accent-violet text-white font-semibold text-sm hover:bg-[#6b4ae6] transition-colors">
          ← Return Home
        </Link>
      </div>
    );
  }

  const mainTitle = anime.title_english || anime.title;
  const jpTitle = anime.title_japanese;
  const score = anime.score;
  const votes = anime.scored_by;
  const tracking = anime.userTracking;

  const genres = anime.genres || [];
  const studios = anime.studios || [];
  const producers = anime.producers || [];

  return (
    <div className="pb-20 -mt-6">
      {/* ─── Cinematic Hero Header ─────────────────────────────────────────── */}
      <section className="relative w-full min-h-[520px] md:min-h-[580px] overflow-hidden">
        {/* Full-bleed background */}
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={anime.images.webp.large_image_url || anime.images.jpg.large_image_url}
            alt={mainTitle}
            className="w-full h-full object-cover scale-[1.04]"
            referrerPolicy="no-referrer"
          />
          {/* Dark cinematic overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#05050A] via-[#05050A]/85 to-[#05050A]/50" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#05050A] via-transparent to-[#05050A]/40" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-0 flex flex-col md:flex-row items-center md:items-end gap-8">
          {/* Poster */}
          <div className="flex-shrink-0 mx-auto md:mx-0">
            <div className="w-44 md:w-52 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-border-default shadow-[0_20px_60px_rgba(0,0,0,0.6)] relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={anime.images.webp.large_image_url || anime.images.jpg.large_image_url}
                alt={mainTitle}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* Info Column */}
          <div className="flex-grow pb-8 text-center md:text-left space-y-4 animate-fade-up">
            {/* Genres */}
            <div className="flex flex-wrap gap-1.5 justify-center md:justify-start">
              {genres.slice(0, 4).map((g) => (
                <Badge key={g.mal_id} variant="ghost" size="xs">{g.name}</Badge>
              ))}
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight font-display">
              {mainTitle}
            </h1>
            {jpTitle && (
              <p className="text-sm font-medium text-text-muted">{jpTitle}</p>
            )}

            {/* Stats Row */}
            <div className="flex flex-wrap items-center gap-4 justify-center md:justify-start text-sm">
              {score && (
                <div className="flex items-center gap-1.5 bg-[rgba(255,184,0,0.12)] border border-[rgba(255,184,0,0.25)] rounded-xl px-3 py-1.5">
                  <Star size={14} fill="currentColor" className="text-accent-gold" />
                  <span className="font-black text-accent-gold">{score.toFixed(1)}</span>
                  {votes && <span className="text-text-muted text-xs">({(votes / 1000).toFixed(0)}K)</span>}
                </div>
              )}
              {anime.type && (
                <Badge variant="violet" size="sm">{anime.type}</Badge>
              )}
              {anime.episodes && (
                <span className="flex items-center gap-1 text-text-secondary text-xs">
                  <Tv size={12} /> {anime.episodes} Episodes
                </span>
              )}
              {anime.duration && (
                <span className="flex items-center gap-1 text-text-secondary text-xs">
                  <Clock size={12} /> {anime.duration}
                </span>
              )}
              {anime.status && (
                <Badge
                  variant={
                    anime.status === 'Currently Airing' ? 'cyan'
                    : anime.status === 'Not yet aired' ? 'gold'
                    : 'default'
                  }
                  size="sm"
                  dot
                >
                  {anime.status === 'Finished Airing' ? 'Finished'
                    : anime.status === 'Currently Airing' ? 'Airing'
                    : anime.status === 'Not yet aired' ? 'Upcoming'
                    : anime.status}
                </Badge>
              )}
            </div>

            {/* User Tracking Progress (if logged in and watching) */}
            {tracking && (
              <div className="flex items-center gap-3 p-3 glass-panel rounded-xl w-fit mx-auto md:mx-0">
                <span className={`text-xs font-bold capitalize ${STATUS_COLORS[tracking.status] || 'text-text-secondary'}`}>
                  {tracking.status}
                </span>
                {tracking.episodesWatched > 0 && anime.episodes && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">Ep {tracking.episodesWatched}/{anime.episodes}</span>
                    <Progress
                      value={tracking.episodesWatched}
                      max={anime.episodes}
                      variant="violet"
                      size="xs"
                      className="w-24"
                    />
                  </div>
                )}
                {tracking.score && (
                  <span className="text-xs text-accent-gold font-semibold flex items-center gap-1">
                    <Star size={11} fill="currentColor" /> {tracking.score}/10
                  </span>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <WatchActions animeId={String(id)} latestProgress={latestProgress} />
              <AddToListButton
                animeId={String(id)}
                animeTitle={mainTitle}
                animeImage={anime.images.webp.large_image_url || ''}
                episodes={anime.episodes}
                isLoggedIn={!!userId}
                initialTracking={tracking}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Main Content ───────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">

          {/* Left column: Tabbed content */}
          <div>
            <Suspense fallback={<div className="h-10 shimmer-loader rounded-xl" />}>
              <AnimeDetailTabs
                anime={anime}
                characters={characters}
                episodes={episodes}
                recommendations={recommendations}
                tracking={tracking ?? null}
                userId={userId}
                watchedEpisodes={watchedEpisodes}
              />
            </Suspense>
          </div>

          {/* Right sidebar */}
          <aside className="space-y-5">

            {/* Score Card */}
            {score && (
              <div className="glass-panel border border-border-default rounded-2xl p-5 text-center space-y-2">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">MAL Score</p>
                <div className="flex items-center justify-center gap-2">
                  <Star size={28} fill="currentColor" className="text-accent-gold" />
                  <span className="text-5xl font-black text-text-primary">{score.toFixed(1)}</span>
                  <span className="text-lg text-text-muted">/10</span>
                </div>
                {votes && (
                  <p className="text-[10px] text-text-muted">
                    {votes.toLocaleString()} votes
                  </p>
                )}
              </div>
            )}

            {/* Info table */}
            <div className="glass-panel border border-border-default rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-black text-text-primary uppercase tracking-widest">Details</h3>
              <dl className="space-y-2.5 text-xs">
                {[
                  { label: 'Type', value: anime.type },
                  { label: 'Episodes', value: anime.episodes },
                  { label: 'Status', value: anime.status },
                  { label: 'Aired', value: anime.aired?.string },
                  { label: 'Season', value: anime.season && anime.year ? `${anime.season} ${anime.year}` : null },
                  { label: 'Duration', value: anime.duration },
                  { label: 'Source', value: anime.source },
                  { label: 'Rating', value: anime.rating },
                  { label: 'Rank', value: anime.rank ? `#${anime.rank}` : null },
                  { label: 'Popularity', value: anime.popularity ? `#${anime.popularity}` : null },
                ].filter((r) => r.value).map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-start gap-2">
                    <dt className="text-text-muted flex-shrink-0">{label}</dt>
                    <dd className="font-medium text-text-secondary text-right capitalize">{String(value)}</dd>
                  </div>
                ))}
              </dl>

              {/* Studios */}
              {studios.length > 0 && (
                <div className="pt-2 border-t border-border-subtle">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5">Studios</p>
                  <div className="flex flex-wrap gap-1">
                    {studios.map((s) => (
                      <Link
                        key={s.mal_id}
                        href={`/search?q=${encodeURIComponent(s.name)}` as '/'}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-surface-3 border border-border-subtle text-text-secondary hover:text-accent-violet hover:border-accent-violet/40 transition-colors"
                      >
                        {s.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Producers */}
              {producers.length > 0 && (
                <div className="pt-2 border-t border-border-subtle">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5">Producers</p>
                  <div className="flex flex-wrap gap-1">
                    {producers.slice(0, 4).map((p) => (
                      <span
                        key={p.mal_id}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-surface-3 border border-border-subtle text-text-muted"
                      >
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Related (from relations) */}
            {anime.relations && anime.relations.length > 0 && (
              <div className="glass-panel border border-border-default rounded-2xl p-5 space-y-3">
                <h3 className="text-xs font-black text-text-primary uppercase tracking-widest">Related</h3>
                <div className="space-y-2">
                  {anime.relations.slice(0, 4).map((r, i) => {
                    const entry = r.entry[0];
                    if (!entry) return null;
                    return (
                      <Link
                        key={i}
                        href={`/anime/${entry.mal_id}` as '/'}
                        className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-surface-2 transition-colors group"
                      >
                        <div className="w-8 h-10 bg-surface-3 rounded-lg flex-shrink-0 flex items-center justify-center text-[8px] font-black text-accent-violet border border-border-subtle">
                          ANI
                        </div>
                        <div className="min-w-0 flex-grow">
                          <p className="text-xs font-semibold text-text-primary truncate group-hover:text-accent-violet transition-colors">{entry.name}</p>
                          <p className="text-[10px] text-text-muted capitalize">{r.relation}</p>
                        </div>
                        <ChevronRight size={12} className="text-text-disabled flex-shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Share */}
            <div className="glass-panel border border-border-default rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-black text-text-primary uppercase tracking-widest flex items-center gap-1.5">
                <Share2 size={12} /> Share
              </h3>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                {[
                  { label: 'Twitter', color: 'hover:bg-sky-500/20 hover:border-sky-500/40 hover:text-sky-400', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out ${mainTitle} on AnimeWorld!`)}&url=${encodeURIComponent(`https://animeworldrj.vercel.app/anime/${id}`)}` },
                  { label: 'Reddit', color: 'hover:bg-orange-500/20 hover:border-orange-500/40 hover:text-orange-400', href: `https://reddit.com/submit?url=${encodeURIComponent(`https://animeworldrj.vercel.app/anime/${id}`)}&title=${encodeURIComponent(mainTitle)}` },
                ].map(({ label, color, href }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center py-2 rounded-xl bg-surface-2 border border-border-subtle text-text-muted transition-all ${color}`}
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>

            {/* Community link */}
            <Link
              href="/community"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-accent-violet/10 border border-accent-violet/20 text-accent-violet font-semibold text-sm hover:bg-accent-violet/20 transition-all"
            >
              <MessageSquare size={16} /> Discuss in Community
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}


