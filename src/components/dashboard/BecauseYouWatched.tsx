'use client';

import React from 'react';
import AnimeCarousel from './AnimeCarousel';
import AnimeCard from '@/components/AnimeCard';
import { AnimeData } from '@/services/jikan';
import { Eye } from 'lucide-react';

interface BecauseYouWatchedProps {
  animeTitle: string;
  items: AnimeData[];
}

export default function BecauseYouWatched({ animeTitle, items }: BecauseYouWatchedProps) {
  if (!items || items.length === 0 || !animeTitle) return null;

  return (
    <AnimeCarousel
      title={`Because You Watched ${animeTitle}`}
      icon={<Eye size={16} />}
      viewAllHref="/profile"
    >
      {items.map((anime, index) => (
        <div key={`${anime.mal_id}-${index}`} className="snap-start">
          <div className="w-36 sm:w-40 md:w-44">
            <AnimeCard anime={anime} />
          </div>
        </div>
      ))}
    </AnimeCarousel>
  );
}
