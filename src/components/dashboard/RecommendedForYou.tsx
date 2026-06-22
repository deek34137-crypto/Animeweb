'use client';

import React from 'react';
import AnimeCarousel from './AnimeCarousel';
import AnimeCard from '@/components/AnimeCard';
import { AnimeData } from '@/services/jikan';
import { Sparkles } from 'lucide-react';

interface RecommendedForYouProps {
  items: AnimeData[];
}

export default function RecommendedForYou({ items }: RecommendedForYouProps) {
  if (!items || items.length === 0) return null;

  return (
    <AnimeCarousel title="Recommended For You" icon={<Sparkles size={16} />} viewAllHref="/search?sort=trending">
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
