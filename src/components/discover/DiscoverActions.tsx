'use client';

import React, { useState } from 'react';
import { useRouter } from '@/navigation';
import { Sparkles, Shuffle, Loader2 } from 'lucide-react';

interface DiscoverActionsProps {
  userId?: string;
  hasRecommendations: boolean;
}

export default function DiscoverActions({ userId, hasRecommendations }: DiscoverActionsProps) {
  const router = useRouter();
  const [surpriseLoading, setSurpriseLoading] = useState(false);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSurpriseMe = async () => {
    setSurpriseLoading(true);
    try {
      const res = await fetch('/api/discover/surprise');
      if (res.ok) {
        const data = await res.json();
        if (data.animeId) {
          router.push(`/anime/${data.animeId}`);
          return;
        }
      }
      // Fallback
      router.push('/anime/5114');
    } catch (e) {
      console.error(e);
      router.push('/anime/5114');
    } finally {
      setSurpriseLoading(false);
    }
  };

  const handleRecalculate = async () => {
    if (!userId) {
      router.push('/login');
      return;
    }

    setRecalcLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/user/recommendations', { method: 'POST' });
      const data = await res.json();
      
      if (res.ok) {
        setMessage('Recalculation started in the background! Please refresh in a moment.');
        // Refresh the server component page data
        router.refresh();
      } else {
        setMessage(data.error || 'Failed to trigger recalculation.');
      }
    } catch (e) {
      console.error(e);
      setMessage('Network error. Failed to recalculate.');
    } finally {
      setRecalcLoading(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Surprise Me Button */}
      <button
        onClick={handleSurpriseMe}
        disabled={surpriseLoading}
        className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-accent-sakura to-purple-600 hover:from-accent-sakura hover:to-purple-700 text-white font-medium shadow-md shadow-purple-900/20 hover:shadow-purple-900/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-80 text-sm md:text-base cursor-pointer"
      >
        {surpriseLoading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Shuffle size={16} />
        )}
        Surprise Me
      </button>

      {/* Recalculate Button */}
      {userId && (
        <button
          onClick={handleRecalculate}
          disabled={recalcLoading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-bg-secondary hover:bg-bg-elevated border border-border-subtle text-text-primary font-medium hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-80 text-sm md:text-base cursor-pointer"
        >
          {recalcLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} className="text-accent-sakura" />
          )}
          {hasRecommendations ? 'Recalculate Recommendations' : 'Generate Recommendations'}
        </button>
      )}

      {/* Floating Status Message */}
      {message && (
        <div className="text-xs md:text-sm text-accent-sakura font-medium animate-fade-in py-1 px-3 rounded-md bg-purple-950/30 border border-purple-900/40">
          {message}
        </div>
      )}
    </div>
  );
}
