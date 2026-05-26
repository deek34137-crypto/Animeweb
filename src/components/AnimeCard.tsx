import React from 'react';
import { Link } from '@/navigation';
import { AnimeData } from '@/services/jikan';
import { Star } from 'lucide-react';

interface AnimeCardProps {
  anime: AnimeData;
}

export default function AnimeCard({ anime }: AnimeCardProps) {
  const title = anime.title_english || anime.title;
  const score = anime.score ? anime.score.toFixed(1) : 'N/A';
  const episodesCount = anime.episodes;
  const type = anime.type || 'TV';

  // Extract a couple of main languages (deterministic mock)
  const isDubbed = anime.mal_id % 3 === 0;
  const langBadge = isDubbed ? 'JP / EN' : 'JP';

  return (
    <Link
      href={`/anime/${anime.mal_id}`}
      className="group block relative rounded-xl overflow-hidden bg-anime-card hover:bg-anime-cardHover border border-anime-border/40 hover:border-anime-orange/50 transition-all duration-300 transform hover:-translate-y-1.5 glow-orange-hover"
    >
      {/* Aspect Ratio Poster Image */}
      <div className="relative aspect-[3/4] w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={anime.images.webp.large_image_url || anime.images.jpg.large_image_url}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Dynamic Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F0F] via-transparent to-transparent opacity-90 group-hover:opacity-80 transition-opacity" />

        {/* Top Badges: Resolution and Sub/Dub languages */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1 z-10">
          <span className="bg-anime-dark/80 backdrop-blur-md text-white text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded border border-white/5">
            HD
          </span>
          <span className="bg-anime-dark/80 backdrop-blur-md text-gray-200 text-[10px] font-medium tracking-wide px-1.5 py-0.5 rounded border border-white/5">
            {langBadge}
          </span>
        </div>

        {/* Bottom Star Rating Badge */}
        <div className="absolute bottom-2.5 right-2.5 flex items-center space-x-1 bg-anime-orange text-black font-extrabold text-[11px] px-2 py-0.5 rounded-lg shadow-lg z-10">
          <Star size={11} fill="currentColor" className="text-black" />
          <span>{score}</span>
        </div>
      </div>

      {/* Info Section */}
      <div className="p-3 bg-anime-card/90">
        <h3 className="text-sm font-semibold text-white truncate group-hover:text-anime-orange transition-colors duration-200">
          {title}
        </h3>
        <div className="flex items-center justify-between mt-1 text-[11px] text-anime-muted">
          <span className="uppercase font-medium tracking-wider text-anime-orange/80">{type}</span>
          {episodesCount ? (
            <span>{episodesCount} EPS</span>
          ) : (
            <span className="italic text-gray-500">Airing</span>
          )}
        </div>
      </div>
    </Link>
  );
}
