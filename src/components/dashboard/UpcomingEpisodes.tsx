'use client';

import React from 'react';
import AnimeCarousel from './AnimeCarousel';
import AnimeCard from '@/components/AnimeCard';
import { AnimeData } from '@/services/jikan';
import { Calendar } from 'lucide-react';

interface UpcomingEpisodesProps {
  items: AnimeData[];
}

export default function UpcomingEpisodes({ items }: UpcomingEpisodesProps) {
  if (!items || items.length === 0) return null;

  return (
    <AnimeCarousel title="Upcoming Episodes" icon={<Calendar size={16} />} viewAllHref="/search?status=upcoming">
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
