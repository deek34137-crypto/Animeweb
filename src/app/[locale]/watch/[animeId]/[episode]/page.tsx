import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { auth } from '@/auth';
import { AnimeApi } from '@/lib/api';
import { db } from '@/lib/db';
import { StreamingManager } from '@/lib/streaming';
import { ArrowLeft, Play, Calendar, Film, Bookmark } from 'lucide-react';
import { Link } from '@/navigation';
import EpisodeSidebar from './EpisodeSidebar';
import WatchPageClient from './WatchPageClient';
import EpisodeCommentsSection from './EpisodeCommentsSection';

interface WatchPageProps {
  params: Promise<{ animeId: string; episode: string; locale: string }>;
  searchParams?: Promise<{ start?: string }>;
}

// Helper fetch to reuse in page and metadata
async function fetchWatchAnimeInfo(animeId: string) {
  const isMalId = !animeId.startsWith('series-') && !animeId.startsWith('movies-');
  if (!isMalId) {
    try {
      const TOONPLAY_HEADERS = {
        'Origin': 'https://toonplay.in',
        'Referer': 'https://toonplay.in/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      };
      const res = await fetch(`https://animesalt.streamindia.co.in/api/info?id=${animeId}`, {
        headers: TOONPLAY_HEADERS,
        next: { revalidate: 1800 }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.anime) {
          const tpAnime = data.anime;
          return {
            mal_id: animeId as any,
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
          };
        }
      }
    } catch (error) {
      console.error('Failed to load ToonPlay details in watch helper:', error);
    }
    return null;
  } else {
    return AnimeApi.getAnimeDetail(parseInt(animeId, 10)).catch(() => null);
  }
}

export async function generateMetadata({ params }: WatchPageProps): Promise<Metadata> {
  const { animeId, episode, locale } = await params;
  const anime = await fetchWatchAnimeInfo(animeId);
  const mainTitle = anime ? (anime.title_english || anime.title) : 'Anime';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aniworld.rj';

  return {
    title: `Watch ${mainTitle} Episode ${episode} Sub & Dub - AnimeWorld RJ`,
    description: `Stream ${mainTitle} Episode ${episode} in High Definition with subtitles and English dubbing.`,
    robots: {
      index: false,
      follow: true,
    },
    alternates: {
      canonical: `${siteUrl}/${locale}/watch/${animeId}/${episode}`,
      languages: {
        en: `${siteUrl}/en/watch/${animeId}/${episode}`,
        es: `${siteUrl}/es/watch/${animeId}/${episode}`,
        ja: `${siteUrl}/ja/watch/${animeId}/${episode}`,
      },
    },
  };
}

export default async function WatchPage({ params, searchParams }: WatchPageProps) {
  const { animeId, episode, locale } = await params;
  const sParams = searchParams ? await searchParams : {};
  const startParam = sParams.start;

  const epNum = parseInt(episode, 10);
  const isMalId = !animeId.startsWith('series-') && !animeId.startsWith('movies-');

  // Verify parameters
  if (isNaN(epNum) || (isMalId && isNaN(parseInt(animeId, 10)))) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-black text-text-primary">Invalid Route Parameters</h1>
        <Link href="/" className="mt-4 inline-block text-accent-violet hover:underline">← Return Home</Link>
      </div>
    );
  }

  const session = await auth();
  const userId = session?.user?.id;

  const anime = await fetchWatchAnimeInfo(animeId) as any;

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
  let episodes: any[] = [];
  if (isMalId) {
    try {
      episodes = await AnimeApi.getAnimeEpisodes(parseInt(animeId, 10));
    } catch (e) {
      console.error('Failed to fetch Jikan episodes on watch page, falling back to provider:', e);
      episodes = await StreamingManager.getEpisodes(animeId, mainTitle).catch(() => []);
    }
  } else {
    episodes = await StreamingManager.getEpisodes(animeId, mainTitle).catch(() => []);
  }

  const [streamInfo, characters, recommendations] = await Promise.all([
    StreamingManager.getStreamInfo(animeId, epNum, mainTitle).catch(() => ({ sources: [], sub: [], dub: [], subtitles: [], providers: [], currentProvider: 'mock', isFallback: true, fallbackReason: 'Stream resolution threw an unhandled error.' } as any)),
    isMalId ? AnimeApi.getAnimeCharacters(parseInt(animeId, 10)).catch(() => []) : Promise.resolve([]),
    isMalId ? AnimeApi.getAnimeRecommendations(parseInt(animeId, 10)).catch(() => []) : Promise.resolve([]),
  ]);

  // Fetch last saved position if authenticated
  let initialPosition = 0;
  let watchedEpisodes: number[] = [];

  if (userId) {
    if (startParam !== 'beginning') {
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aniworld.rj';
  
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TVEpisode',
    'name': currentEp?.title || `Episode ${epNum}`,
    'episodeNumber': epNum,
    'partOfTVSeries': {
      '@type': 'TVSeries',
      'name': mainTitle,
      'url': `${siteUrl}/${locale}/anime/${animeId}`,
    },
    'description': anime.synopsis || '',
    'image': anime.images?.webp?.large_image_url || anime.images?.jpg?.large_image_url || `${siteUrl}/app-icon.jpg`,
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
        'item': `${siteUrl}/${locale}/anime/${animeId}`,
      },
      {
        '@type': 'ListItem',
        'position': 4,
        'name': `Episode ${epNum}`,
        'item': `${siteUrl}/${locale}/watch/${animeId}/${episode}`,
      }
    ]
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-up">
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
      <WatchPageClient
        animeId={animeId}
        animeImage={anime.images.webp.large_image_url || ''}
        sources={streamInfo.sources}
        subSources={streamInfo.sub}
        dubSources={streamInfo.dub}
        hindiSources={streamInfo.hindi}
        tamilSources={streamInfo.tamil}
        teluguSources={streamInfo.telugu}
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
        nextEpisodeTitle={episodes[epNum]?.title || undefined}
        nextEpisodeThumbnail={anime.images.webp.large_image_url || ''}
        sidebar={
          <Suspense fallback={<div className="h-[520px] w-full rounded-2xl shimmer-loader" />}>
            {(() => {
              const seasonsList = [
                {
                  malId: isMalId ? parseInt(animeId, 10) : animeId as any,
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
        }
      />

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

        {/* Episode Comments Reviews Panel */}
        <EpisodeCommentsSection animeId={String(animeId)} episode={epNum} />
      </div>
    </div>
  );
}
