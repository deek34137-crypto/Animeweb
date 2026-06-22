'use client';

import React from 'react';
import AnimeCarousel from './AnimeCarousel';
import AnimeCard from '@/components/AnimeCard';
import { AnimeData } from '@/services/jikan';
import { Clock } from 'lucide-react';

interface RecentlyUpdatedProps {
  items: AnimeData[];
}

export default function RecentlyUpdated({ items }: RecentlyUpdatedProps) {
  if (!items || items.length === 0) return null;

  return (
    <AnimeCarousel title="New Episodes Today" icon={<Clock size={16} />} viewAllHref="/search?season=current">
      {items.map((anime, index) => (
        <div key={`${anime.mal_id}-${index}`} className="snap-start">
          <div className="w-36 sm:w-40 md:w-44">
            {/* Custom variant of standard AnimeCard showing latest ep */}
            <AnimeCard anime={anime} />
          </div>
        </div>
      ))}
    </AnimeCarousel>
  );
}
