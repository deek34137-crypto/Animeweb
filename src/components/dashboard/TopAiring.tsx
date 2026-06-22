'use client';

import React from 'react';
import AnimeCarousel from './AnimeCarousel';
import AnimeCard from '@/components/AnimeCard';
import { AnimeData } from '@/services/jikan';
import { Tv } from 'lucide-react';

interface TopAiringProps {
  items: AnimeData[];
}

export default function TopAiring({ items }: TopAiringProps) {
  if (!items || items.length === 0) return null;

  return (
    <AnimeCarousel title="Top Airing" icon={<Tv size={16} />} viewAllHref="/search?status=airing">
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
