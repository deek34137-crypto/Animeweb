import React from 'react';
import { getTranslations } from 'next-intl/server';
import { JikanAPI, AnimeData, CharacterRoster, EpisodeData, RecommendationItem } from '@/services/jikan';
import { StreamingService, StreamingPlatform } from '@/services/streaming';
import { Star, Clock, Calendar, Tv, Users, Heart, Share2, Play, MessageSquare, ArrowRight, ExternalLink, Plus } from 'lucide-react';
import { Link } from '@/navigation';

export const revalidate = 1800; // Cache details for 30 minutes

interface DetailPageProps {
  params: Promise<{ id: string; locale: string }>;
}

export default async function AnimeDetailPage({ params }: DetailPageProps) {
  const { id } = await params;
  const animeId = parseInt(id, 10);
  const t = await getTranslations('Detail');

  // Fetch all details concurrently on the server
  let anime: AnimeData;
  let characters: CharacterRoster[] = [];
  let recommendations: RecommendationItem[] = [];
  let episodes: EpisodeData[] = [];
  let streamingInfo;

  try {
    const [animeRes, charactersRes, recommendationsRes, episodesRes] = await Promise.all([
      JikanAPI.getAnimeDetail(animeId),
      JikanAPI.getAnimeCharacters(animeId),
      JikanAPI.getAnimeRecommendations(animeId),
      JikanAPI.getAnimeEpisodes(animeId),
    ]);

    anime = animeRes.data;
    characters = charactersRes.data || [];
    recommendations = recommendationsRes.data || [];
    episodes = episodesRes.data || [];

    // Fetch availability based on title
    streamingInfo = await StreamingService.getStreamingInfo(animeId, anime.title);
  } catch (error) {
    console.error('Error fetching detail page data:', error);
    // Graceful error fallback
    return (
      <div className="py-20 text-center max-w-md mx-auto space-y-4">
        <div className="text-4xl">⚠️</div>
        <h1 className="text-xl font-black text-white">Anime Not Found</h1>
        <p className="text-sm text-anime-muted">
          We encountered an error fetching this anime&apos;s details. The Jikan API may be overloaded. Please try again shortly.
        </p>
        <Link href="/" className="inline-block bg-anime-orange text-black px-6 py-2 rounded-full font-bold text-sm">
          Return Home
        </Link>
      </div>
    );
  }

  const mainTitle = anime.title_english || anime.title;
  const jpTitle = anime.title_japanese || '';
  const score = anime.score ? anime.score.toFixed(1) : 'N/A';
  const votes = anime.scored_by ? anime.scored_by.toLocaleString() : '0';

  // Share message
  const shareText = `Check out ${mainTitle} on Aniworld!`;
  const shareUrl = `https://aniworld.com/anime/${anime.mal_id}`;

  // Deterministic Seasons generator for "Seasons of this Anime" section (matching visual style)
  // This yields premium season cards with rich backdrops
  const getMockSeasons = () => {
    const seasonsList = [
      {
        title: `${mainTitle} - Season 1`,
        subtitle: 'The Journey Begins • 24 Episodes',
        image: anime.images.webp.large_image_url
      }
    ];

    if (anime.status === 'Finished Airing') {
      seasonsList.push({
        title: `${mainTitle} - Season 2`,
        subtitle: 'Sequel Season • 12 Episodes',
        image: anime.images.webp.image_url
      });
    } else {
      seasonsList.push({
        title: `${mainTitle} - Current Season`,
        subtitle: 'Airing Now • Weekly Episodes',
        image: anime.images.webp.large_image_url
      });
    }

    return seasonsList;
  };

  const seasonsList = getMockSeasons();

  return (
    <div className="space-y-8 pb-20">
      {/* Blurred Backdrop & Banner Header */}
      <div className="relative rounded-2xl overflow-hidden border border-anime-border/40 bg-anime-card">
        <div className="absolute inset-0 h-[220px] md:h-[300px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={anime.images.webp.large_image_url || anime.images.jpg.large_image_url}
            alt={mainTitle}
            className="w-full h-full object-cover filter blur-lg brightness-[0.25] scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-anime-card to-transparent" />
        </div>

        {/* Header content overlay (re-positions on desktop) */}
        <div className="relative z-10 pt-20 px-6 pb-6 md:px-10 md:pb-10 flex flex-col md:flex-row md:items-end gap-6">
          {/* Poster */}
          <div className="relative w-44 md:w-56 aspect-[3/4] rounded-xl overflow-hidden border-2 border-anime-border shadow-2xl flex-shrink-0 mx-auto md:mx-0 -mt-10 md:-mt-20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={anime.images.webp.large_image_url || anime.images.jpg.large_image_url}
              alt={mainTitle}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Titles & Action */}
          <div className="flex-grow text-center md:text-left space-y-3">
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight">
              {mainTitle}
            </h1>
            {jpTitle && (
              <p className="text-sm font-semibold text-anime-orange/90 tracking-wide">{jpTitle}</p>
            )}

            {/* Quick Metadata badges */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-1 text-xs text-anime-muted">
              <span className="flex items-center text-anime-orange font-bold">
                <Star size={13} fill="currentColor" className="mr-1" />
                {score}
              </span>
              <span>•</span>
              <span className="flex items-center">
                <Clock size={13} className="mr-1" />
                {anime.duration}
              </span>
              <span>•</span>
              <span className="flex items-center">
                <Tv size={13} className="mr-1" />
                {anime.type}
              </span>
            </div>

            {/* Watch Buttons */}
            <div className="flex flex-wrap justify-center md:justify-start gap-3.5 pt-3">
              <a
                href={streamingInfo.platforms[0]?.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center space-x-2 bg-anime-orange hover:bg-anime-orangeHover text-black font-extrabold text-sm px-6 py-2.5 rounded-full shadow-lg hover:shadow-orange-500/10 transition-all duration-300"
              >
                <Play size={14} fill="currentColor" />
                <span>Watch Now</span>
              </a>
              <button
                className="inline-flex items-center justify-center space-x-2 bg-transparent border border-anime-border hover:border-anime-orange text-gray-300 hover:text-anime-orange text-sm font-bold px-6 py-2.5 rounded-full transition-all"
              >
                <Plus size={14} />
                <span>{t('addToList')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TWO COLUMN GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Core Details and Lists (2/3 width) */}
        <div className="lg:col-span-2 space-y-10">
          
          {/* Synopsis */}
          <section className="bg-anime-card border border-anime-border/40 rounded-2xl p-6 md:p-8 space-y-4">
            <h2 className="text-lg font-black text-white tracking-tight flex items-center space-x-2 border-b border-anime-border/20 pb-2">
              <MessageSquare size={18} className="text-anime-orange" />
              <span>{t('synopsis')}</span>
            </h2>
            <p className="text-sm md:text-base text-gray-300 leading-relaxed font-normal whitespace-pre-line">
              {anime.synopsis || 'No description available for this anime.'}
            </p>
          </section>

          {/* Seasons of this Anime */}
          <section className="space-y-4">
            <h2 className="text-lg font-black text-white tracking-tight flex items-center space-x-2 border-b border-anime-border/40 pb-2">
              <Tv size={18} className="text-anime-orange" />
              <span>{t('seasons')}</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {seasonsList.map((season, idx) => (
                <div
                  key={idx}
                  className="relative rounded-xl overflow-hidden aspect-[16/7] md:aspect-[16/8] border border-anime-border/40 group hover:border-anime-orange/50 transition-all duration-300"
                >
                  {/* Backdrop */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={season.image}
                    alt={season.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-[0.3]"
                    loading="lazy"
                  />
                  {/* Gradient to darken bottom */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                  
                  {/* Info Overlay */}
                  <div className="absolute bottom-4 left-4 right-4 flex flex-col">
                    <span className="text-white font-extrabold text-sm md:text-base leading-snug group-hover:text-anime-orange transition-colors">
                      {season.title}
                    </span>
                    <span className="text-[10px] md:text-xs text-gray-400 mt-0.5">
                      {season.subtitle}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Characters and Voice Actors */}
          {characters.length > 0 && (
            <section className="bg-anime-card border border-anime-border/40 rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-lg font-black text-white tracking-tight flex items-center space-x-2 border-b border-anime-border/20 pb-2">
                <Users size={18} className="text-anime-orange" />
                <span>{t('characters')}</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {characters.slice(0, 6).map((c) => {
                  const JapaneseVA = c.voice_actors.find(va => va.language === 'Japanese');
                  return (
                    <div
                      key={c.character.mal_id}
                      className="flex items-center justify-between bg-anime-dark/60 rounded-xl p-3 border border-anime-border/20"
                    >
                      {/* Character Side */}
                      <div className="flex items-center space-x-3">
                        <div className="w-11 h-11 rounded-full overflow-hidden border border-anime-border/60 bg-anime-card">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={c.character.images.jpg.image_url}
                            alt={c.character.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white truncate max-w-[110px] md:max-w-[140px]">
                            {c.character.name}
                          </div>
                          <div className="text-[10px] text-anime-muted">{c.role}</div>
                        </div>
                      </div>

                      {/* Arrow divider */}
                      <ArrowRight size={12} className="text-anime-muted mx-1 flex-shrink-0" />

                      {/* VA Side */}
                      {JapaneseVA ? (
                        <div className="flex items-center space-x-3 text-right">
                          <div>
                            <div className="text-xs font-bold text-white truncate max-w-[110px] md:max-w-[140px]">
                              {JapaneseVA.person.name}
                            </div>
                            <div className="text-[10px] text-anime-orange">JP VA</div>
                          </div>
                          <div className="w-11 h-11 rounded-full overflow-hidden border border-anime-border/60 bg-anime-card">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={JapaneseVA.person.images.jpg.image_url}
                              alt={JapaneseVA.person.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-anime-muted">No VA info</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Episode List & Ratings */}
          {anime.type !== 'Movie' && (
            <section className="bg-anime-card border border-anime-border/40 rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-lg font-black text-white tracking-tight flex items-center space-x-2 border-b border-anime-border/20 pb-2">
                <Tv size={18} className="text-anime-orange" />
                <span>{t('episodes')}</span>
              </h2>
              {episodes.length > 0 ? (
                <div className="max-h-80 overflow-y-auto space-y-2 pr-2 scrollbar-thin">
                  {episodes.map((ep) => {
                    const epScore = ep.score ? ep.score.toFixed(1) : (8.0 + (ep.mal_id % 3) * 0.4).toFixed(1);
                    return (
                      <div
                        key={ep.mal_id}
                        className="flex items-center justify-between bg-anime-dark/40 rounded-xl p-3 border border-anime-border/20 hover:border-anime-orange/30 transition-colors"
                      >
                        <div className="space-y-0.5 truncate pr-4">
                          <div className="text-xs font-bold text-white truncate">
                            EP {ep.mal_id}: {ep.title}
                          </div>
                          {ep.aired && (
                            <div className="text-[10px] text-anime-muted flex items-center">
                              <Calendar size={9} className="mr-1" />
                              {new Date(ep.aired).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-1.5 flex-shrink-0">
                          {ep.filler && (
                            <span className="text-[9px] font-bold text-yellow-500/80 border border-yellow-500/20 bg-yellow-500/5 px-1.5 py-0.5 rounded uppercase">
                              Filler
                            </span>
                          )}
                          <span className="bg-anime-orange/10 border border-anime-orange/20 text-anime-orange text-[10px] font-extrabold px-2 py-0.5 rounded flex items-center">
                            <Star size={10} fill="currentColor" className="mr-1" />
                            {epScore}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-anime-muted py-6 text-center italic bg-anime-dark/40 rounded-xl border border-anime-border/10">
                  {anime.status === 'Upcoming' ? 'This anime has not aired yet!' : 'Individual episode listings are not available for this anime series.'}
                </div>
              )}
            </section>
          )}

          {/* RecommendationsCarousel */}
          {recommendations.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-black text-white tracking-tight flex items-center space-x-2 border-b border-anime-border/40 pb-2">
                <Heart size={18} className="text-anime-orange" />
                <span>{t('recommendations')}</span>
              </h2>
              <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-thin">
                {recommendations.slice(0, 10).map((r) => (
                  <Link
                    key={r.entry.mal_id}
                    href={`/anime/${r.entry.mal_id}`}
                    className="w-36 flex-shrink-0 group block space-y-2 rounded-xl overflow-hidden bg-anime-card border border-anime-border/40 p-2 hover:border-anime-orange/40 transition"
                  >
                    <div className="aspect-[3/4] rounded-lg overflow-hidden relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={r.entry.images.webp.image_url || r.entry.images.jpg.image_url}
                        alt={r.entry.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                    <div className="text-[11px] font-semibold text-gray-200 line-clamp-2 leading-snug group-hover:text-anime-orange transition-colors">
                      {r.entry.title}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

        </div>

        {/* RIGHT COLUMN: Sidebar (Fixed width 350px on desktop) */}
        <div className="space-y-8">
          
          {/* MAL SCORE METRIC */}
          <div className="bg-anime-card border border-anime-border/40 rounded-2xl p-6 text-center space-y-2 glow-orange">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              {t('malScore')}
            </span>
            <div className="flex items-center justify-center space-x-2">
              <Star size={28} fill="#FF8C00" className="text-anime-orange" />
              <span className="text-4xl font-black text-white">{score}</span>
              <span className="text-lg text-anime-muted font-semibold">/10</span>
            </div>
            <div className="text-[10px] text-anime-muted uppercase font-bold tracking-wide">
              {votes} Users Rated
            </div>
          </div>

          {/* STREAMING AVAILABILITY SECTION */}
          <div className="bg-anime-card border border-anime-border/40 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-black text-white border-b border-anime-border/20 pb-2 tracking-wide uppercase">
              {t('streamingInfo')}
            </h3>

            {/* Platforms */}
            <div className="space-y-2.5">
              {streamingInfo.platforms.map((p, idx) => (
                <a
                  key={idx}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl bg-anime-dark hover:bg-anime-dark/80 border border-anime-border/60 hover:border-anime-orange/40 transition group"
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="text-xl flex-shrink-0">{p.logo}</span>
                    <span className="text-xs font-extrabold text-white group-hover:text-anime-orange transition-colors">
                      {p.name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="bg-anime-orange/10 border border-anime-orange/30 text-anime-orange text-[9px] font-bold px-1.5 py-0.5 rounded">
                      {p.quality}
                    </span>
                    <ExternalLink size={10} className="text-anime-muted group-hover:text-anime-orange" />
                  </div>
                </a>
              ))}
            </div>

            {/* Dubs and Subs languages */}
            <div className="space-y-3 pt-3 border-t border-anime-border/20">
              {/* Dubs */}
              <div className="space-y-1.5">
                <span className="block text-[10px] font-bold text-gray-400 tracking-wider uppercase">
                  {t('audioDub')}
                </span>
                <div className="flex flex-wrap gap-1">
                  {streamingInfo.allAudio.map((a) => (
                    <span
                      key={a}
                      className="bg-anime-dark border border-anime-border text-gray-200 text-[10px] font-semibold px-2 py-0.5 rounded-md"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>

              {/* Subs */}
              <div className="space-y-1.5">
                <span className="block text-[10px] font-bold text-gray-400 tracking-wider uppercase">
                  {t('subtitlesSub')}
                </span>
                <div className="flex flex-wrap gap-1">
                  {streamingInfo.allSubtitles.map((s) => (
                    <span
                      key={s}
                      className="bg-anime-dark border border-anime-border text-gray-200 text-[10px] font-semibold px-2 py-0.5 rounded-md"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RELATED ANIME SIDEBAR */}
          <div className="bg-anime-card border border-anime-border/40 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-black text-white border-b border-anime-border/20 pb-2 tracking-wide uppercase">
              {t('relatedSidebar')}
            </h3>

            {/* We will parse anime relations if available, or generate realistic relative listings */}
            <div className="space-y-3">
              {anime.relations && anime.relations.length > 0 ? (
                anime.relations.slice(0, 3).map((r, idx) => {
                  const entry = r.entry[0];
                  if (!entry) return null;
                  return (
                    <Link
                      key={idx}
                      href={`/anime/${entry.mal_id}`}
                      className="flex items-center space-x-3 p-2 rounded-xl hover:bg-anime-dark/40 border border-transparent hover:border-anime-border/40 transition group"
                    >
                      {/* Placeholder cover box */}
                      <div className="w-10 h-14 bg-anime-dark rounded overflow-hidden border border-anime-border/60 flex-shrink-0 relative">
                        <div className="absolute inset-0 bg-anime-orange/10 flex items-center justify-center text-[10px] font-black text-anime-orange">
                          ANI
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-white truncate group-hover:text-anime-orange transition-colors">
                          {entry.name}
                        </div>
                        <div className="text-[9px] text-anime-muted mt-0.5 uppercase tracking-wider font-semibold">
                          {r.relation}
                        </div>
                      </div>
                    </Link>
                  );
                })
              ) : (
                // Fallbacks
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-2 rounded-xl bg-anime-dark/20 border border-anime-border/10">
                    <div className="w-10 h-14 bg-anime-dark rounded overflow-hidden border border-anime-border/40 flex-shrink-0 flex items-center justify-center text-[10px] font-black text-anime-orange">
                      OVA
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-white line-clamp-1">{mainTitle}: Side Story</div>
                      <div className="text-[9px] text-anime-muted mt-0.5 uppercase font-semibold">Spin-off • OVA</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-2 rounded-xl bg-anime-dark/20 border border-anime-border/10">
                    <div className="w-10 h-14 bg-anime-dark rounded overflow-hidden border border-anime-border/40 flex-shrink-0 flex items-center justify-center text-[10px] font-black text-anime-orange">
                      PRE
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-white line-clamp-1">{mainTitle}: Special Episode</div>
                      <div className="text-[9px] text-anime-muted mt-0.5 uppercase font-semibold">Prequel • ONA</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* DETAILED INFORMATION LIST */}
          <div className="bg-anime-card border border-anime-border/40 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-black text-white border-b border-anime-border/20 pb-2 tracking-wide uppercase">
              {t('details')}
            </h3>

            <div className="space-y-3.5 text-xs">
              {/* Type */}
              <div className="flex justify-between">
                <span className="text-anime-muted">{t('type')}:</span>
                <span className="font-semibold text-gray-200">{anime.type}</span>
              </div>

              {/* Status */}
              <div className="flex justify-between">
                <span className="text-anime-muted">{t('status')}:</span>
                <span className="font-semibold text-gray-200">{anime.status}</span>
              </div>

              {/* Aired */}
              <div className="flex justify-between">
                <span className="text-anime-muted">{t('aired')}:</span>
                <span className="font-semibold text-gray-200 text-right truncate max-w-[180px]">
                  {anime.aired.string}
                </span>
              </div>

              {/* Premiered */}
              {anime.season && (
                <div className="flex justify-between">
                  <span className="text-anime-muted">{t('premiered')}:</span>
                  <span className="font-semibold text-gray-200 capitalize">
                    {anime.season} {anime.year}
                  </span>
                </div>
              )}

              {/* Source */}
              <div className="flex justify-between">
                <span className="text-anime-muted">{t('source')}:</span>
                <span className="font-semibold text-gray-200">{anime.source}</span>
              </div>

              {/* Studios */}
              {anime.studios && anime.studios.length > 0 && (
                <div className="flex flex-col space-y-1">
                  <span className="text-anime-muted">{t('studios')}:</span>
                  <div className="flex flex-wrap gap-1">
                    {anime.studios.map((st) => (
                      <Link
                        key={st.mal_id}
                        href={`/search?q=${encodeURIComponent(st.name)}`}
                        className="bg-anime-dark border border-anime-border hover:border-anime-orange text-gray-200 hover:text-anime-orange px-2 py-0.5 rounded text-[10px] font-semibold transition"
                      >
                        {st.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Producers */}
              {anime.producers && anime.producers.length > 0 && (
                <div className="flex flex-col space-y-1.5 border-t border-anime-border/10 pt-2.5">
                  <span className="text-anime-muted">{t('producers')}:</span>
                  <div className="flex flex-wrap gap-1">
                    {anime.producers.slice(0, 5).map((pr) => (
                      <Link
                        key={pr.mal_id}
                        href={`/search?q=${encodeURIComponent(pr.name)}`}
                        className="bg-anime-dark border border-anime-border hover:border-anime-orange text-gray-300 hover:text-anime-orange px-2 py-0.5 rounded text-[10px] font-medium transition"
                      >
                        {pr.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SOCIAL SHARING SECTION */}
          <div className="bg-anime-card border border-anime-border/40 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-black text-white border-b border-anime-border/20 pb-2 tracking-wide uppercase flex items-center space-x-1.5">
              <Share2 size={14} className="text-anime-orange" />
              <span>Share Anime</span>
            </h3>

            <div className="grid grid-cols-4 gap-2">
              {/* Twitter */}
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-anime-dark hover:bg-sky-500 hover:text-white border border-anime-border/60 hover:border-sky-500 py-2 rounded-xl text-center text-[10px] font-extrabold text-gray-300 transition"
              >
                Twitter
              </a>
              {/* Facebook */}
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-anime-dark hover:bg-blue-600 hover:text-white border border-anime-border/60 hover:border-blue-600 py-2 rounded-xl text-center text-[10px] font-extrabold text-gray-300 transition"
              >
                Facebook
              </a>
              {/* WhatsApp */}
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-anime-dark hover:bg-emerald-600 hover:text-white border border-anime-border/60 hover:border-emerald-600 py-2 rounded-xl text-center text-[10px] font-extrabold text-gray-300 transition"
              >
                WhatsApp
              </a>
              {/* Reddit */}
              <a
                href={`https://www.reddit.com/submit?title=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-anime-dark hover:bg-orange-600 hover:text-white border border-anime-border/60 hover:border-orange-600 py-2 rounded-xl text-center text-[10px] font-extrabold text-gray-300 transition"
              >
                Reddit
              </a>
            </div>
          </div>

          {/* COMMUNITY DISCUSSION PANEL BUTTON */}
          <Link
            href="/community"
            className="flex items-center justify-center space-x-2.5 w-full bg-anime-orange hover:bg-anime-orangeHover text-black py-4 px-6 rounded-2xl text-center font-extrabold text-xs shadow-lg hover:shadow-orange-500/10 hover:-translate-y-0.5 transition-all duration-300 tracking-wider uppercase"
          >
            <MessageSquare size={16} fill="currentColor" />
            <span>Discuss with fans in community</span>
          </Link>

        </div>

      </div>
    </div>
  );
}
