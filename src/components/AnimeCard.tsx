'use client';

import React from 'react';
import { Link } from '@/navigation';
import { AnimeData } from '@/services/jikan';
import { Star, Plus, Play } from 'lucide-react';
import Badge from '@/components/ui/Badge';

interface AnimeCardProps {
  anime: AnimeData;
  rank?: number;
  onAddToList?: (anime: AnimeData) => void;
}

const STATUS_BADGE_MAP: Record<string, { variant: 'cyan' | 'gold' | 'sakura' | 'success' | 'default'; label: string }> = {
  'Currently Airing': { variant: 'cyan', label: 'Airing' },
  'Not yet aired': { variant: 'gold', label: 'Upcoming' },
  'Finished Airing': { variant: 'default', label: 'Finished' },
};

export default function AnimeCard({ anime, rank, onAddToList }: AnimeCardProps) {
  const title = anime.title_english || anime.title;
  const score = anime.score ? anime.score.toFixed(1) : null;
  const statusInfo = STATUS_BADGE_MAP[anime.status || ''] || null;

  return (
    <div className="group relative flex flex-col">
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

          {/* Top-right badges */}
          <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1">
            {statusInfo && (
              <Badge variant={statusInfo.variant} size="xs">
                {statusInfo.label}
              </Badge>
            )}
          </div>

          {/* Score badge */}
          {score && (
            <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 bg-[rgba(0,0,0,0.65)] backdrop-blur-sm rounded-lg px-2 py-0.5">
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
        </div>

        {/* Info */}
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
