'use client';

import React from 'react';
import { useRouter } from '@/navigation';
import { Compass, Flame, Shield, Heart, Zap, Sparkles, MessageCircle, Trees, Skull, Tv } from 'lucide-react';

interface GenreItem {
  id: number;
  name: string;
  color: string;
  icon: React.ReactNode;
}

const GENRES_DATA: GenreItem[] = [
  { id: 1, name: 'Action', color: 'from-[#ef4444] to-[#f97316]', icon: <Zap size={14} /> },
  { id: 2, name: 'Adventure', color: 'from-[#f59e0b] to-[#eab308]', icon: <Trees size={14} /> },
  { id: 4, name: 'Comedy', color: 'from-[#10b981] to-[#059669]', icon: <MessageCircle size={14} /> },
  { id: 8, name: 'Drama', color: 'from-[#3b82f6] to-[#2563eb]', icon: <Shield size={14} /> },
  { id: 10, name: 'Fantasy', color: 'from-[#8b5cf6] to-[#7c3aed]', icon: <Sparkles size={14} /> },
  { id: 22, name: 'Romance', color: 'from-[#ec4899] to-[#db2777]', icon: <Heart size={14} /> },
  { id: 24, name: 'Sci-Fi', color: 'from-[#06b6d4] to-[#0891b2]', icon: <Compass size={14} /> },
  { id: 37, name: 'Supernatural', color: 'from-[#6366f1] to-[#4f46e5]', icon: <Skull size={14} /> },
];

export default function Genres() {
  const router = useRouter();

  const handleGenreClick = (genreId: number) => {
    router.push(`/search?genre=${genreId}` as '/');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-gradient-to-b from-[#7c3aed] to-[#ec4899] rounded-full" />
          <h2 className="text-sm sm:text-base font-black text-text-primary uppercase tracking-wider font-display">
            Browse by Genre
          </h2>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 rail-scroll snap-x scrollbar-thin">
        {GENRES_DATA.map((genre) => (
          <button
            key={genre.id}
            onClick={() => handleGenreClick(genre.id)}
            className="flex-shrink-0 snap-start group relative overflow-hidden rounded-2xl border border-border-subtle bg-bg-secondary/40 hover:bg-bg-elevated px-4.5 py-4 w-32 sm:w-36 text-center transition-all duration-300 hover:-translate-y-1 hover:border-[#7c3aed]/25 hover:shadow-[0_8px_20px_rgba(124,58,237,0.06)] flex flex-col items-center gap-2"
          >
            {/* Colored background glow on hover */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-[0.03] bg-gradient-to-br ${genre.color} transition-opacity duration-300`} />

            {/* Icon bubble */}
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center bg-white/[0.03] dark:bg-white/[0.01] border border-border-subtle group-hover:scale-105 group-hover:border-[#7c3aed]/30 transition-all duration-300 text-text-secondary group-hover:text-text-primary`}>
              <span className="group-hover:scale-110 transition-transform">{genre.icon}</span>
            </div>

            {/* Name */}
            <span className="text-[11px] sm:text-xs font-bold text-text-secondary group-hover:text-text-primary transition-colors">
              {genre.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
