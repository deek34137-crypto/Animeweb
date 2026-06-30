import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { connection } from 'next/server';
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
import AnimeDetailTabs from '@/components/AnimeDetailTabs';
import { FranchiseEngine } from '@/lib/franchise';
import { db } from '@/lib/db';
import { getEpisodeDisplay } from '@/lib/episode';
import WatchActions from '@/components/video/WatchActions';
import AddToListButton from '@/components/AddToListButton';
import type { AnimeData, CharacterRoster, EpisodeData, RecommendationItem } from '@/services/jikan';
import OfflineTracker from '@/components/ui/OfflineTracker';

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

// ─── Shared Server Data Fetcher ───────────────────────────────────────────────
async function fetchAnimeInfo(id: string): Promise<UnifiedAnimeDetail | null> {
  const isMalId = !id.startsWith('series-') && !id.startsWith('movies-');
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
          return {
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
        }
      }
    } catch (error) {
      console.error('Failed to load ToonPlay direct catalog info:', error);
    }
    return null;
  } else {
    const animeId = parseInt(id, 10);
    if (isNaN(animeId)) return null;
    return AnimeApi.getAnimeDetail(animeId).catch(() => null);
  }
}

async function loadDetailData(animeId: number) {
  const [characters, recommendations, episodes, staff, reviews] = await Promise.allSettled([
    AnimeApi.getAnimeCharacters(animeId),
    AnimeApi.getAnimeRecommendations(animeId),
    AnimeApi.getAnimeEpisodes(animeId),
    AnimeApi.getAnimeStaff(animeId),
    AnimeApi.getAnimeReviews(animeId),
  ]);

  return {
    characters: characters.status === 'fulfilled' ? characters.value : [],
    recommendations: recommendations.status === 'fulfilled' ? recommendations.value : [],
    episodes: episodes.status === 'fulfilled' ? episodes.value : [],
    staff: staff.status === 'fulfilled' ? staff.value : [],
    reviews: reviews.status === 'fulfilled' ? reviews.value : [],
  };
}

// ─── Dynamic Metadata Generation ──────────────────────────────────────────────
export async function generateMetadata({ params }: DetailPageProps): Promise<Metadata> {
  await connection(); // This page fetches from Jikan + DB cache — must opt into dynamic rendering
  const { id, locale } = await params;
  const anime = await fetchAnimeInfo(id);
  
  if (!anime) {
    return {
      title: 'Anime Not Found - AnimeWorld RJ',
      description: 'The requested anime details could not be loaded.',
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aniworld.rj';
  const mainTitle = anime.title_english || anime.title;
  const synopsis = anime.synopsis || 'Premium anime streaming and discovery platform';
  const imageUrl = anime.images.webp.large_image_url || anime.images.jpg.large_image_url || `${siteUrl}/app-icon.jpg`;

  return {
    title: `${mainTitle} - Watch Free Sub & Dub - AnimeWorld RJ`,
    description: synopsis.slice(0, 160),
    alternates: {
      canonical: `${siteUrl}/${locale}/anime/${id}`,
      languages: {
        en: `${siteUrl}/en/anime/${id}`,
        es: `${siteUrl}/es/anime/${id}`,
        ja: `${siteUrl}/ja/anime/${id}`,
      },
    },
    openGraph: {
      title: `${mainTitle} - Watch Free Sub & Dub - AnimeWorld RJ`,
      description: synopsis.slice(0, 160),
      url: `${siteUrl}/${locale}/anime/${id}`,
      siteName: 'AnimeWorld RJ',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: mainTitle,
        },
      ],
      type: 'video.tv_show',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${mainTitle} - Watch Free Sub & Dub - AnimeWorld RJ`,
      description: synopsis.slice(0, 160),
      images: [imageUrl],
    },
  };
}

// ─── Component Skeletons ─────────────────────────────────────────────────────
const UserActionsSkeleton = () => (
  <div className="flex flex-wrap gap-3 justify-center md:justify-start">
    <div className="h-11 w-32 shimmer-loader rounded-xl" />
    <div className="h-11 w-44 shimmer-loader rounded-xl" />
  </div>
);

const TabsSkeleton = () => (
  <div className="space-y-6">
    <div className="flex gap-4 border-b border-border-subtle pb-2">
      <div className="h-8 w-24 shimmer-loader rounded" />
      <div className="h-8 w-24 shimmer-loader rounded" />
      <div className="h-8 w-24 shimmer-loader rounded" />
    </div>
    <div className="h-64 w-full shimmer-loader rounded-2xl animate-pulse" />
  </div>
);

// ─── Main Details Page ────────────────────────────────────────────────────────
export default async function AnimeDetailPage({ params }: DetailPageProps) {
  await connection(); // Opt into dynamic rendering — this page uses live Jikan data
  const { id, locale } = await params;
  const anime = await fetchAnimeInfo(id);

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

  const isMalId = !id.startsWith('series-') && !id.startsWith('movies-');

  let characters: CharacterRoster[] = [];
  let recommendations: RecommendationItem[] = [];
  let episodes: EpisodeData[] = [];
  let staff: any[] = [];
  let reviews: any[] = [];

  if (isMalId) {
    const detailData = await loadDetailData(parseInt(id, 10));
    characters = detailData.characters;
    recommendations = detailData.recommendations;
    episodes = detailData.episodes;
    staff = detailData.staff;
    reviews = detailData.reviews;
  } else {
    // Custom series pagination/episodes resolve
    const seasonsList = (anime as any).seasonsList || [];
    let count = 1;
    seasonsList.forEach((season: any) => {
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

    if (episodes.length === 0 && anime.type === 'Movie') {
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

  const mainTitle = anime.title_english || anime.title;
  const jpTitle = anime.title_japanese;
  const score = anime.score;
  const votes = anime.scored_by;

  const genres = anime.genres || [];
  const studios = anime.studios || [];

  // ─── JSON-LD Structured Data ───────────────────────────────────────────────
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aniworld.rj';
  
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TVSeries',
    'name': mainTitle,
    'description': anime.synopsis || '',
    'image': anime.images.webp.large_image_url || anime.images.jpg.large_image_url || `${siteUrl}/app-icon.jpg`,
    'genre': genres.map((g) => g.name),
    ...(score && {
      'aggregateRating': {
        '@type': 'AggregateRating',
        'ratingValue': score,
        'bestRating': 10,
        'ratingCount': votes || 1,
      },
    }),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      {
        '@type': 'ListItem',
        'position': 1,
        'name': 'Home',
        'item': `${siteUrl}/${locale}`,
      },
      {
        '@type': 'ListItem',
        'position': 2,
        'name': 'Anime',
        'item': `${siteUrl}/${locale}/discover`,
      },
      {
        '@type': 'ListItem',
        'position': 3,
        'name': mainTitle,
        'item': `${siteUrl}/${locale}/anime/${id}`,
      },
    ],
  };

  const franchise = FranchiseEngine.build(anime.mal_id, anime.title_english || anime.title, (anime as any).relations || []);

  return (
    <div className="pb-20 -mt-6">
      {/* Offline PWA Tracker */}
      <OfflineTracker anime={{
        animeId: String(anime.mal_id || id),
        title: mainTitle,
        coverImage: anime.images.webp.large_image_url || anime.images.jpg.large_image_url || '',
        synopsis: anime.synopsis,
        genres: genres.map(g => g.name),
        episodeCount: anime.episodes,
        status: anime.status
      }} />

      {/* JSON-LD Schemas */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c'),
        }}
      />

      {/* ─── Cinematic Hero Header ─────────────────────────────────────────── */}
      <section className="relative w-full min-h-[520px] md:min-h-[580px] overflow-hidden">
        {/* Full-bleed background */}
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={anime.images.webp.large_image_url || anime.images.jpg.large_image_url || ''}
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
                src={anime.images.webp.large_image_url || anime.images.jpg.large_image_url || ''}
                alt={mainTitle}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* Info Column */}
          <div className="flex-grow pb-8 text-center md:text-left space-y-4 animate-fade-up">
            {/* Genres & Demographic & Source */}
            <div className="flex flex-wrap gap-1.5 justify-center md:justify-start items-center">
              {genres.slice(0, 4).map((g) => (
                <Badge key={g.mal_id} variant="ghost" size="xs">{g.name}</Badge>
              ))}
              {anime.demographics && anime.demographics.map((d: any) => (
                <Badge key={d.mal_id} variant="cyan" size="xs">{d.name}</Badge>
              ))}
              {anime.source && (
                <Badge variant="gold" size="xs">{anime.source}</Badge>
              )}
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
              {anime.favorites && (
                <div className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-1.5 text-rose-400">
                  <Heart size={14} fill="currentColor" className="text-rose-500 animate-pulse" />
                  <span className="font-black text-xs">{(anime.favorites / 1000).toFixed(0)}K</span>
                </div>
              )}
              {anime.type && (
                <Badge variant="violet" size="sm">{anime.type}</Badge>
              )}
              {anime.episodes && (
                <span className="flex items-center gap-1 text-text-secondary text-xs">
                  <Tv size={12} /> {getEpisodeDisplay({ title: mainTitle, episodes: anime.episodes, malId: id })}
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

            {/* Dynamic User Tracking & Action Buttons (Decoupled & Suspended) */}
            <Suspense fallback={<UserActionsSkeleton />}>
              <UserAnimeTrackingSection
                id={id}
                mainTitle={mainTitle}
                animeImage={anime.images.webp.large_image_url || anime.images.jpg.large_image_url || ''}
                episodes={anime.episodes}
                statusColors={STATUS_COLORS}
                anime={anime}
              />
            </Suspense>
          </div>
        </div>
      </section>

      {/* ─── Main Content (Decoupled & Suspended Tabs) ───────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <Suspense fallback={<TabsSkeleton />}>
          <UserTabsSection
            id={id}
            anime={anime}
            characters={characters}
            staff={staff}
            episodes={episodes}
            recommendations={recommendations}
            reviews={reviews}
            franchise={franchise}
          />
        </Suspense>
      </div>
    </div>
  );
}

// ─── Suspenseful Server Component: User Tracking Actions ─────────────────────
async function UserAnimeTrackingSection({
  id,
  mainTitle,
  animeImage,
  episodes,
  statusColors,
  anime
}: {
  id: string;
  mainTitle: string;
  animeImage: string;
  episodes: number | null;
  statusColors: Record<string, string>;
  anime: UnifiedAnimeDetail;
}) {
  const session = await auth();
  const userId = session?.user?.id;

  let latestProgress = null;
  let tracking = null;

  if (userId) {
    const [progresses, entry] = await Promise.all([
      db.watchProgress.findMany({
        where: {
          userId,
          animeId: String(id),
        },
      }),
      db.listEntry.findUnique({
        where: {
          userId_animeId: {
            userId,
            animeId: String(id),
          },
        },
      }),
    ]);

    if (entry) {
      tracking = {
        status: entry.status,
        score: entry.score,
        episodesWatched: entry.episodesWatched,
        rewatchCount: entry.rewatchCount,
        startedAt: entry.startedAt,
        completedAt: entry.completedAt,
        notes: entry.notes,
        isPrivate: entry.isPrivate,
        isFavorite: entry.isFavorite,
      };
    }

    if (progresses.length > 0) {
      latestProgress = progresses.reduce((latest, current) => {
        return new Date(current.lastWatchedAt) > new Date(latest.lastWatchedAt) ? current : latest;
      }, progresses[0]);
    }
  }

  return (
    <div className="space-y-4">
      {/* User Tracking Progress (if logged in and watching) */}
      {tracking && (
        <div className="flex items-center gap-3 p-3 glass-panel rounded-xl w-fit mx-auto md:mx-0">
          <span className={`text-xs font-bold capitalize ${statusColors[tracking.status] || 'text-text-secondary'}`}>
            {tracking.status}
          </span>
          {tracking.episodesWatched > 0 && episodes && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Ep {tracking.episodesWatched}/{episodes}</span>
              <Progress
                value={tracking.episodesWatched}
                max={episodes}
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
          animeImage={animeImage}
          episodes={episodes}
          isLoggedIn={!!userId}
          initialTracking={tracking}
        />
      </div>
    </div>
  );
}

// ─── Suspenseful Server Component: User Tab Details ─────────────────────────
async function UserTabsSection({
  id,
  anime,
  characters,
  staff,
  episodes,
  recommendations,
  reviews,
  franchise
}: {
  id: string;
  anime: UnifiedAnimeDetail;
  characters: any[];
  staff: any[];
  episodes: any[];
  recommendations: any[];
  reviews: any[];
  franchise: any;
}) {
  const session = await auth();
  const userId = session?.user?.id;

  let latestProgress = null;
  let progressList: any[] = [];
  let watchedEpisodes: number[] = [];
  const tracking = anime.userTracking;

  if (userId) {
    const [progresses, history] = await Promise.all([
      db.watchProgress.findMany({
        where: {
          userId,
          animeId: String(id),
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
    progressList = progresses;
    watchedEpisodes = history.map((h) => h.episode);
    if (progresses.length > 0) {
      latestProgress = progresses.reduce((latest, current) => {
        return new Date(current.lastWatchedAt) > new Date(latest.lastWatchedAt) ? current : latest;
      }, progresses[0]);
    }
  }

  return (
    <AnimeDetailTabs
      anime={anime}
      characters={characters}
      staff={staff}
      episodes={episodes}
      recommendations={recommendations}
      reviews={reviews}
      tracking={tracking ?? null}
      userId={userId}
      watchedEpisodes={watchedEpisodes}
      latestProgress={latestProgress}
      progressList={progressList}
      franchise={franchise}
    />
  );
}
