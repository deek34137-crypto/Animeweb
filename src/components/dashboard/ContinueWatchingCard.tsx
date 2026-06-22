'use client';

import React from 'react';
import { Link } from '@/navigation';
import { Play, Clock } from 'lucide-react';

interface ContinueWatchingCardProps {
  entry: {
    animeId: string;
    animeTitle: string;
    animeImage: string;
    animeEpisodes?: number | null;
    episodesWatched: number;
    percentageComplete?: number;
    remainingMinutes?: number;
    lastWatchedAt?: string;
  };
}

export default function ContinueWatchingCard({ entry }: ContinueWatchingCardProps) {
  const pct = entry.percentageComplete !== undefined ? entry.percentageComplete : 0;
  const remaining = entry.remainingMinutes;

  return (
    <Link
      href={`/watch/${entry.animeId}/${entry.episodesWatched}` as '/'}
      className="flex-shrink-0 w-40 sm:w-44 group block"
    >
      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-bg-elevated border border-border-subtle group-hover:border-accent-violet/40 transition-all duration-300 shadow-md group-hover:shadow-accent-violet/10 group-hover:shadow-lg">
        {/* Poster Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={entry.animeImage}
          alt={entry.animeTitle}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        {/* Gradient Overlay — stronger at the bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />

        {/* Play Icon Trigger */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="w-12 h-12 rounded-full bg-accent-violet/90 backdrop-blur-sm flex items-center justify-center text-white shadow-lg shadow-accent-violet/40 scale-90 group-hover:scale-100 transition-transform duration-200">
            <Play size={16} fill="currentColor" className="ml-0.5" />
          </div>
        </div>

        {/* Bottom Metadata Info */}
        <div className="absolute bottom-0 inset-x-0 p-3 space-y-2">
          {/* Title */}
          <p className="text-[10px] font-bold text-white truncate leading-tight">
            {entry.animeTitle}
          </p>

          {/* Episode info row */}
          <div className="flex items-center justify-between gap-1">
            <p className="text-[9px] text-white/70 font-semibold">
              Ep {entry.episodesWatched}
              {entry.animeEpisodes ? (
                <span className="text-white/40"> / {entry.animeEpisodes}</span>
              ) : null}
            </p>
            {remaining !== undefined && remaining > 0 && (
              <div className="flex items-center gap-0.5 text-[8px] text-white/50 font-medium">
                <Clock size={8} />
                <span>{remaining}m left</span>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {pct > 0 && (
            <div className="h-1 bg-white/15 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-violet rounded-full shadow-[0_0_6px_rgba(124,91,255,0.9)] transition-all duration-300"
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
