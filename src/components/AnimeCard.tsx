'use client';

import React, { useState } from 'react';
import { Link, useRouter } from '@/navigation';
import { AnimeData } from '@/services/jikan';
import { Star, Plus, Play, Check, Loader2 } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { useSession } from 'next-auth/react';
import { useWatchlistStore } from '@/store/useWatchlistStore';
import { getEpisodeDisplay } from '@/lib/episode';

interface AnimeCardProps {
  anime: AnimeData;
  rank?: number;
  variant?: 'standard' | 'large' | 'wide';
  onAddToList?: (anime: AnimeData) => void;
}

const HINDI_FAVORITE_KEYWORDS = [
  'naruto', 'demon slayer', 'jujutsu', 'hero academia', 'death note',
  'attack on titan', 'one piece', 'dragon ball', 'pokemon', 'doraemon',
  'shin-chan', 'shin chan', 'crayon', 'hunter x hunter', 'detective conan',
  'avatar', 'blue lock', 'chainsaw man', 'solo leveling', 'tokyo revengers',
  'black clover', 'haikyu'
];

const hasHindiDub = (title: string, malId: number) => {
  const t = title.toLowerCase();
  return HINDI_FAVORITE_KEYWORDS.some(keyword => t.includes(keyword)) || [20, 1535, 21, 38000, 40748, 31964, 16498].includes(malId);
};

export default function AnimeCard({ anime, rank, variant = 'standard', onAddToList }: AnimeCardProps) {
  const cardAnime = anime as any;
  const title = anime.title_english || anime.title;
  const score = anime.score ? anime.score.toFixed(1) : null;
  const isHindiDubbed = cardAnime.is_hindi_dubbed || hasHindiDub(title, anime.mal_id);
  const isTamilDubbed = cardAnime.is_tamil_dubbed;
  const isTeluguDubbed = cardAnime.is_telugu_dubbed;

  const router = useRouter();
  const { data: session } = useSession();
  const { entries, upsertEntry, deleteEntry } = useWatchlistStore();
  const [listLoading, setListLoading] = useState(false);

  const isLoggedIn = !!session;
  const listEntry = entries[String(anime.mal_id)];
  const hasEntry = !!listEntry;

  // Toggle watchlist logic
  const handleToggleWatchlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn) {
      router.push('/login');
      return;
    }

    setListLoading(true);
    try {
      if (hasEntry) {
        await deleteEntry(String(anime.mal_id));
      } else {
        await upsertEntry({
          animeId: String(anime.mal_id),
          animeTitle: title,
          animeImage: anime.images.webp.large_image_url || anime.images.jpg.large_image_url,
          animeEpisodes: anime.episodes,
          status: 'planning',
        });
      }
    } catch (err) {
      console.error('Failed to toggle library item:', err);
    } finally {
      setListLoading(false);
    }
  };

  const handleQuickPlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const episode = listEntry ? listEntry.episodesWatched + 1 : 1;
    router.push(`/watch/${anime.mal_id}/${episode}` as '/');
  };

  // Watched percentage
  const watchedPct = hasEntry && anime.episodes && listEntry.episodesWatched
    ? Math.round((listEntry.episodesWatched / anime.episodes) * 100)
    : 0;

  // 1. WIDE VARIANT: Landscape Bento Card (Spans 2 columns x 1 row)
  if (variant === 'wide') {
    return (
      <div className="group/card relative flex flex-col h-full transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] col-span-2 shadow-md hover:shadow-xl rounded-xl">
        <Link
          href={`/anime/${anime.mal_id}`}
          className="flex h-full rounded-xl overflow-hidden bg-surface-2 border border-border-subtle hover:border-accent-violet/40 transition-all duration-300 glow-violet-hover"
        >
          {/* Left: Poster */}
          <div className="relative w-[32%] sm:w-[30%] flex-shrink-0 overflow-hidden bg-surface-3 h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={anime.images.webp.large_image_url || anime.images.jpg.large_image_url}
              alt={title}
              className="w-full h-full object-cover group-hover/card:scale-[1.05] transition-transform duration-500 ease-out"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            {rank && (
              <div className="absolute top-2 left-2 z-10 w-7.5 h-7.5 rounded-lg bg-accent-violet flex items-center justify-center text-[11px] font-semibold text-white shadow-lg">
                #{rank}
              </div>
            )}
          </div>

          {/* Right: Detailed Info */}
          <div className="flex-grow p-4 sm:p-5 flex flex-col justify-between overflow-hidden">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {score && (
                  <div className="flex items-center gap-1 bg-accent-gold/15 border border-accent-gold/20 rounded-md px-1.5 py-0.5 shadow-sm">
                    <Star size={9} fill="currentColor" className="text-accent-gold" />
                    <span className="text-[10px] font-black text-accent-gold">{score}</span>
                  </div>
                )}
                {isHindiDubbed && (
                  <span className="text-[9px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded bg-orange-600/20 text-orange-400 border border-orange-500/30">
                    Hindi Dub
                  </span>
                )}
                {anime.year && (
                  <span className="text-[10px] font-bold text-text-muted">
                    {anime.year}
                  </span>
                )}
              </div>
              <h3 className="text-xs sm:text-sm md:text-base font-black text-text-primary line-clamp-1 sm:line-clamp-2 leading-snug group-hover/card:text-accent-violet transition-colors duration-200">
                {title}
              </h3>
              <p className="hidden sm:block text-[11px] text-text-muted line-clamp-2 sm:line-clamp-3 leading-relaxed font-medium">
                {anime.synopsis || 'No description available.'}
              </p>
            </div>
            <div className="flex items-center justify-between text-[10px] sm:text-xs text-text-secondary mt-2 flex-wrap gap-2 border-t border-border-subtle/50 pt-2">
              <span className="font-semibold text-text-muted">
                {anime.type || 'TV'} · {getEpisodeDisplay({ title, episodes: anime.episodes, malId: anime.mal_id })}
                {hasEntry && ` · Watched ${listEntry.episodesWatched}`}
              </span>
              {anime.studios && anime.studios.length > 0 && (
                <span className="font-black text-accent-violet truncate max-w-[120px] uppercase tracking-wider text-[10px]">
                  {anime.studios[0].name}
                </span>
              )}
            </div>
          </div>
        </Link>
      </div>
    );
  }

  // 2. LARGE VARIANT: Tall Bento Featured Card (Spans 2 columns x 2 rows)
  if (variant === 'large') {
    return (
      <div className="group/card relative flex flex-col h-full transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] col-span-2 row-span-2 shadow-lg hover:shadow-2xl rounded-xl">
        <Link
          href={`/anime/${anime.mal_id}`}
          className="block relative w-full h-full rounded-xl overflow-hidden bg-surface-2 border border-border-subtle hover:border-accent-violet/40 transition-all duration-300 glow-violet-hover min-h-[350px]"
        >
          <div className="absolute inset-0 w-full h-full overflow-hidden bg-surface-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={anime.images.webp.large_image_url || anime.images.jpg.large_image_url}
              alt={title}
              className="w-full h-full object-cover group-hover/card:scale-[1.04] transition-transform duration-700 ease-out"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#05050A] via-[#05050A]/70 to-[#05050A]/20 opacity-95" />
          </div>

          {rank && (
            <div className="absolute top-4 left-4 z-10 w-9.5 h-9.5 rounded-xl bg-accent-violet flex items-center justify-center text-xs font-semibold text-white shadow-lg">
              #{rank}
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 space-y-3 z-20 flex flex-col justify-end h-full">
            <div className="flex items-center gap-2 flex-wrap">
              {score && (
                <div className="flex items-center gap-1 bg-accent-gold/25 border border-accent-gold/45 rounded-md px-2 py-0.5 shadow-sm">
                  <Star size={10} fill="currentColor" className="text-accent-gold" />
                  <span className="text-[11px] font-black text-accent-gold">{score}</span>
                </div>
              )}
              {isHindiDubbed && (
                <span className="bg-orange-600/20 border border-orange-500/30 text-orange-400 px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider uppercase backdrop-blur-sm">
                  Hindi Dub
                </span>
              )}
              {anime.year && (
                <span className="text-[11px] font-bold text-white/60">
                  {anime.year}
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-xl md:text-2xl font-black text-white line-clamp-2 leading-tight group-hover/card:text-accent-violet transition-colors">
              {title}
            </h3>
            <p className="text-[11px] sm:text-xs text-text-secondary line-clamp-3 sm:line-clamp-4 leading-relaxed font-medium max-w-[90%] opacity-90">
              {anime.synopsis || 'No description available.'}
            </p>
            <div className="flex items-center justify-between text-xs text-text-secondary pt-2.5 border-t border-white/10 mt-1">
              <span className="font-semibold text-white/70">
                {anime.type || 'TV'} · {getEpisodeDisplay({ title, episodes: anime.episodes, malId: anime.mal_id })}
                {hasEntry && ` · Watched ${listEntry.episodesWatched}`}
              </span>
              {anime.studios && anime.studios.length > 0 && (
                <span className="font-black text-accent-violet uppercase tracking-wider text-[10px] sm:text-[11px]">
                  {anime.studios[0].name}
                </span>
              )}
            </div>
          </div>
        </Link>
      </div>
    );
  }

  // 3. STANDARD VARIANT: Vertical card with slide-up overlays
  return (
    <div className="group relative w-full select-none flex flex-col h-full bg-bg-secondary/40 border border-border-subtle rounded-2xl overflow-hidden hover:border-[#7c3aed]/40 hover:shadow-[0_8px_24px_rgba(124,58,237,0.1)] hover:-translate-y-1 transition-all duration-300">
      <Link href={`/anime/${anime.mal_id}`} className="w-full flex-1 flex flex-col">
        {/* Poster Container */}
        <div className="relative aspect-[2/3] w-full overflow-hidden bg-bg-elevated/20">
          {/* Poster Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={anime.images.webp.large_image_url || anime.images.jpg.large_image_url}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
            loading="lazy"
            referrerPolicy="no-referrer"
          />

          {/* Dynamic Progress Bar overlay */}
          {watchedPct > 0 && (
            <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20">
              <div
                className="h-full bg-gradient-to-r from-[#7c3aed] to-[#ec4899] transition-all duration-300"
                style={{ width: `${watchedPct}%` }}
              />
            </div>
          )}

          {/* Quick Play & Library Action Overlay on Hover */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
            {/* Quick Play */}
            <button
              onClick={handleQuickPlay}
              className="w-10 h-10 rounded-full bg-accent-violet hover:bg-[#6b4ae6] text-white flex items-center justify-center shadow-lg transition-transform duration-200 hover:scale-105"
              title="Quick Play"
            >
              <Play size={15} fill="white" className="ml-0.5" />
            </button>

            {/* Quick Library Toggle */}
            <button
              onClick={handleToggleWatchlist}
              disabled={listLoading}
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105 ${
                hasEntry
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : 'bg-white/10 hover:bg-white/20 border border-white/20 text-white'
              }`}
              title={hasEntry ? 'In Library (Click to Remove)' : 'Add to Plan to Watch'}
            >
              {listLoading ? (
                <Loader2 size={13} className="animate-spin text-white" />
              ) : hasEntry ? (
                <Check size={14} strokeWidth={2.5} />
              ) : (
                <Plus size={14} strokeWidth={2.5} />
              )}
            </button>
          </div>

          {/* Episodes Badge */}
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-bg-primary/75 text-text-primary text-[9px] font-black z-10 backdrop-blur-sm">
            {getEpisodeDisplay({ title, episodes: anime.episodes, malId: anime.mal_id })}
          </div>

          {/* Lang badge (SUB / DUB) */}
          <div className="absolute bottom-2 right-2 z-10">
            {isHindiDubbed ? (
              <span className="text-[7.5px] font-black uppercase tracking-wider px-1 py-0.2 rounded bg-orange-600/80 text-white backdrop-blur-sm">
                Hindi
              </span>
            ) : isTeluguDubbed || isTamilDubbed ? (
              <span className="text-[7.5px] font-black uppercase tracking-wider px-1 py-0.2 rounded bg-accent-pink/80 text-white backdrop-blur-sm">
                Dub
              </span>
            ) : (
              <span className="text-[7.5px] font-black uppercase tracking-wider px-1 py-0.2 rounded bg-accent-cyan/80 text-white backdrop-blur-sm">
                Sub
              </span>
            )}
          </div>

          {/* Rank overlay badge */}
          {rank && (
            <div className="absolute bottom-2 left-2 z-10 w-7.5 h-7.5 rounded-lg bg-accent-violet text-white text-[11px] font-semibold flex items-center justify-center shadow-lg">
              #{rank}
            </div>
          )}
        </div>

        {/* Text Area */}
        <div className="p-3 flex flex-col justify-between flex-1 min-h-[62px]">
          <h3 className="font-display font-semibold text-xs text-text-primary line-clamp-2 leading-tight group-hover:text-accent-primary transition-colors duration-200">
            {title}
          </h3>

          <div className="flex items-center justify-between text-[9px] text-text-secondary mt-1.5 border-t border-border-subtle/30 pt-1.5">
            <span className="uppercase font-extrabold tracking-wider">{anime.type || 'TV'}</span>
            <div className="flex items-center gap-1.5">
              {score && (
                <span className="flex items-center gap-0.5 text-accent-gold font-extrabold">
                  <Star size={9} fill="currentColor" /> {score}
                </span>
              )}
              <span className="text-text-muted">·</span>
              <span className="font-medium text-text-muted">{anime.year || 'Ongoing'}</span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
