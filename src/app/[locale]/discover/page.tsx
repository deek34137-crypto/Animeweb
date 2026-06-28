import React from 'react';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { JikanAPI } from '@/services/jikan';
import AnimeCarousel from '@/components/dashboard/AnimeCarousel';
import AnimeCard from '@/components/AnimeCard';
import DiscoverActions from '@/components/discover/DiscoverActions';
import { isHiddenGem } from '@/lib/discover/hiddenGems';
import { Link } from '@/navigation';
import { Compass, Sparkles, Clock, Flame, Star, Play } from 'lucide-react';
import RecommendationsOfflineCacher from '@/components/discover/RecommendationsOfflineCacher';

export default async function DiscoverPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  // 1. Fetch user personalized recommendations (if logged in)
  let recommendations: any[] = [];
  const seedTitleMap = new Map<string, string>();

  if (userId) {
    const recRows = await db.userRecommendation.findMany({
      where: { userId },
      include: {
        anime: {
          include: {
            genres: { include: { genre: true } },
            studios: { include: { studio: true } },
          },
        },
      },
      orderBy: { score: 'desc' },
      take: 12,
    });

    if (recRows.length > 0) {
      // Resolve seed titles on the fly
      const seedIds = new Set<string>();
      recRows.forEach((r) => {
        const reasons = (r.reasonData as any[]) || [];
        reasons.forEach((reason) => {
          if (reason.seedAnimeId) seedIds.add(reason.seedAnimeId);
        });
      });

      const seedAnime = await db.animeCache.findMany({
        where: { animeId: { in: Array.from(seedIds) } },
      });
      seedAnime.forEach((a) => seedTitleMap.set(a.animeId, a.title));

      recommendations = recRows.map((r) => {
        const reasons = ((r.reasonData as any[]) || []).map((reason) => {
          if (reason.seedAnimeId) {
            return {
              ...reason,
              seedTitle: seedTitleMap.get(reason.seedAnimeId) || 'Similar Anime',
            };
          }
          return reason;
        });

        // Map to Jikan format for AnimeCard
        return {
          mal_id: parseInt(r.animeId, 10),
          title: r.anime.title,
          images: {
            jpg: {
              large_image_url: r.anime.poster,
              image_url: r.anime.poster,
            },
          },
          score: r.anime.score,
          type: r.anime.type,
          episodes: r.anime.episodes,
          matchScore: r.score,
          reasons,
        };
      });
    }
  }

  // 2. Fetch Discovery Hub Feeds
  let trending: any[] = [];
  let topAiring: any[] = [];
  let hiddenGems: any[] = [];

  try {
    const [trendRes, airRes, ratedRes] = await Promise.all([
      JikanAPI.getTrendingAnime(1).catch(() => ({ data: [] })),
      JikanAPI.getTopAiringAnime(1).catch(() => ({ data: [] })),
      JikanAPI.getTopRatedAnime(1).catch(() => ({ data: [] })),
    ]);

    trending = (trendRes.data || []).slice(0, 12);
    topAiring = (airRes.data || []).slice(0, 12);

    // Apply Hidden Gem filter
    hiddenGems = (ratedRes.data || []).filter(isHiddenGem).slice(0, 12);

    // If hidden gems are too few, fetch second page of rated anime to filter
    if (hiddenGems.length < 4) {
      const ratedRes2 = await JikanAPI.getTopRatedAnime(2).catch(() => ({ data: [] }));
      const extraGems = (ratedRes2.data || []).filter(isHiddenGem);
      hiddenGems = [...hiddenGems, ...extraGems].slice(0, 12);
    }
  } catch (error) {
    console.error('Discover page SSR fetch error:', error);
  }

  const displayedIds = new Set<number>();
  recommendations.forEach(r => displayedIds.add(r.mal_id));

  return (
    <div className="space-y-10 py-6 px-4 md:px-8 max-w-7xl mx-auto text-text-primary">
      <RecommendationsOfflineCacher recommendations={recommendations} />
      
      {/* Featured Header Banner */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-purple-950/60 to-black/80 border border-purple-900/40 p-6 md:p-10 flex flex-col md:flex-row items-center gap-8 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,#7c3aed,transparent_60%)] opacity-20 pointer-events-none" />
        
        <div className="flex-1 space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/50 border border-purple-800/40 text-xs font-semibold text-accent-sakura uppercase tracking-wider">
            <Compass size={12} />
            Discover Engine v1.1
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-text-primary to-purple-400">
            Find Your Next Obsession
          </h1>
          <p className="text-sm md:text-base text-text-secondary max-w-xl">
            Explore advanced multi-select filter parameters, track localized episode release timers, and check AI-driven recommendations personalized to your library profile.
          </p>

          <DiscoverActions userId={userId} hasRecommendations={recommendations.length > 0} />
        </div>

        {/* Small quick navigation box */}
        <div className="flex flex-wrap md:flex-col gap-3 w-full md:w-auto relative z-10">
          <Link
            href="/calendar"
            className="flex-1 md:w-48 flex items-center justify-between p-3.5 rounded-xl bg-bg-secondary hover:bg-bg-elevated border border-border-subtle hover:border-purple-800/60 transition-all duration-200 group"
          >
            <div className="flex items-center gap-3">
              <Clock size={16} className="text-accent-sakura" />
              <span className="font-semibold text-sm">Airing Calendar</span>
            </div>
            <span className="text-text-muted group-hover:translate-x-1 transition-transform duration-200">→</span>
          </Link>
          <Link
            href="/search"
            className="flex-1 md:w-48 flex items-center justify-between p-3.5 rounded-xl bg-bg-secondary hover:bg-bg-elevated border border-border-subtle hover:border-purple-800/60 transition-all duration-200 group"
          >
            <div className="flex items-center gap-3">
              <Compass size={16} className="text-accent-sakura" />
              <span className="font-semibold text-sm">Advanced Browse</span>
            </div>
            <span className="text-text-muted group-hover:translate-x-1 transition-transform duration-200">→</span>
          </Link>
        </div>
      </div>

      {/* ─── PERSONALIZED RECOMMENDATIONS RAIL ─── */}
      {userId && (
        <div className="space-y-4">
          <SectionHeader
            title="Recommended For You"
            icon={<Sparkles size={16} className="text-accent-sakura animate-pulse" />}
            viewAllHref={recommendations.length > 0 ? undefined : '/search'}
          />

          {recommendations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.slice(0, 4).map((rec, index) => (
                <div
                  key={`${rec.mal_id}-${index}`}
                  className="flex gap-4 p-4 rounded-xl bg-bg-secondary/40 border border-border-subtle hover:border-purple-900/40 backdrop-blur-sm transition-all duration-200 group relative overflow-hidden"
                >
                  <div className="w-24 md:w-28 flex-shrink-0">
                    <AnimeCard anime={rec} variant="standard" />
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-accent-sakura px-2 py-0.5 rounded-md bg-purple-950/40 border border-purple-900/30">
                          {rec.matchScore}% Match
                        </span>
                        {rec.type && (
                          <span className="text-xs text-text-muted">{rec.type}</span>
                        )}
                      </div>
                      
                      <Link href={`/anime/${rec.mal_id}`} className="block">
                        <h3 className="font-bold text-sm md:text-base text-text-primary hover:text-accent-sakura transition-colors line-clamp-1">
                          {rec.title}
                        </h3>
                      </Link>
                      
                      <div className="text-xs text-text-muted flex flex-wrap gap-1">
                        {rec.genres.slice(0, 3).map((g: any) => (
                          <span key={g.genre.name} className="px-1.5 py-0.5 rounded bg-bg-secondary">
                            {g.genre.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Explanations listing */}
                    <div className="space-y-1.5 border-t border-border-subtle pt-2 mt-2">
                      <div className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
                        Why Recommended:
                      </div>
                      <div className="space-y-1">
                        {rec.reasons.slice(0, 2).map((reason: any, ri: number) => (
                          <div key={ri} className="flex items-center gap-1.5 text-xs text-text-secondary">
                            <span className="text-accent-sakura">✔</span>
                            <span className="line-clamp-1">
                              {reason.type === 'SIMILAR_TO' && (
                                <>Because you rated <span className="font-medium text-text-primary">{reason.seedTitle}</span></>
                              )}
                              {reason.type === 'SAME_GENRE' && (
                                <>Matches favorite genre: <span className="font-medium text-text-primary">{reason.genreName}</span></>
                              )}
                              {reason.type === 'SAME_STUDIO' && (
                                <>Produced by favorite studio: <span className="font-medium text-text-primary">{reason.studioName}</span></>
                              )}
                              {reason.type === 'COMMUNITY_RECOMMENDED' && (
                                <>Highly recommended by the community</>
                              )}
                              {reason.type === 'COLD_START' && (
                                <>Popular choice for new anime fans</>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center rounded-xl bg-bg-secondary border border-border-subtle max-w-lg mx-auto">
              <Sparkles size={24} className="mx-auto text-text-muted mb-3" />
              <h4 className="font-bold text-sm mb-1 text-text-primary">No Personalized Recommendations Yet</h4>
              <p className="text-xs text-text-muted mb-4">
                We need at least 2 completed or rated anime in your library to start computing customized recommendations.
              </p>
              <Link
                href="/search"
                className="inline-flex items-center px-4 py-2 rounded-full bg-bg-elevated border border-border-subtle hover:bg-bg-secondary text-xs font-semibold text-text-primary transition-all cursor-pointer"
              >
                Browse Anime & Add to List
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ─── DISCOVERY CHANNELS CAROUSELS ─── */}
      <div className="space-y-10">
        {/* Trending Now */}
        {trending.length > 0 && (
          <AnimeCarousel title="Trending Now" icon={<Flame size={16} className="text-accent-sakura" />} viewAllHref="/search?sort=popularity">
            {trending
              .filter((anime: any) => {
                if (displayedIds.has(anime.mal_id)) return false;
                displayedIds.add(anime.mal_id);
                return true;
              })
              .map((anime: any, index: number) => (
              <div key={`${anime.mal_id}-${index}`} className="snap-start">
                <div className="w-36 sm:w-40 md:w-44">
                  <AnimeCard anime={anime} rank={index + 1} />
                </div>
              </div>
            ))}
          </AnimeCarousel>
        )}

        {/* Top Airing */}
        {topAiring.length > 0 && (
          <AnimeCarousel title="Top Airing Schedule" icon={<Play size={16} className="text-accent-sakura" />} viewAllHref="/search?status=airing">
            {topAiring
              .filter((anime: any) => {
                if (displayedIds.has(anime.mal_id)) return false;
                displayedIds.add(anime.mal_id);
                return true;
              })
              .map((anime: any, index: number) => (
              <div key={`${anime.mal_id}-${index}`} className="snap-start">
                <div className="w-36 sm:w-40 md:w-44">
                  <AnimeCard anime={anime} />
                </div>
              </div>
            ))}
          </AnimeCarousel>
        )}

        {/* Hidden Gems */}
        {hiddenGems.length > 0 && (
          <AnimeCarousel title="Hidden Gems You Missed" icon={<Star size={16} className="text-accent-sakura" />} viewAllHref="/search?sort=score">
            {hiddenGems
              .filter((anime: any) => {
                if (displayedIds.has(anime.mal_id)) return false;
                displayedIds.add(anime.mal_id);
                return true;
              })
              .map((anime: any, index: number) => (
              <div key={`${anime.mal_id}-${index}`} className="snap-start">
                <div className="w-36 sm:w-40 md:w-44">
                  <AnimeCard anime={anime} />
                </div>
              </div>
            ))}
          </AnimeCarousel>
        )}
      </div>
    </div>
  );
}

// Minimal SectionHeader Helper to prevent empty imports
function SectionHeader({
  title,
  icon,
  viewAllHref,
}: {
  title: string;
  icon?: React.ReactNode;
  viewAllHref?: string;
}) {
  return (
    <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-lg md:text-xl font-bold tracking-tight text-text-primary">{title}</h2>
      </div>
      {viewAllHref && (
        <Link href={viewAllHref} className="text-xs font-semibold text-accent-sakura hover:underline">
          View All
        </Link>
      )}
    </div>
  );
}
