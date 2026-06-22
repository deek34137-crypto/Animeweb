'use client';

import React, { useState } from 'react';
import { useRouter } from '@/navigation';
import { Sparkles, Loader2 } from 'lucide-react';

interface FeelingLuckyProps {
  className?: string;
}

const POPULAR_ANIME_IDS = [
  5114,  // Fullmetal Alchemist: Brotherhood
  11061, // Hunter x Hunter (2011)
  9253,  // Steins;Gate
  38000, // Demon Slayer
  40748, // Jujutsu Kaisen
  16498, // Attack on Titan
  21,    // One Piece
  30276, // One Punch Man
  44511, // Jujutsu Kaisen S2
  50265, // Spy x Family
  51009, // Jujutsu Kaisen 0 Movie
  52991, // Frieren: Beyond Journey's End
  17074, // Monogatari Series: Second Season
  31964, // My Hero Academia
  37521, // Vinland Saga
  48561, // Jujutsu Kaisen Phantom Parade / Chainsaw Man (approx)
];

export default function FeelingLucky({ className = '' }: FeelingLuckyProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handlePickRandom = async () => {
    setLoading(true);
    try {
      const randomId = POPULAR_ANIME_IDS[Math.floor(Math.random() * POPULAR_ANIME_IDS.length)];
      // Short delay to build suspense/premium feel
      await new Promise((resolve) => setTimeout(resolve, 600));
      router.push(`/anime/${randomId}`);
    } catch {
      router.push(`/anime/5114`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePickRandom}
      disabled={loading}
      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border-subtle bg-bg-secondary hover:border-accent-cyan/40 hover:bg-bg-elevated hover:shadow-[0_4px_12px_rgba(6,182,212,0.05)] text-text-primary hover:text-accent-cyan text-xs font-semibold transition-all duration-200 disabled:opacity-75 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? (
        <Loader2 size={13} className="animate-spin text-accent-cyan" />
      ) : (
        <Sparkles size={13} className="text-text-muted hover:text-inherit" />
      )}
      <span>Feeling Lucky</span>
    </button>
  );
}
