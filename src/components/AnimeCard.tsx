'use client';

import React from 'react';
import { Link } from '@/navigation';
import { AnimeData } from '@/services/jikan';
import { Star, Plus, Play } from 'lucide-react';
import Badge from '@/components/ui/Badge';

interface AnimeCardProps {
  anime: AnimeData;
  rank?: number;
  variant?: 'standard' | 'large' | 'wide';
  onAddToList?: (anime: AnimeData) => void;
}

const STATUS_BADGE_MAP: Record<string, { variant: 'cyan' | 'gold' | 'sakura' | 'success' | 'default'; label: string }> = {
  'Currently Airing': { variant: 'cyan', label: 'Airing' },
  'Not yet aired': { variant: 'gold', label: 'Upcoming' },
  'Finished Airing': { variant: 'default', label: 'Finished' },
};

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
  const title = anime.title_english || anime.title;
  const score = anime.score ? anime.score.toFixed(1) : null;
  const statusInfo = STATUS_BADGE_MAP[anime.status || ''] || null;
  const isHindiDubbed = hasHindiDub(title, anime.mal_id);

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
            {/* Rank badge */}
            {rank && (
              <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded bg-accent-violet flex items-center justify-center text-[10px] font-black text-white shadow-lg">
                {rank}
              </div>
            )}
          </div>

          {/* Right: Detailed Info */}
          <div className="flex-grow p-4 sm:p-5 flex flex-col justify-between overflow-hidden">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {statusInfo && (
                  <Badge variant={statusInfo.variant} size="xs">
                    {statusInfo.label}
                  </Badge>
                )}
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
              <span className="font-semibold text-text-muted">{anime.type || 'TV'} · {anime.episodes ? `${anime.episodes} ep` : 'Ongoing'}</span>
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
          {/* Background Image Container */}
          <div className="absolute inset-0 w-full h-full overflow-hidden bg-surface-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={anime.images.webp.large_image_url || anime.images.jpg.large_image_url}
              alt={title}
              className="w-full h-full object-cover group-hover/card:scale-[1.04] transition-transform duration-700 ease-out"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            {/* Ambient gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#05050A] via-[#05050A]/70 to-[#05050A]/20 opacity-95" />
          </div>
          
          {/* Top badges */}
          <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-1">
            {statusInfo && (
              <Badge variant={statusInfo.variant} size="xs">
                {statusInfo.label}
              </Badge>
            )}
          </div>
          {rank && (
            <div className="absolute top-4 left-4 z-10 w-8 h-8 rounded-lg bg-accent-violet flex items-center justify-center text-xs font-black text-white shadow-[0_0_15px_rgba(124,91,255,0.4)]">
              {rank}
            </div>
          )}

          {/* Bottom details block */}
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 space-y-3 z-20 flex flex-col justify-end h-full">
            <div className="flex items-center gap-2 flex-wrap">
              {score && (
                <div className="flex items-center gap-1 bg-accent-gold/25 border border-accent-gold/45 rounded-md px-2 py-0.5 shadow-sm">
                  <Star size={10} fill="currentColor" className="text-accent-gold" />
                  <span className="text-[11px] font-black text-accent-gold">{score}</span>
                </div>
              )}
              <span className="bg-white/10 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider text-white uppercase backdrop-blur-sm">
                {anime.rating ? anime.rating.split(' ')[0] : 'TV-14'}
              </span>
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
              <span className="font-semibold text-white/70">{anime.type || 'TV'} · {anime.episodes ? `${anime.episodes} ep` : 'Ongoing'}</span>
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

  // 3. STANDARD VARIANT: Vertical card with slide-up hover details
  return (
    <div className="group relative flex flex-col transition-all duration-300 hover:-translate-y-1 hover:scale-[1.03] shadow-sm hover:shadow-lg rounded-xl">
      <Link
        href={`/anime/${anime.mal_id}`}
        className="block relative rounded-xl overflow-hidden bg-surface-2 border border-border-subtle hover:border-accent-violet/40 transition-all duration-300 glow-violet-hover"
      >
        {/* Poster */}
        <div className="relative aspect-[3/4] w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={anime.images.webp.large_image_url || anime.images.jpg.large_image_url}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-500 ease-out"
            loading="lazy"
            referrerPolicy="no-referrer"
          />

          {/* Gradient overlay - darkens on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#05050A] via-[#05050A]/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-300" />

          {/* Hover Action Overlay */}
          <div className="absolute inset-0 bg-accent-violet/0 group-hover:bg-accent-violet/5 transition-colors duration-300" />

          {/* Rank badge */}
          {rank && (
            <div className="absolute top-2 left-2 z-10 w-7 h-7 rounded-lg bg-accent-violet flex items-center justify-center text-[11px] font-black text-white shadow-lg">
              {rank}
            </div>
          )}

          {/* Top-right status badges */}
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
            {isHindiDubbed && (
              <span className="text-[8px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded bg-orange-600/80 backdrop-blur-xs text-white shadow-md">
                Hindi
              </span>
            )}
            {statusInfo && (
              <Badge variant={statusInfo.variant} size="xs">
                {statusInfo.label}
              </Badge>
            )}
          </div>

          {/* Score badge */}
          {score && (
            <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-0.5">
              <Star size={10} fill="currentColor" className="text-accent-gold" />
              <span className="text-[11px] font-bold text-text-primary">{score}</span>
            </div>
          )}

          {/* Quick-add button — appears on hover */}
          {onAddToList && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAddToList(anime);
              }}
              className="absolute bottom-2 right-2 z-10 w-7 h-7 rounded-lg bg-accent-violet shadow-[0_0_12px_rgba(124,91,255,0.5)] flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200"
              aria-label={`Add ${title} to list`}
            >
              <Plus size={14} className="text-white" />
            </button>
          )}

          {/* Play icon overlay on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-accent-violet/80 backdrop-blur-sm flex items-center justify-center shadow-xl translate-y-2 group-hover:translate-y-0 transition-transform duration-200">
              <Play size={20} fill="white" className="text-white ml-0.5" />
            </div>
          </div>

          {/* Sliding Details Overlay on Hover */}
          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-[#05050A]/95 via-[#05050A]/90 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex flex-col gap-1.5 z-20">
            {/* Rating / Season */}
            <div className="flex items-center justify-between text-[9px] font-bold text-text-secondary">
              <span className="bg-white/10 px-1 py-0.5 rounded text-[8px] tracking-wide text-white uppercase">
                {anime.rating ? anime.rating.split(' ')[0] : 'TV-14'}
              </span>
              <span className="text-text-muted capitalize truncate max-w-[80px]">
                {anime.season ? `${anime.season} ${anime.year || ''}` : anime.year || 'Ongoing'}
              </span>
            </div>
            {/* Studio */}
            {anime.studios && anime.studios.length > 0 && (
              <p className="text-[9px] font-bold text-accent-violet uppercase tracking-wider truncate border-t border-white/5 pt-1.5">
                {anime.studios[0].name}
              </p>
            )}
          </div>
        </div>

        {/* Info Area below image (static) */}
        <div className="p-2.5 space-y-1">
          <h3 className="text-xs font-semibold text-text-primary line-clamp-2 leading-snug group-hover:text-accent-violet transition-colors duration-200">
            {title}
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              {anime.type || 'TV'}
            </span>
            <span className="text-[10px] text-text-muted">
              {anime.episodes ? `${anime.episodes} ep` : 'Ongoing'}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
