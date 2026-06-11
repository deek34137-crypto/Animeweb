'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare, Users, Play, Star, Calendar, Check, Heart, ArrowRight
} from 'lucide-react';
import { Link } from '@/navigation';
import Badge from '@/components/ui/Badge';
import Progress from '@/components/ui/Progress';
import type { AnimeData, CharacterRoster, EpisodeData, RecommendationItem } from '@/services/jikan';

interface TrackingData {
  status: string;
  score: number | null;
  episodesWatched: number;
  rewatchCount: number;
  startedAt: Date | null;
  completedAt: Date | null;
  notes: string | null;
  isPrivate: boolean;
}

interface AnimeDetailTabsProps {
  anime: AnimeData;
  characters: CharacterRoster[];
  episodes: EpisodeData[];
  recommendations: RecommendationItem[];
  tracking: TrackingData | null;
  userId?: string;
}

type Tab = 'overview' | 'episodes';

export default function AnimeDetailTabs({
  anime,
  characters,
  episodes,
  recommendations,
  tracking,
  userId,
}: AnimeDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const tabBarRef = useRef<HTMLDivElement>(null);
  const [isSticky, setIsSticky] = useState(false);

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

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'overview', label: 'Overview', icon: <MessageSquare size={14} /> },
    { key: 'episodes', label: 'Episodes', icon: <Play size={14} />, count: episodes.length || anime.episodes || undefined },
  ];

  return (
    <div>
      {/* Sentinel div for sticky detection */}
      <div ref={tabBarRef} className="h-0" />

      {/* Sticky Tab Bar */}
      <div
        className={`sticky top-[64px] z-30 transition-all duration-200 ${
          isSticky
            ? 'bg-[rgba(5,5,10,0.92)] backdrop-blur-xl border-b border-border-subtle shadow-lg -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8'
            : ''
        }`}
      >
        <div className="flex gap-1 py-3">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab === tab.key
                  ? 'bg-accent-violet text-white shadow-[0_0_12px_rgba(124,91,255,0.4)]'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-white/20' : 'bg-surface-3 text-text-muted'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <OverviewTab anime={anime} characters={characters} recommendations={recommendations} tracking={tracking} />
        )}
        {activeTab === 'episodes' && (
          <EpisodesTab episodes={episodes} anime={anime} tracking={tracking} userId={userId} />
        )}
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({
  anime,
  characters,
  recommendations,
  tracking,
}: {
  anime: AnimeData;
  characters: CharacterRoster[];
  recommendations: RecommendationItem[];
  tracking: TrackingData | null;
}) {
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const synopsis = anime.synopsis || 'No description available.';
  const isTruncatable = synopsis.length > 400;
  const displaySynopsis = isTruncatable && !synopsisExpanded
    ? synopsis.slice(0, 400) + '…'
    : synopsis;

  return (
    <div className="space-y-8">
      {/* Synopsis */}
      <section className="glass-panel border border-border-default rounded-2xl p-6 space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-black text-text-primary uppercase tracking-widest">
          <MessageSquare size={14} className="text-accent-violet" /> Synopsis
        </h2>
        <p className="text-sm text-text-secondary leading-relaxed">
          {displaySynopsis}
        </p>
        {isTruncatable && (
          <button
            onClick={() => setSynopsisExpanded(!synopsisExpanded)}
            className="text-xs text-accent-violet hover:underline font-medium"
          >
            {synopsisExpanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </section>

      {/* Characters */}
      {characters.length > 0 && (
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-black text-text-primary uppercase tracking-widest border-b border-border-subtle pb-3">
            <Users size={14} className="text-accent-violet" /> Characters & Voice Actors
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {characters.slice(0, 8).map((c) => {
              const jpVA = c.voice_actors.find((va) => va.language === 'Japanese');
              return (
                <div
                  key={c.character.mal_id}
                  className="flex items-center justify-between bg-surface-2 border border-border-subtle rounded-xl p-3 hover:border-border-emphasis transition-colors"
                >
                  {/* Character */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-3 border border-border-subtle flex-shrink-0">
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
                      <p className="text-[10px] text-text-muted capitalize">{c.role}</p>
                    </div>
                  </div>

                  <ArrowRight size={12} className="text-text-disabled flex-shrink-0 mx-2" />

                  {/* VA */}
                  {jpVA ? (
                    <div className="flex items-center gap-2.5 min-w-0 text-right">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-text-primary truncate">{jpVA.person.name}</p>
                        <p className="text-[10px] text-accent-violet">JP VA</p>
                      </div>
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-3 border border-border-subtle flex-shrink-0">
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
                  ) : (
                    <span className="text-[10px] text-text-disabled">N/A</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-black text-text-primary uppercase tracking-widest border-b border-border-subtle pb-3">
            <Heart size={14} className="text-accent-sakura" /> You May Also Like
          </h2>
          <div className="flex gap-3 overflow-x-auto rail-scroll pb-2">
            {recommendations.slice(0, 12).map((r) => (
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
                <p className="mt-1.5 text-[11px] font-semibold text-text-secondary line-clamp-2 leading-tight group-hover:text-accent-violet transition-colors">
                  {r.entry.title}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Episodes Tab ─────────────────────────────────────────────────────────────
function EpisodesTab({
  episodes,
  anime,
  tracking,
  userId,
}: {
  episodes: EpisodeData[];
  anime: AnimeData;
  tracking: TrackingData | null;
  userId?: string;
}) {
  const [filter, setFilter] = useState<'all' | 'watched' | 'unwatched'>('all');
  const episodesWatched = tracking?.episodesWatched || 0;

  const filtered = filter === 'all'
    ? episodes
    : filter === 'watched'
      ? episodes.filter((ep) => ep.mal_id <= episodesWatched)
      : episodes.filter((ep) => ep.mal_id > episodesWatched);

  if (!episodes.length) {
    return (
      <div className="glass-panel border border-border-default rounded-2xl p-10 text-center">
        <Play size={40} className="text-text-disabled mx-auto mb-3" />
        <p className="text-text-muted text-sm">
          {anime.status === 'Not yet aired'
            ? 'This anime has not aired yet.'
            : 'Episode list is not available for this title.'}
        </p>
      </div>
    );
  }

  // Progress summary
  const totalEps = episodes.length || anime.episodes || 0;
  const pct = totalEps > 0 ? Math.round((episodesWatched / totalEps) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      {userId && totalEps > 0 && (
        <div className="glass-panel border border-border-default rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-text-primary">{episodesWatched} / {totalEps} watched</span>
            <span className="text-accent-violet font-bold">{pct}%</span>
          </div>
          <Progress value={episodesWatched} max={totalEps} variant="violet" size="sm" />
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1">
        {(['all', 'watched', 'unwatched'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${
              filter === f
                ? 'bg-surface-3 text-text-primary border border-border-default'
                : 'text-text-muted hover:text-text-secondary hover:bg-surface-2'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Episode list */}
      <div className="space-y-1.5 max-h-[600px] overflow-y-auto no-scrollbar">
        {filtered.map((ep) => {
          const isWatched = ep.mal_id <= episodesWatched;
          return (
            <Link
              key={ep.mal_id}
              href={`/watch/${anime.mal_id}/${ep.mal_id}` as '/'}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors hover:bg-surface-3/50 ${
                isWatched
                  ? 'bg-surface-2/50 border-border-subtle opacity-70'
                  : 'bg-surface-2 border-border-subtle hover:border-border-emphasis'
              }`}
            >
              {/* Episode number */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${
                isWatched
                  ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                  : 'bg-surface-3 text-text-muted border border-border-subtle'
              }`}>
                {isWatched ? <Check size={14} /> : ep.mal_id}
              </div>

              {/* Title & date */}
              <div className="flex-grow min-w-0">
                <p className={`text-xs font-semibold truncate ${isWatched ? 'text-text-muted' : 'text-text-primary'}`}>
                  {ep.title || `Episode ${ep.mal_id}`}
                </p>
                {ep.aired && (
                  <p className="text-[10px] text-text-disabled flex items-center gap-1 mt-0.5">
                    <Calendar size={9} />
                    {new Date(ep.aired).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                )}
              </div>

              {/* Badges */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {ep.filler && <Badge variant="warning" size="xs">Filler</Badge>}
                {ep.recap && <Badge variant="ghost" size="xs">Recap</Badge>}
                {ep.score && (
                  <div className="flex items-center gap-0.5 text-[10px] font-bold text-accent-gold">
                    <Star size={10} fill="currentColor" />
                    {ep.score.toFixed(1)}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
