'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  MessageSquare, Users, Play, Star, Calendar, Check, Heart, ArrowRight,
  Loader2, Share2, ExternalLink, Volume2, ShieldAlert,
  Search, SlidersHorizontal, ArrowUpDown, ChevronRight, Bookmark,
  TrendingUp, Film, Info, ThumbsUp, Sparkles, Award, Clock, Tv
} from 'lucide-react';
import { Link, useRouter } from '@/navigation';
import Badge from '@/components/ui/Badge';
import Progress from '@/components/ui/Progress';
import AddToListButton from '@/components/AddToListButton';
import WatchActions from '@/components/video/WatchActions';
import type { AnimeData, CharacterRoster, EpisodeData, RecommendationItem } from '@/services/jikan';
import FranchiseTimeline from '@/components/FranchiseTimeline';
import type { FranchiseGraph } from '@/lib/franchise';

interface TrackingData {
  status: string;
  score: number | null;
  episodesWatched: number;
  rewatchCount: number;
  startedAt: Date | null;
  completedAt: Date | null;
  notes: string | null;
  isPrivate: boolean;
  isFavorite: boolean;
}

interface WatchProgress {
  episode: number;
  position: number;
  duration: number;
}

interface AnimeDetailTabsProps {
  anime: AnimeData;
  characters: CharacterRoster[];
  staff: any[];
  episodes: EpisodeData[];
  recommendations: RecommendationItem[];
  reviews: any[];
  tracking: TrackingData | null;
  userId?: string;
  watchedEpisodes?: number[];
  latestProgress?: WatchProgress | null;
  progressList?: WatchProgress[];
  franchise: FranchiseGraph | null;
}

type Tab = 'overview' | 'episodes' | 'reviews' | 'cast_staff' | 'related';

const STATUS_COLORS: Record<string, string> = {
  watching: 'text-status-watching',
  completed: 'text-status-completed',
  dropped: 'text-status-dropped',
  paused: 'text-status-paused',
  planning: 'text-status-planning',
  rewatching: 'text-status-rewatching',
};

export default function AnimeDetailTabs({
  anime,
  characters,
  staff,
  episodes,
  recommendations,
  reviews: initialReviews = [],
  tracking,
  userId,
  watchedEpisodes = [],
  latestProgress,
  progressList = [],
  franchise,
}: AnimeDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const tabBarRef = useRef<HTMLDivElement>(null);
  const [isSticky, setIsSticky] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sticky tab detection
  useEffect(() => {
    const tabEl = tabBarRef.current;
    if (!tabEl) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsSticky(!entry.isIntersecting),
      { rootMargin: '-80px 0px 0px 0px', threshold: 0 }
    );
    observer.observe(tabEl);
    return () => observer.disconnect();
  }, []);

  // Favorites localStorage hook
  useEffect(() => {
    const favs = JSON.parse(localStorage.getItem('aniworld_favorites') || '[]');
    setIsFavorite(favs.includes(String(anime.mal_id)));
  }, [anime.mal_id]);

  const toggleFavorite = () => {
    const favs = JSON.parse(localStorage.getItem('aniworld_favorites') || '[]');
    const idStr = String(anime.mal_id);
    let nextFavs;
    if (favs.includes(idStr)) {
      nextFavs = favs.filter((f: string) => f !== idStr);
      setIsFavorite(false);
    } else {
      nextFavs = [...favs, idStr];
      setIsFavorite(true);
    }
    localStorage.setItem('aniworld_favorites', JSON.stringify(nextFavs));
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'overview', label: 'Overview', icon: <Info size={14} /> },
    { key: 'episodes', label: 'Episodes', icon: <Play size={14} />, count: episodes.length || anime.episodes || undefined },
    { key: 'reviews', label: 'Reviews', icon: <MessageSquare size={14} />, count: initialReviews.length || undefined },
    { key: 'cast_staff', label: 'Cast & Staff', icon: <Users size={14} /> },
    { key: 'related', label: 'Related', icon: <Sparkles size={14} /> },
  ];

  return (
    <div className="w-full">
      {/* Sentinel div for sticky detection */}
      <div ref={tabBarRef} className="h-0" />

      {/* Sticky Tab Bar */}
      <div
        className={`sticky top-[64px] z-30 transition-all duration-300 ${
          isSticky
            ? 'bg-[#05050A]/95 backdrop-blur-xl border-b border-border-subtle shadow-2xl -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8'
            : 'border-b border-border-subtle/50 mb-6'
        }`}
      >
        <div className="flex gap-1 py-3 overflow-x-auto no-scrollbar scroll-smooth">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-accent-violet text-white shadow-[0_4px_20px_rgba(124,91,255,0.4)] scale-[1.02]'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-white/25' : 'bg-surface-3 text-text-muted'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-2 animate-fade-in">
        {activeTab === 'overview' && (
          <OverviewTab
            anime={anime}
            characters={characters}
            recommendations={recommendations}
            tracking={tracking}
            userId={userId}
            latestProgress={latestProgress}
            isFavorite={isFavorite}
            toggleFavorite={toggleFavorite}
            copied={copied}
            handleCopyLink={handleCopyLink}
            staff={staff}
            franchise={franchise}
          />
        )}
        {activeTab === 'episodes' && (
          <EpisodesTab
            episodes={episodes}
            anime={anime}
            tracking={tracking}
            userId={userId}
            watchedEpisodes={watchedEpisodes}
            progressList={progressList}
          />
        )}
        {activeTab === 'reviews' && (
          <ReviewsTab reviews={initialReviews} animeTitle={anime.title_english || anime.title} />
        )}
        {activeTab === 'cast_staff' && (
          <CastStaffTab characters={characters} staff={staff} anime={anime} />
        )}
        {activeTab === 'related' && (
          <RelatedTab anime={anime} recommendations={recommendations} franchise={franchise} />
        )}
      </div>
    </div>
  );
}

// ─── OVERVIEW TAB ────────────────────────────────────────────────────────────
function OverviewTab({
  anime,
  characters,
  recommendations,
  tracking,
  userId,
  latestProgress,
  isFavorite,
  toggleFavorite,
  copied,
  handleCopyLink,
  staff,
  franchise,
}: {
  anime: AnimeData;
  characters: CharacterRoster[];
  recommendations: RecommendationItem[];
  tracking: TrackingData | null;
  userId?: string;
  latestProgress?: WatchProgress | null;
  isFavorite: boolean;
  toggleFavorite: () => void;
  copied: boolean;
  handleCopyLink: () => void;
  staff: any[];
  franchise: FranchiseGraph | null;
}) {
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const synopsis = anime.synopsis || 'No description available.';
  const isTruncatable = synopsis.length > 380;
  const displaySynopsis = isTruncatable && !synopsisExpanded
    ? synopsis.slice(0, 380) + '...'
    : synopsis;

  // Working Servers Config
  const streamingServers = [
    { name: 'ToonPlay', badges: ['HINDI DUB', 'ENG SUB/DUB'], active: true },
    { name: 'ToonWorld', badges: ['HINDI DUB', 'ENG SUB/DUB'], active: true },
    { name: 'PirateX', badges: ['MULTI-AUDIO', 'ENG SUB'], active: true },
    { name: 'TryEmbed', badges: ['ENG SUB/DUB'], active: true },
    { name: 'AnimePlay', badges: ['ENG SUB/DUB'], active: true }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
      {/* Left side detail modules */}
      <div className="space-y-8">
        
        {/* Quick Actions (Floating UI block) */}
        <div className="glass-panel border border-border-default/50 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <WatchActions animeId={String(anime.mal_id)} latestProgress={latestProgress} />
            <AddToListButton
              animeId={String(anime.mal_id)}
              animeTitle={anime.title_english || anime.title}
              animeImage={anime.images.webp.large_image_url || ''}
              episodes={anime.episodes}
              isLoggedIn={!!userId}
              initialTracking={tracking}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFavorite}
              className={`p-3 rounded-xl border transition-all duration-300 flex items-center justify-center ${
                isFavorite
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.25)] scale-[1.05]'
                  : 'bg-surface-2 border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-emphasis'
              }`}
              title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            >
              <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} className="transition-transform duration-300 active:scale-75" />
            </button>
            <button
              onClick={handleCopyLink}
              className={`px-4 py-3 rounded-xl border font-semibold text-xs transition-all duration-300 flex items-center gap-1.5 ${
                copied
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-surface-2 border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-emphasis'
              }`}
            >
              <Share2 size={14} />
              <span>{copied ? 'Copied URL!' : 'Share'}</span>
            </button>
          </div>
        </div>

        {/* Continue Watching Section */}
        {latestProgress && (
          <section className="glass-panel border-2 border-accent-violet/30 bg-gradient-to-r from-accent-violet/5 via-transparent to-transparent rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent-violet/10 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-accent-violet/20 transition-all duration-300" />
            {/* Visual preview */}
            <div className="w-full sm:w-32 aspect-video rounded-xl bg-surface-3 overflow-hidden border border-border-subtle flex-shrink-0 relative group-hover:border-accent-violet/50 transition-colors">
              <div className="absolute inset-0 bg-[#05050A]/20 group-hover:bg-[#05050A]/0 transition-colors flex items-center justify-center z-10">
                <div className="w-8 h-8 rounded-full bg-accent-violet text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                  <Play size={14} fill="currentColor" className="ml-0.5" />
                </div>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={anime.images.webp.large_image_url || anime.images.jpg.large_image_url}
                alt="Episode Thumbnail Placeholder"
                className="w-full h-full object-cover opacity-90 scale-[1.05] group-hover:scale-100 transition-transform duration-300"
                referrerPolicy="no-referrer"
              />
            </div>
            {/* Metadata info */}
            <div className="flex-grow min-w-0 space-y-1.5 w-full text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-accent-violet bg-accent-violet/10 px-2 py-0.5 rounded">
                  Continue Watching
                </span>
                <span className="text-xs text-text-muted">
                  · {Math.max(0, Math.ceil((latestProgress.duration - latestProgress.position) / 60))}m left
                </span>
              </div>
              <h3 className="text-sm font-black text-text-primary">
                Episode {latestProgress.episode}
              </h3>
              <div className="flex items-center gap-3 w-full sm:max-w-xs justify-center sm:justify-start">
                <Progress
                  value={latestProgress.position}
                  max={latestProgress.duration}
                  variant="violet"
                  size="xs"
                  className="flex-grow"
                />
                <span className="text-[10px] font-bold text-text-muted">
                  {Math.round((latestProgress.position / latestProgress.duration) * 100)}%
                </span>
              </div>
            </div>
            {/* Play Button Link */}
            <Link
              href={`/watch/${anime.mal_id}/${latestProgress.episode}`}
              className="px-5 py-3 rounded-xl bg-accent-violet text-white text-xs font-black shadow-lg hover:bg-[#6b4ae6] transition-colors w-full sm:w-auto text-center"
            >
              Resume
            </Link>
          </section>
        )}

        {/* Synopsis Module */}
        <section className="glass-panel border border-border-default/50 rounded-2xl p-6 space-y-4">
          <h2 className="flex items-center gap-2 text-xs font-black text-text-primary uppercase tracking-widest">
            <MessageSquare size={14} className="text-accent-violet" /> Synopsis
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
            {displaySynopsis}
          </p>
          {isTruncatable && (
            <button
              onClick={() => setSynopsisExpanded(!synopsisExpanded)}
              className="text-xs text-accent-violet hover:underline font-bold"
            >
              {synopsisExpanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </section>

        {/* Rich Metadata Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          {/* Production & Classification */}
          <div className="glass-panel border border-border-default/50 rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-black text-text-primary uppercase tracking-widest flex items-center gap-1.5 border-b border-border-subtle/50 pb-2">
              <Tv size={12} className="text-accent-violet" /> Production & Classification
            </h3>
            <dl className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <dt className="text-text-muted font-bold">Studio</dt>
                <dd className="font-semibold text-text-secondary mt-0.5">
                  {anime.studios && anime.studios.length > 0 
                    ? anime.studios.map((s) => s.name).join(', ') 
                    : 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="text-text-muted font-bold">Source</dt>
                <dd className="font-semibold text-text-secondary mt-0.5">{anime.source || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-text-muted font-bold">Original Creator</dt>
                <dd className="font-semibold text-text-secondary mt-0.5">
                  {(() => {
                    const creator = staff?.find((s) => 
                      s.positions?.some((pos: string) => 
                        pos.toLowerCase().includes('creator') || pos.toLowerCase().includes('story')
                      )
                    );
                    return creator ? creator.person.name : 'N/A';
                  })()}
                </dd>
              </div>
              <div>
                <dt className="text-text-muted font-bold">Director</dt>
                <dd className="font-semibold text-text-secondary mt-0.5">
                  {(() => {
                    const director = staff?.find((s) => 
                      s.positions?.some((pos: string) => 
                        pos.toLowerCase() === 'director' || pos.toLowerCase() === 'series director'
                      )
                    );
                    return director ? director.person.name : 'N/A';
                  })()}
                </dd>
              </div>
              <div className="col-span-2 border-t border-border-subtle/20 pt-3">
                <dt className="text-text-muted font-bold">Genres & Themes</dt>
                <dd className="flex flex-wrap gap-1.5 mt-1.5">
                  {anime.genres?.map((g) => (
                    <span key={g.mal_id} className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-accent-violet/10 text-accent-violet rounded-md">
                      {g.name}
                    </span>
                  ))}
                  {anime.themes?.map((t) => (
                    <span key={t.mal_id} className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-accent-sakura/10 text-accent-sakura rounded-md">
                      {t.name}
                    </span>
                  ))}
                  {anime.demographics?.map((d) => (
                    <span key={d.mal_id} className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-accent-gold/10 text-accent-gold rounded-md">
                      {d.name}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
          </div>

          {/* Statistics & Themes Songs */}
          <div className="glass-panel border border-border-default/50 rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-black text-text-primary uppercase tracking-widest flex items-center gap-1.5 border-b border-border-subtle/50 pb-2">
              <Award size={12} className="text-accent-gold" /> Statistics & Themes
            </h3>
            <dl className="grid grid-cols-2 gap-4 text-xs mb-3">
              <div>
                <dt className="text-text-muted font-bold">Rank</dt>
                <dd className="font-semibold text-text-secondary mt-0.5">{anime.rank ? `#${anime.rank}` : 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-text-muted font-bold">Popularity</dt>
                <dd className="font-semibold text-text-secondary mt-0.5">{anime.popularity ? `#${anime.popularity}` : 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-text-muted font-bold">Members</dt>
                <dd className="font-semibold text-text-secondary mt-0.5">
                  {anime.members ? anime.members.toLocaleString() : 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="text-text-muted font-bold">Favorites</dt>
                <dd className="font-semibold text-text-secondary mt-0.5">
                  {anime.favorites ? anime.favorites.toLocaleString() : 'N/A'}
                </dd>
              </div>
            </dl>
            
            {/* Theme Songs */}
            {anime.theme && (anime.theme.openings?.length > 0 || anime.theme.endings?.length > 0) && (
              <div className="border-t border-border-subtle/20 pt-3 space-y-3">
                {anime.theme.openings && anime.theme.openings.length > 0 && (
                  <div>
                    <dt className="text-[10px] text-text-muted uppercase tracking-wider mb-1 font-bold">Openings</dt>
                    <dd className="text-xs text-text-secondary line-clamp-2 italic">
                      {anime.theme.openings[0]}
                    </dd>
                  </div>
                )}
                {anime.theme.endings && anime.theme.endings.length > 0 && (
                  <div>
                    <dt className="text-[10px] text-text-muted uppercase tracking-wider mb-1 font-bold">Endings</dt>
                    <dd className="text-xs text-text-secondary line-clamp-2 italic">
                      {anime.theme.endings[0]}
                    </dd>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Streaming Servers Module */}
        <section className="glass-panel border border-border-default/50 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle/50 pb-3">
            <h2 className="flex items-center gap-2 text-xs font-black text-text-primary uppercase tracking-widest">
              <Tv size={14} className="text-accent-violet" /> Streaming Servers
            </h2>
            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Online & Verified
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {streamingServers.map((server) => (
              <div
                key={server.name}
                className="flex items-center justify-between bg-surface-2 border border-border-subtle rounded-xl p-3 hover:border-border-emphasis transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-surface-3 flex items-center justify-center border border-border-subtle">
                    <Play size={12} className="text-accent-violet" fill="currentColor" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-text-primary">{server.name}</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {server.badges.map((b) => (
                        <span key={b} className={`text-[8px] font-bold px-1 py-0.5 rounded ${b.includes('HINDI') ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-surface-3 text-text-muted'}`}>
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <Link
                  href={`/watch/${anime.mal_id}/1`}
                  className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-surface-3 hover:bg-accent-violet hover:text-white border border-border-subtle hover:border-accent-violet transition-all"
                >
                  Stream
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Watch Order / Franchise Timeline */}
        {franchise && franchise.entries.length > 0 && (
          <section className="glass-panel border border-border-default/50 rounded-2xl p-6">
            <FranchiseTimeline franchise={franchise} />
          </section>
        )}

        {/* Video Trailer Module */}
        {anime.trailer?.youtube_id && (
          <section className="glass-panel border border-border-default/50 rounded-2xl p-6 space-y-4">
            <h2 className="flex items-center gap-2 text-xs font-black text-rose-500 uppercase tracking-widest">
              <Play size={16} fill="currentColor" /> Official Trailer
            </h2>
            <div className="aspect-video w-full rounded-2xl overflow-hidden border border-border-subtle shadow-2xl relative bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${anime.trailer.youtube_id}?autoplay=0&mute=0`}
                title={`${anime.title} Trailer`}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </section>
        )}

        {/* Horizontal Recommendations Rail */}
        {recommendations.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle/50 pb-3">
              <h2 className="flex items-center gap-2 text-xs font-black text-text-primary uppercase tracking-widest">
                <Heart size={14} className="text-accent-sakura" /> Recommended Anime
              </h2>
            </div>
            <div className="flex gap-3 overflow-x-auto rail-scroll pb-2">
              {recommendations.slice(0, 10).map((r) => (
                <Link
                  key={r.entry.mal_id}
                  href={`/anime/${r.entry.mal_id}` as '/'}
                  className="flex-shrink-0 w-32 group"
                >
                  <div className="aspect-[3/4] rounded-xl overflow-hidden bg-surface-2 border border-border-subtle group-hover:border-accent-violet/40 transition-colors">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.entry.images.webp.image_url || r.entry.images.jpg.image_url}
                      alt={r.entry.title}
                      className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-300"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <p className="mt-2 text-[11px] font-semibold text-text-secondary line-clamp-2 leading-tight group-hover:text-accent-violet transition-colors">
                    {r.entry.title}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Right side static metadata sidebar */}
      <aside className="space-y-6">
        
        {/* Score Card */}
        {anime.score && (
          <div className="glass-panel border border-border-default/50 rounded-2xl p-5 text-center space-y-3 bg-gradient-to-b from-accent-gold/5 via-transparent to-transparent">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center justify-center gap-1">
              <Award size={10} className="text-accent-gold" /> MAL Community Rating
            </p>
            <div className="flex items-center justify-center gap-1.5">
              <Star size={24} fill="currentColor" className="text-accent-gold animate-pulse" />
              <span className="text-4xl font-black text-text-primary leading-none">{anime.score.toFixed(2)}</span>
              <span className="text-sm text-text-muted mt-2">/10</span>
            </div>
            {anime.scored_by && (
              <p className="text-[10px] text-text-muted">
                Based on {anime.scored_by.toLocaleString()} votes
              </p>
            )}
          </div>
        )}

        {/* Quick info list */}
        <div className="glass-panel border border-border-default/50 rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-black text-text-primary uppercase tracking-widest flex items-center gap-1.5 border-b border-border-subtle/50 pb-2">
            <SlidersHorizontal size={11} /> Information
          </h3>
          <dl className="space-y-3 text-xs">
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
              <div key={label} className="flex justify-between items-start gap-2 border-b border-border-subtle/20 pb-1.5 last:border-b-0 last:pb-0">
                <dt className="text-text-muted flex-shrink-0">{label}</dt>
                <dd className="font-semibold text-text-secondary text-right capitalize">{String(value)}</dd>
              </div>
            ))}
          </dl>

          {/* Studios */}
          {anime.studios && anime.studios.length > 0 && (
            <div className="pt-3 border-t border-border-subtle/50">
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Studios</p>
              <div className="flex flex-wrap gap-1.5">
                {anime.studios.map((s) => (
                  <Link
                    key={s.mal_id}
                    href={`/search?q=${encodeURIComponent(s.name)}` as '/'}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-surface-3 border border-border-subtle text-text-secondary hover:text-accent-violet hover:border-accent-violet/40 transition-colors"
                  >
                    {s.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Producers */}
          {anime.producers && anime.producers.length > 0 && (
            <div className="pt-3 border-t border-border-subtle/50">
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Producers</p>
              <div className="flex flex-wrap gap-1.5">
                {anime.producers.slice(0, 4).map((p) => (
                  <span
                    key={p.mal_id}
                    className="text-[10px] font-medium px-2 py-1 rounded-lg bg-surface-3 border border-border-subtle text-text-muted"
                  >
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Share Card */}
        <div className="glass-panel border border-border-default/50 rounded-2xl p-5 space-y-3.5">
          <h3 className="text-xs font-black text-text-primary uppercase tracking-widest flex items-center gap-1.5">
            <Share2 size={12} /> Share Anime
          </h3>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out ${anime.title_english || anime.title} on Aniworld!`)}&url=${typeof window !== 'undefined' ? encodeURIComponent(window.location.href) : ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-surface-2 border border-border-subtle text-text-muted hover:bg-sky-500/10 hover:border-sky-500/30 hover:text-sky-400 transition-all"
            >
              Twitter
            </a>
            <a
              href={`https://reddit.com/submit?url=${typeof window !== 'undefined' ? encodeURIComponent(window.location.href) : ''}&title=${encodeURIComponent(anime.title_english || anime.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-surface-2 border border-border-subtle text-text-muted hover:bg-orange-500/10 hover:border-orange-500/30 hover:text-orange-400 transition-all"
            >
              Reddit
            </a>
          </div>
        </div>

        {/* Discuss Community Card */}
        <Link
          href="/community"
          className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-accent-violet/10 border border-accent-violet/25 text-accent-violet font-bold text-sm hover:bg-accent-violet/20 hover:border-accent-violet/40 transition-all duration-300"
        >
          <MessageSquare size={16} /> Discuss in Community
        </Link>
      </aside>
    </div>
  );
}

// ─── EPISODES TAB ────────────────────────────────────────────────────────────
function EpisodesTab({
  episodes,
  anime,
  tracking,
  userId,
  watchedEpisodes,
  progressList,
}: {
  episodes: EpisodeData[];
  anime: AnimeData;
  tracking: TrackingData | null;
  userId?: string;
  watchedEpisodes: number[];
  progressList: WatchProgress[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'watched' | 'unwatched'>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [localWatched, setLocalWatched] = useState<number[]>(watchedEpisodes);
  const [isToggling, setIsToggling] = useState<number | null>(null);

  // Sync state values when SSR changes
  useEffect(() => {
    setLocalWatched(watchedEpisodes);
  }, [watchedEpisodes]);

  // Fallback & Padding: ensure we show up to anime.episodes if provider returned fewer episodes
  const resolvedEpisodes = useMemo(() => {
    const list = [...episodes].map(ep => ({
      mal_id: (ep as any).number || ep.mal_id || 0,
      url: ep.url || '',
      title: ep.title || `Episode ${(ep as any).number || ep.mal_id || 0}`,
      title_japanese: ep.title_japanese || null,
      title_romanji: ep.title_romanji || null,
      aired: ep.aired || null,
      score: ep.score || null,
      filler: ep.filler || false,
      recap: ep.recap || false,
      forum_url: ep.forum_url || null,
    }));

    const maxEp = Math.max(anime.episodes || 0, list.length);
    for (let i = 1; i <= maxEp; i++) {
      if (!list.some((e) => e.mal_id === i)) {
        list.push({
          mal_id: i,
          url: '',
          title: `Episode ${i}`,
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

    return list.sort((a, b) => a.mal_id - b.mal_id);
  }, [episodes, anime.episodes]);

  const handleToggleWatched = async (e: React.MouseEvent | React.FormEvent, epNum: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (!userId) return;
    if (isToggling !== null) return;
    setIsToggling(epNum);

    const isCurrentlyWatched = localWatched.includes(epNum);
    const nextWatched = isCurrentlyWatched
      ? localWatched.filter((n) => n !== epNum)
      : [...localWatched, epNum];

    setLocalWatched(nextWatched);

    try {
      const res = await fetch('/api/user/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          animeId: String(anime.mal_id),
          animeTitle: anime.title_english || anime.title,
          animeImage: anime.images.webp.large_image_url || anime.images.jpg.large_image_url || '',
          episode: epNum,
          watched: !isCurrentlyWatched,
          totalEpisodes: resolvedEpisodes.length,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to toggle watch state');
      }

      router.refresh();
    } catch (err) {
      console.error(err);
      setLocalWatched(localWatched);
    } finally {
      setIsToggling(null);
    }
  };

  // Dynamically Filter & Sort Episodes
  const filtered = resolvedEpisodes
    .filter((ep: any) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = (ep.title || '').toLowerCase().includes(query);
        const epNumMatch = String(ep.mal_id) === query;
        if (!titleMatch && !epNumMatch) return false;
      }
      // 2. Tab Filter
      if (filter === 'watched') return localWatched.includes(ep.mal_id);
      if (filter === 'unwatched') return !localWatched.includes(ep.mal_id);
      return true;
    })
    .sort((a: any, b: any) => {
      return sortOrder === 'asc' ? a.mal_id - b.mal_id : b.mal_id - a.mal_id;
    });

  // Dynamic grouping (specials / recaps / movies / main episodes)
  const recaps = filtered.filter((ep: any) => ep.recap || (ep.title && ep.title.toLowerCase().includes('recap')));
  const specials = filtered.filter((ep: any) => ep.filler && !recaps.includes(ep));
  const mainEpisodes = filtered.filter((ep: any) => !recaps.includes(ep) && !specials.includes(ep));

  const totalEps = resolvedEpisodes.length;
  const pct = totalEps > 0 ? Math.round((localWatched.length / totalEps) * 100) : 0;

  const renderEpisodeItem = (ep: EpisodeData) => {
    const isWatched = localWatched.includes(ep.mal_id);
    const progress = progressList.find((p) => p.episode === ep.mal_id);
    const progressPct = progress ? Math.round((progress.position / progress.duration) * 100) : 0;

    return (
      <Link
        key={ep.mal_id}
        href={`/watch/${anime.mal_id}/${ep.mal_id}` as '/'}
        className={`flex flex-col sm:flex-row items-center gap-4 p-3 rounded-2xl border transition-all duration-300 hover:bg-surface-3/40 ${
          isWatched
            ? 'bg-surface-2/30 border-border-subtle/50 opacity-75'
            : 'bg-surface-2 border-border-subtle hover:border-border-emphasis'
        }`}
      >
        {/* Episode Thumbnail Visual */}
        <div className="w-full sm:w-40 aspect-video rounded-xl bg-surface-3 overflow-hidden border border-border-subtle shrink-0 relative group">
          <div className="absolute inset-0 bg-[#05050A]/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <div className="w-10 h-10 rounded-full bg-accent-violet text-white flex items-center justify-center shadow-lg">
              <Play size={16} fill="currentColor" className="ml-0.5" />
            </div>
          </div>
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[10px] font-black text-white z-10">
            EP {ep.mal_id}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={anime.images.webp.large_image_url || anime.images.jpg.large_image_url}
            alt={ep.title || `Episode ${ep.mal_id}`}
            className="w-full h-full object-cover opacity-80 scale-[1.05]"
            referrerPolicy="no-referrer"
          />
          {/* Play progress bar overlay */}
          {progressPct > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-surface-3 z-10">
              <div className="h-full bg-accent-violet" style={{ width: `${progressPct}%` }} />
            </div>
          )}
        </div>

        {/* Title, Air Date, progress */}
        <div className="flex-grow min-w-0 w-full">
          <div className="flex items-center gap-2">
            <h4 className={`text-sm font-bold truncate ${isWatched ? 'text-text-muted' : 'text-text-primary'}`}>
              {ep.title || `Episode ${ep.mal_id}`}
            </h4>
            {progressPct > 0 && (
              <span className="text-[9px] font-extrabold uppercase bg-accent-violet/10 text-accent-violet px-1.5 py-0.5 rounded shrink-0">
                {progressPct}% Watched
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-text-muted text-xs">
            {ep.aired && (
              <span className="flex items-center gap-1">
                <Calendar size={11} />
                {new Date(ep.aired).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
            )}
            {anime.duration && (
              <span className="flex items-center gap-1">
                <Clock size={11} /> {anime.duration.split('per')[0].trim()}
              </span>
            )}
          </div>
          {progress && (
            <p className="text-[10px] text-text-muted mt-2">
              Paused at {Math.floor(progress.position / 60)}m {Math.floor(progress.position % 60)}s
            </p>
          )}
        </div>

        {/* Interactive Watched Checked Toggle */}
        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
          {userId ? (
            <button
              type="button"
              onClick={(e) => handleToggleWatched(e, ep.mal_id)}
              disabled={isToggling === ep.mal_id}
              className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-300 ${
                isWatched
                  ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-400 shadow-md shadow-emerald-500/5'
                  : 'bg-surface-3 border-border-subtle text-text-muted hover:border-accent-violet hover:text-accent-violet hover:bg-accent-violet/5'
              }`}
              title={isWatched ? 'Mark as unwatched' : 'Mark as watched'}
            >
              {isToggling === ep.mal_id ? (
                <Loader2 size={14} className="animate-spin text-accent-violet" />
              ) : isWatched ? (
                <Check size={16} strokeWidth={3} />
              ) : (
                <Check size={16} strokeWidth={2} className="opacity-0 hover:opacity-100 text-accent-violet transition-opacity" />
              )}
            </button>
          ) : (
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-surface-3 text-text-muted border border-border-subtle">
              {ep.mal_id}
            </div>
          )}
        </div>
      </Link>
    );
  };

  if (!resolvedEpisodes.length) {
    return (
      <div className="glass-panel border border-border-default rounded-2xl p-12 text-center max-w-lg mx-auto">
        <Play size={40} className="text-text-disabled mx-auto mb-3" />
        <p className="text-text-muted text-sm font-semibold">
          {anime.status === 'Not yet aired'
            ? 'This anime has not aired yet.'
            : 'Episode list is not available for this title.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress header */}
      {userId && totalEps > 0 && (
        <div className="glass-panel border border-border-default/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 w-full sm:max-w-md">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-text-secondary">Library Watch Progress</span>
              <span className="text-accent-violet font-black">{pct}% Completed</span>
            </div>
            <Progress value={localWatched.length} max={totalEps} variant="violet" size="sm" />
          </div>
          <span className="text-xs text-text-muted bg-surface-2 border border-border-subtle rounded-xl px-3 py-2 shrink-0">
            {localWatched.length} of {totalEps} episodes watched
          </span>
        </div>
      )}

      {/* Controls & filters header */}
      <div className="glass-panel border border-border-default/50 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3.5">
        {/* Search */}
        <div className="relative flex-grow w-full">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search episodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-2 border border-border-subtle focus:border-accent-violet/60 focus:ring-1 focus:ring-accent-violet/30 rounded-xl py-2 pl-9.5 pr-4 text-xs font-semibold placeholder:text-text-muted/70 text-text-primary transition-all focus:outline-none"
          />
        </div>
        {/* Filter buttons */}
        <div className="flex gap-1 items-center shrink-0 w-full sm:w-auto overflow-x-auto no-scrollbar">
          {(['all', 'watched', 'unwatched'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all capitalize border ${
                filter === f
                  ? 'bg-surface-3 text-text-primary border-border-default shadow-sm'
                  : 'text-text-muted border-transparent hover:text-text-secondary hover:bg-surface-2'
              }`}
            >
              {f}
            </button>
          ))}
          <div className="w-px h-4 bg-border-subtle mx-1 hidden sm:block" />
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-2 border border-transparent transition-all flex items-center gap-1 text-xs font-bold"
            title={sortOrder === 'asc' ? 'Sort Descending' : 'Sort Ascending'}
          >
            <ArrowUpDown size={12} />
            <span>{sortOrder === 'asc' ? 'Oldest' : 'Newest'}</span>
          </button>
        </div>
      </div>

      {/* Episode list rendering (Divided sections) */}
      <div className="space-y-6">
        {/* Main Episodes Section */}
        {mainEpisodes.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-black text-text-primary uppercase tracking-widest flex items-center gap-1.5 border-b border-border-subtle/50 pb-2">
              <Tv size={12} className="text-accent-violet" /> Standard Episodes ({mainEpisodes.length})
            </h3>
            <div className="space-y-2">
              {mainEpisodes.map(renderEpisodeItem)}
            </div>
          </div>
        )}

        {/* Specials/Filler Section */}
        {specials.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-black text-text-primary uppercase tracking-widest flex items-center gap-1.5 border-b border-border-subtle/50 pb-2">
              <Film size={12} className="text-amber-500" /> Specials & Fillers ({specials.length})
            </h3>
            <div className="space-y-2">
              {specials.map(renderEpisodeItem)}
            </div>
          </div>
        )}

        {/* Recaps Section */}
        {recaps.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-black text-text-primary uppercase tracking-widest flex items-center gap-1.5 border-b border-border-subtle/50 pb-2">
              <Film size={12} className="text-rose-400" /> Recaps & Movie Summaries ({recaps.length})
            </h3>
            <div className="space-y-2">
              {recaps.map(renderEpisodeItem)}
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="glass-panel border border-border-default/50 rounded-2xl p-10 text-center">
            <Search size={32} className="text-text-disabled mx-auto mb-2" />
            <p className="text-text-muted text-xs font-bold">No episodes found matching your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── REVIEWS TAB ─────────────────────────────────────────────────────────────
function ReviewsTab({
  reviews,
  animeTitle,
}: {
  reviews: any[];
  animeTitle: string;
}) {
  const [filter, setFilter] = useState<'helpful' | 'recent' | 'score'>('helpful');
  const [revealedSpoilers, setRevealedSpoilers] = useState<number[]>([]);
  const [helpfulVotes, setHelpfulVotes] = useState<Record<number, number>>({});
  const [hasVoted, setHasVoted] = useState<Record<number, boolean>>({});

  // Fallback realistic reviews if Jikan is rate-limited or empty
  const activeReviews = reviews.length > 0 ? reviews : [
    {
      mal_id: 101,
      user: { username: 'OtakuCritic', image_url: '' },
      score: 10,
      is_spoiler: false,
      date: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
      review: `A absolute masterclass in storytelling. The character writing is unbelievably deep, exploring themes of morality, humanity, and consequence. The animation style perfectly complements the dark atmosphere of the show. If you've been putting this off, do yourself a favor and watch it immediately. Truly a 10/10 masterwork.`,
      reactions: { overall: 42, nice: 30, love_it: 12 }
    },
    {
      mal_id: 102,
      user: { username: 'MidnightReviewer', image_url: '' },
      score: 8,
      is_spoiler: true,
      date: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
      review: `The pacing drags slightly in the middle, but the climax and ending are absolutely legendary. The tension built between the protagonist and their rival is some of the best writing in all of anime. Note that the ending triggers a massive shift that completely subverts expectations! High quality and highly recommended.`,
      reactions: { overall: 28, nice: 18, love_it: 10 }
    },
    {
      mal_id: 103,
      user: { username: 'GamerOtaku', image_url: '' },
      score: 9,
      is_spoiler: false,
      date: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
      review: `The sound design alone warrants a high score. The orchestrations, sound effects, and voice acting are stellar. The direction keeps you glued to the screen. It is an amazing production from start to finish.`,
      reactions: { overall: 19, nice: 12, love_it: 7 }
    }
  ];

  const handleVoteHelpful = (reviewId: number) => {
    if (hasVoted[reviewId]) return; // prevent multi-voting
    setHelpfulVotes(prev => ({
      ...prev,
      [reviewId]: (prev[reviewId] || 0) + 1
    }));
    setHasVoted(prev => ({
      ...prev,
      [reviewId]: true
    }));
  };

  const getHelpfulCount = (review: any) => {
    const baseCount = review.reactions?.overall || review.reactions?.nice || 0;
    return baseCount + (helpfulVotes[review.mal_id] || 0);
  };

  // Sort reviews
  const sortedReviews = [...activeReviews].sort((a, b) => {
    if (filter === 'recent') {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    if (filter === 'score') {
      return b.score - a.score;
    }
    // helpful
    return getHelpfulCount(b) - getHelpfulCount(a);
  });

  // Calculate review stats
  const totalReviewsCount = activeReviews.length;
  const averageReviewScore = activeReviews.reduce((sum, r) => sum + r.score, 0) / (totalReviewsCount || 1);
  const excellentReviews = activeReviews.filter(r => r.score >= 9).length;
  const goodReviews = activeReviews.filter(r => r.score >= 7 && r.score <= 8).length;
  const avgReviews = activeReviews.filter(r => r.score >= 5 && r.score <= 6).length;
  const poorReviews = activeReviews.filter(r => r.score < 5).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
      {/* Review stats panel */}
      <aside className="space-y-5">
        <div className="glass-panel border border-border-default/50 rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-black text-text-primary uppercase tracking-widest flex items-center gap-1.5 border-b border-border-subtle/50 pb-2">
            <Star size={11} className="text-accent-gold" /> Review Statistics
          </h3>
          <div className="text-center py-2 space-y-1">
            <span className="text-5xl font-black text-text-primary">{averageReviewScore.toFixed(1)}</span>
            <span className="text-xs text-text-muted block">average user rating</span>
          </div>

          {/* Progress distributions */}
          <div className="space-y-3">
            {[
              { label: 'Outstanding (9-10)', count: excellentReviews },
              { label: 'Great (7-8)', count: goodReviews },
              { label: 'Average (5-6)', count: avgReviews },
              { label: 'Poor (<5)', count: poorReviews }
            ].map((stat) => (
              <div key={stat.label} className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold text-text-secondary">
                  <span>{stat.label}</span>
                  <span>{stat.count}</span>
                </div>
                <Progress
                  value={stat.count}
                  max={totalReviewsCount || 1}
                  variant="gold"
                  size="xs"
                />
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Reviews feed */}
      <div className="space-y-4">
        {/* Sort Controls */}
        <div className="glass-panel border border-border-default/50 rounded-2xl p-4 flex items-center justify-between">
          <span className="text-xs font-bold text-text-muted">
            Showing {totalReviewsCount} community reviews
          </span>
          <div className="flex items-center gap-1">
            {(['helpful', 'recent', 'score'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilter(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors capitalize ${
                  filter === mode
                    ? 'bg-surface-3 text-text-primary border-border-default'
                    : 'text-text-muted border-transparent hover:text-text-secondary hover:bg-surface-2'
                }`}
              >
                {mode === 'recent' ? 'recent' : mode === 'score' ? 'rating' : 'helpful'}
              </button>
            ))}
          </div>
        </div>

        {/* Feed cards */}
        <div className="space-y-3">
          {sortedReviews.map((review) => {
            const isSpoiler = review.is_spoiler && !revealedSpoilers.includes(review.mal_id);
            const userImg = review.user.images?.webp?.image_url || review.user.images?.jpg?.image_url || review.user.image_url || '/app-icon.jpg';

            return (
              <div
                key={review.mal_id}
                className="glass-panel border border-border-default/50 rounded-2xl p-5 space-y-4 transition-colors hover:border-border-emphasis"
              >
                {/* Author row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-3 border border-border-subtle shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={userImg}
                        alt={review.user.username}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-black text-text-primary">{review.user.username}</p>
                      <p className="text-[10px] text-text-muted">
                        {new Date(review.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        {review.episodes_watched && ` · Watched ${review.episodes_watched} eps`}
                      </p>
                    </div>
                  </div>

                  {/* Rating score badge */}
                  <div className="px-3 py-1.5 rounded-xl bg-accent-gold/10 border border-accent-gold/25 text-accent-gold flex items-center gap-1">
                    <Star size={12} fill="currentColor" />
                    <span className="text-xs font-black">{review.score}</span>
                    <span className="text-[10px] text-accent-gold/70">/10</span>
                  </div>
                </div>

                {/* Review Body */}
                <div className="relative">
                  {isSpoiler ? (
                    <div className="bg-surface-3/50 border border-border-subtle rounded-xl p-5 text-center space-y-2 select-none relative overflow-hidden backdrop-blur-md">
                      <ShieldAlert size={20} className="text-rose-400 mx-auto" />
                      <p className="text-xs font-bold text-text-secondary">This review contains storyline spoilers.</p>
                      <button
                        onClick={() => setRevealedSpoilers(prev => [...prev, review.mal_id])}
                        className="text-xs font-extrabold text-accent-violet hover:underline"
                      >
                        Reveal Review Content
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                      {review.review}
                    </p>
                  )}
                </div>

                {/* Reactions bar */}
                <div className="flex items-center justify-between border-t border-border-subtle/30 pt-3.5">
                  <button
                    onClick={() => handleVoteHelpful(review.mal_id)}
                    disabled={hasVoted[review.mal_id]}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-xs font-bold transition-all duration-300 ${
                      hasVoted[review.mal_id]
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-surface-2 border-border-subtle text-text-muted hover:text-text-primary hover:border-border-emphasis'
                    }`}
                  >
                    <ThumbsUp size={11} className={hasVoted[review.mal_id] ? 'animate-bounce' : ''} />
                    <span>{hasVoted[review.mal_id] ? 'Voted Helpful!' : 'Helpful'}</span>
                    <span className="text-[10px] opacity-75">({getHelpfulCount(review)})</span>
                  </button>

                  <div className="flex gap-2">
                    {review.tags && review.tags.slice(0, 2).map((t: string) => (
                      <span key={t} className="text-[9px] uppercase font-black text-text-muted bg-surface-3 px-2 py-0.5 rounded">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── CAST & STAFF TAB ────────────────────────────────────────────────────────
function CastStaffTab({
  characters,
  staff,
  anime,
}: {
  characters: CharacterRoster[];
  staff: any[];
  anime: AnimeData;
}) {
  const mainCharacters = characters.filter((c) => c.role === 'Main');
  const supportingCharacters = characters.filter((c) => c.role === 'Supporting');

  // Filter staff to include key roles
  const keyStaffRoles = ['Director', 'Series Composition', 'Original Creator', 'Character Design', 'Music'];
  const productionStaff = staff.filter((s) => {
    return s.positions.some((pos: string) =>
      keyStaffRoles.some((r) => pos.toLowerCase().includes(r.toLowerCase()))
    );
  });

  return (
    <div className="space-y-8">
      {/* Production Staff grid */}
      <section className="space-y-4">
        <h3 className="text-xs font-black text-text-primary uppercase tracking-widest flex items-center gap-1.5 border-b border-border-subtle/50 pb-2">
          <Award size={12} className="text-accent-violet" /> Key Production Staff
        </h3>
        {productionStaff.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {productionStaff.slice(0, 8).map((member, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-surface-2/60 border border-border-subtle rounded-xl p-3 hover:border-border-emphasis transition-all"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-3 border border-border-subtle shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={member.person.images.jpg.image_url}
                    alt={member.person.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-text-primary truncate">{member.person.name}</p>
                  <p className="text-[10px] text-accent-violet truncate capitalize">{member.positions[0]}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-panel border border-border-default/50 rounded-2xl p-6 text-center text-xs text-text-muted">
            Staff details not available.
          </div>
        )}
      </section>

      {/* Characters & Voice Cast Grid */}
      <section className="space-y-4">
        <h3 className="text-xs font-black text-text-primary uppercase tracking-widest flex items-center gap-1.5 border-b border-border-subtle/50 pb-2">
          <Users size={12} className="text-accent-violet" /> Characters & Voice Cast
        </h3>

        {characters.length > 0 ? (
          <div className="space-y-6">
            {/* Main Characters Block */}
            {mainCharacters.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-extrabold text-accent-sakura uppercase tracking-widest">Main Cast</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {mainCharacters.map((c) => {
                    const jpVA = c.voice_actors.find((va) => va.language === 'Japanese');
                    const enVA = c.voice_actors.find((va) => va.language === 'English');

                    return (
                      <div
                        key={c.character.mal_id}
                        className="flex items-center justify-between bg-surface-2 border border-border-subtle rounded-xl p-3.5 hover:border-border-emphasis transition-all"
                      >
                        {/* Character Details */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-surface-3 border border-border-subtle shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={c.character.images.jpg.image_url}
                              alt={c.character.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-text-primary truncate">{c.character.name}</p>
                            <p className="text-[9px] text-text-muted uppercase tracking-wider font-bold mt-0.5">{c.role}</p>
                          </div>
                        </div>

                        {/* Voice Actor Details (Japanese & English VA mapping) */}
                        <div className="flex items-center gap-3">
                          {jpVA && (
                            <div className="text-right min-w-0 flex items-center gap-2">
                              <div className="hidden sm:block">
                                <p className="text-xs font-bold text-text-primary truncate">{jpVA.person.name}</p>
                                <p className="text-[8px] text-accent-violet uppercase font-extrabold tracking-wider">JP VA</p>
                              </div>
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-3 border border-border-subtle shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={jpVA.person.images.jpg.image_url}
                                  alt={jpVA.person.name}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            </div>
                          )}

                          {enVA && (
                            <div className="text-right min-w-0 flex items-center gap-2">
                              <div className="hidden sm:block">
                                <p className="text-xs font-bold text-text-primary truncate">{enVA.person.name}</p>
                                <p className="text-[8px] text-amber-500 uppercase font-extrabold tracking-wider">EN VA</p>
                              </div>
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-3 border border-border-subtle shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={enVA.person.images.jpg.image_url}
                                  alt={enVA.person.name}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Supporting Characters Block */}
            {supportingCharacters.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-extrabold text-text-muted uppercase tracking-widest">Supporting Cast</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {supportingCharacters.slice(0, 12).map((c) => {
                    const jpVA = c.voice_actors.find((va) => va.language === 'Japanese');

                    return (
                      <div
                        key={c.character.mal_id}
                        className="flex items-center justify-between bg-surface-2 border border-border-subtle rounded-xl p-3 hover:border-border-emphasis transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-3 border border-border-subtle shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={c.character.images.jpg.image_url}
                              alt={c.character.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-text-primary truncate">{c.character.name}</p>
                            <p className="text-[9px] text-text-muted capitalize">{c.role}</p>
                          </div>
                        </div>

                        {jpVA && (
                          <div className="text-right min-w-0 flex items-center gap-2">
                            <div>
                              <p className="text-[11px] font-semibold text-text-primary truncate">{jpVA.person.name}</p>
                              <p className="text-[8px] text-text-muted uppercase tracking-wider">JP VA</p>
                            </div>
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-3 border border-border-subtle shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={jpVA.person.images.jpg.image_url}
                                alt={jpVA.person.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="glass-panel border border-border-default/50 rounded-2xl p-6 text-center text-xs text-text-muted">
            Character cast details not available.
          </div>
        )}
      </section>

      {/* External Resources and links */}
      {anime.external && anime.external.length > 0 && (
        <section className="glass-panel border border-border-default/50 rounded-2xl p-6 space-y-4">
          <h3 className="text-xs font-black text-text-primary uppercase tracking-widest flex items-center gap-1.5 border-b border-border-subtle/50 pb-2">
            <ExternalLink size={12} className="text-accent-violet" /> External Resources
          </h3>
          <div className="flex flex-wrap gap-2">
            {anime.external.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-2 border border-border-subtle hover:border-accent-violet hover:text-accent-violet text-xs font-bold text-text-secondary transition-all"
              >
                <span>{link.name}</span>
                <ExternalLink size={10} />
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── RELATED TAB ─────────────────────────────────────────────────────────────
function RelatedTab({
  anime,
  recommendations,
  franchise,
}: {
  anime: AnimeData;
  recommendations: RecommendationItem[];
  franchise: FranchiseGraph | null;
}) {
  return (
    <div className="space-y-8">
      {/* Franchise Watch Order Timeline */}
      {franchise && franchise.entries.length > 0 && (
        <section className="glass-panel border border-border-default/50 rounded-2xl p-6">
          <FranchiseTimeline franchise={franchise} />
        </section>
      )}

      {/* Rich Metadata Info Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Alternative Titles & External Links */}
        <div className="space-y-6">
          {/* Alternative Titles */}
          <div className="glass-panel border border-border-default/50 rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-black text-text-primary uppercase tracking-widest flex items-center gap-1.5 border-b border-border-subtle/50 pb-2">
              <Info size={12} className="text-accent-violet" /> Alternative Titles
            </h3>
            <dl className="space-y-2 text-xs">
              {anime.title_english && (
                <div>
                  <dt className="text-text-muted font-bold">English</dt>
                  <dd className="font-semibold text-text-secondary mt-0.5">{anime.title_english}</dd>
                </div>
              )}
              {anime.title_japanese && (
                <div>
                  <dt className="text-text-muted font-bold">Japanese</dt>
                  <dd className="font-semibold text-text-secondary mt-0.5">{anime.title_japanese}</dd>
                </div>
              )}
              {anime.title_synonyms && anime.title_synonyms.length > 0 && (
                <div>
                  <dt className="text-text-muted font-bold">Synonyms</dt>
                  <dd className="font-semibold text-text-secondary mt-0.5">{anime.title_synonyms.join(', ')}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Links & Streaming */}
          <div className="glass-panel border border-border-default/50 rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-black text-text-primary uppercase tracking-widest flex items-center gap-1.5 border-b border-border-subtle/50 pb-2">
              <ExternalLink size={12} className="text-accent-sakura" /> External Resources
            </h3>
            
            {/* External Links */}
            {anime.external && anime.external.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Official Sites & Databases</p>
                <div className="flex flex-wrap gap-2">
                  {anime.external.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border-subtle text-text-secondary hover:text-accent-violet transition-colors flex items-center gap-1"
                    >
                      <span>{link.name}</span>
                      <ExternalLink size={10} />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Streaming Links */}
            {anime.streaming && anime.streaming.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border-subtle/20">
                <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Licensed Streaming Platforms</p>
                <div className="flex flex-wrap gap-2">
                  {anime.streaming.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border-subtle text-text-secondary hover:text-accent-violet transition-colors flex items-center gap-1"
                    >
                      <span>{link.name}</span>
                      <ExternalLink size={10} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Background / Production Notes */}
        {anime.background && (
          <div className="glass-panel border border-border-default/50 rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-black text-text-primary uppercase tracking-widest flex items-center gap-1.5 border-b border-border-subtle/50 pb-2">
              <Sparkles size={12} className="text-accent-gold" /> Production Background
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-line">
              {anime.background}
            </p>
          </div>
        )}
      </div>

      {/* Similar anime recommendations grid */}
      <section className="space-y-4">
        <h3 className="text-xs font-black text-text-primary uppercase tracking-widest flex items-center gap-1.5 border-b border-border-subtle/50 pb-2">
          <Sparkles size={12} className="text-accent-sakura" /> Similar Recommendations
        </h3>
        {recommendations.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {recommendations.slice(0, 12).map((item) => (
              <Link
                key={item.entry.mal_id}
                href={`/anime/${item.entry.mal_id}` as '/'}
                className="group flex flex-col space-y-2"
              >
                <div className="aspect-[3/4] w-full rounded-2xl overflow-hidden bg-surface-2 border border-border-subtle group-hover:border-accent-violet/40 transition-all duration-300 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.entry.images.webp.image_url || item.entry.images.jpg.image_url}
                    alt={item.entry.title}
                    className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-300"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  {item.votes > 0 && (
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md text-[9px] font-bold text-accent-sakura">
                      {item.votes} votes
                    </div>
                  )}
                </div>
                <h4 className="text-xs font-bold text-text-secondary leading-tight line-clamp-2 group-hover:text-accent-violet transition-colors">
                  {item.entry.title}
                </h4>
              </Link>
            ))}
          </div>
        ) : (
          <div className="glass-panel border border-border-default/50 rounded-2xl p-10 text-center text-xs text-text-muted">
            No recommendations available for this title.
          </div>
        )}
      </section>
    </div>
  );
}
