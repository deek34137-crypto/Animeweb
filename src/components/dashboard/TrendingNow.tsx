'use client';

import React from 'react';
import AnimeCarousel from './AnimeCarousel';
import AnimeCard from '@/components/AnimeCard';
import { AnimeData } from '@/services/jikan';
import { Flame } from 'lucide-react';

interface TrendingNowProps {
  items: AnimeData[];
}

export default function TrendingNow({ items }: TrendingNowProps) {
  if (!items || items.length === 0) return null;

  return (
    <AnimeCarousel title="Trending Now" icon={<Flame size={16} />} viewAllHref="/search?sort=trending">
      {items.map((anime, index) => (
        <div key={`${anime.mal_id}-${index}`} className="snap-start">
          <div className="w-36 sm:w-40 md:w-44">
            <AnimeCard anime={anime} rank={index + 1} />
          </div>
        </div>
      ))}
    </AnimeCarousel>
  );
}
