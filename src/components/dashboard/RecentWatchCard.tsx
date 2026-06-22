'use client';

import React from 'react';
import { Link } from '@/navigation';
import { Play } from 'lucide-react';

interface RecentWatchCardProps {
  entry: {
    animeId: string;
    animeTitle: string;
    animeImage: string;
    episode: number;
    completedAt: string; // Relative time (e.g. "2 hours ago", "Yesterday")
  };
}

export default function RecentWatchCard({ entry }: RecentWatchCardProps) {
  return (
    <Link
      href={`/watch/${entry.animeId}/${entry.episode}` as '/'}
      className="flex items-center gap-3 p-2.5 rounded-2xl bg-bg-secondary/40 border border-border-subtle hover:border-accent-violet/30 hover:bg-bg-elevated/30 transition-all duration-200 group"
    >
      {/* Thumbnail */}
      <div className="relative w-16 h-10 sm:w-20 sm:h-12 rounded-lg overflow-hidden bg-bg-elevated flex-shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={entry.animeImage}
          alt={entry.animeTitle}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/25 flex items-center justify-center group-hover:bg-black/40 transition-colors">
          <Play size={10} fill="white" className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <h4 className="text-xs font-bold text-text-primary truncate group-hover:text-accent-primary transition-colors">
          {entry.animeTitle}
        </h4>
        <p className="text-[10px] text-text-secondary mt-0.5 font-medium">
          Episode {entry.episode}
        </p>
      </div>

      {/* Relative Time */}
      <div className="text-[9px] text-text-muted font-semibold pr-1">
        {entry.completedAt}
      </div>
    </Link>
  );
}
