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

export default function AnimeCard({ anime, rank, variant = 'standard', onAddToList }: AnimeCardProps) {
  const title = anime.title_english || anime.title;
  const score = anime.score ? anime.score.toFixed(1) : null;
  const statusInfo = STATUS_BADGE_MAP[anime.status || ''] || null;

  // 1. WIDE VARIANT: Landscape Bento Card (Spans 2 columns x 1 row)
  if (variant === 'wide') {
    return (
      <div className="group/card relative flex flex-col h-full transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] col-span-2 shadow-md hover:shadow-xl rounded-xl">
        <Link
          href={`/anime/${anime.mal_id}`}
          className="flex h-full rounded-xl overflow-hidden bg-surface-2 border border-border-subtle hover:border-accent-violet/40 transition-all duration-300 glow-violet-hover"
        >
          {/* Left: Poster */}
          <div className="relative w-1/3 aspect-[3/4] flex-shrink-0 overflow-hidden bg-surface-3">
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
          <div className="flex-grow p-3 sm:p-4 flex flex-col justify-between overflow-hidden">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                {statusInfo && (
                  <Badge variant={statusInfo.variant} size="xs">
                    {statusInfo.label}
                  </Badge>
                )}
                {score && (
                  <div className="flex items-center gap-1 bg-[rgba(0,0,0,0.65)] backdrop-blur-sm rounded px-1.5 py-0.5">
                    <Star size={8} fill="currentColor" className="text-accent-gold" />
                    <span className="text-[9px] font-bold text-text-primary">{score}</span>
                  </div>
                )}
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-text-primary line-clamp-2 leading-snug group-hover/card:text-accent-violet transition-colors duration-200">
                {title}
              </h3>
              <p className="hidden sm:block text-[10px] sm:text-[11px] text-text-muted line-clamp-2 sm:line-clamp-3 leading-relaxed">
                {anime.synopsis || 'No description available.'}
              </p>
            </div>
            <div className="flex items-center justify-between text-[10px] text-text-secondary mt-1 flex-wrap gap-1 border-t border-border-subtle pt-1.5">
              <span>{anime.type || 'TV'} · {anime.episodes ? `${anime.episodes} ep` : 'Ongoing'}</span>
              {anime.studios && anime.studios.length > 0 && (
                <span className="font-bold text-accent-violet truncate max-w-[100px] uppercase tracking-wider text-[9px]">
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
          className="block relative h-full rounded-xl overflow-hidden bg-surface-2 border border-border-subtle hover:border-accent-violet/40 transition-all duration-300 glow-violet-hover"
        >
          <div className="relative w-full h-full min-h-[350px] aspect-[3/4]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={anime.images.webp.large_image_url || anime.images.jpg.large_image_url}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover group-hover/card:scale-[1.05] transition-transform duration-500 ease-out"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            {/* Ambient gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#05050A] via-[#05050A]/40 to-transparent opacity-95" />
            
            {/* Top badges */}
            <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1">
              {statusInfo && (
                <Badge variant={statusInfo.variant} size="xs">
                  {statusInfo.label}
                </Badge>
              )}
            </div>
            {rank && (
              <div className="absolute top-3 left-3 z-10 w-8 h-8 rounded-lg bg-accent-violet flex items-center justify-center text-xs font-black text-white shadow-lg">
                {rank}
              </div>
            )}

            {/* Bottom details block */}
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 space-y-2 z-20">
              <div className="flex items-center gap-2">
                {score && (
                  <div className="flex items-center gap-1 bg-accent-gold/20 border border-accent-gold/30 rounded px-2 py-0.5">
                    <Star size={10} fill="currentColor" className="text-accent-gold" />
                    <span className="text-[11px] font-bold text-accent-gold">{score}</span>
                  </div>
                )}
                <span className="bg-white/10 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide text-white uppercase">
                  {anime.rating ? anime.rating.split(' ')[0] : 'TV-14'}
                </span>
              </div>
              <h3 className="text-sm sm:text-lg md:text-xl font-black text-white line-clamp-2 leading-tight group-hover/card:text-accent-violet transition-colors">
                {title}
              </h3>
              <p className="text-[11px] sm:text-xs text-text-secondary line-clamp-3 leading-relaxed opacity-85">
                {anime.synopsis || 'No description available.'}
              </p>
              <div className="flex items-center justify-between text-xs text-text-muted pt-1 border-t border-white/10">
                <span>{anime.type || 'TV'} · {anime.episodes ? `${anime.episodes} ep` : 'Ongoing'}</span>
                {anime.studios && anime.studios.length > 0 && (
                  <span className="font-bold text-accent-violet uppercase tracking-wider text-[10px]">
                    {anime.studios[0].name}
                  </span>
                )}
              </div>
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
          <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1">
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
