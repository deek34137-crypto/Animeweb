'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Layers, Share2, Sparkles, Trophy, Loader2 } from 'lucide-react';
import { TIER_DEFINITIONS, getTierForScore } from '@/lib/rating/scaleDescriptions';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

interface TierEntry {
  id: string;
  animeId: string;
  animeTitle: string;
  animeImage: string;
  score: number;
}

interface TierCheckClientProps {
  entries: TierEntry[];
  nextCursor: string | null;
  username: string;
}

export default function TierCheckClient({ entries: initialEntries, nextCursor: initialNextCursor, username }: TierCheckClientProps) {
  const [copied, setCopied] = useState(false);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['user-tier-check'],
    queryFn: async ({ pageParam = null }) => {
      if (pageParam === null) {
        return { data: initialEntries, nextCursor: initialNextCursor };
      }
      const res = await fetch(`/api/user/tier-check?cursor=${pageParam}`);
      if (!res.ok) throw new Error('Failed to fetch tier check data');
      return res.json() as Promise<{ data: TierEntry[], nextCursor: string | null }>;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    initialData: {
      pages: [{ data: initialEntries, nextCursor: initialNextCursor }],
      pageParams: [null],
    },
  });

  const allEntries = data?.pages.flatMap((page) => page.data) || [];

  const { ref: loadMoreRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
  });

  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Group entries by tier
  const tierGroups = TIER_DEFINITIONS.map((def) => {
    const items = allEntries.filter((e) => getTierForScore(e.score).tier === def.tier);
    return {
      ...def,
      items,
    };
  }).filter((group) => group.items.length > 0);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0f0f13] text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 text-violet-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Layers className="w-4 h-4" />
              Your Tier Check
            </div>
            <h1 className="text-3xl font-extrabold text-white">{username}&apos;s Rated Tiers</h1>
            <p className="text-sm text-slate-400 mt-1">
              {allEntries.length} anime sorted into {tierGroups.length} tiers
            </p>
          </div>

          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm shadow-lg shadow-violet-600/30 transition-all"
          >
            <Share2 className="w-4 h-4" />
            {copied ? 'Link Copied!' : 'Share Tier List'}
          </button>
        </div>

        {/* Tier Grid */}
        {tierGroups.length === 0 ? (
          <div className="p-12 text-center bg-white/[0.02] border border-white/5 rounded-2xl">
            <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-white mb-1">No Rated Anime Yet</h2>
            <p className="text-sm text-slate-400">Rate some anime to see your tier list populate!</p>
          </div>
        ) : (
          <div className="space-y-12">
            {tierGroups.map((group, groupIdx) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: groupIdx * 0.1 }}
                key={group.tier}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black shadow-lg border"
                      style={{
                        backgroundColor: `${group.color}20`,
                        color: group.color,
                        borderColor: `${group.color}40`,
                      }}
                    >
                      {group.tier}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        {group.label}
                        {group.tier === 'god' && <Sparkles className="w-4 h-4 text-yellow-400" />}
                      </h2>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-slate-500 bg-white/5 px-3 py-1 rounded-full">
                    {group.items.length}
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
                  {group.items.map((item, idx) => (
                    <motion.a
                      key={item.animeId}
                      href={`/anime/${item.animeId}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: (groupIdx * 0.1) + (idx * 0.02) }}
                      className="group block relative aspect-[2/3] rounded-lg overflow-hidden bg-surface-3 border border-white/5 hover:border-violet-500/50 transition-all shadow-lg hover:shadow-violet-500/20"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.animeImage || ''}
                        alt={item.animeTitle}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                        <p className="text-[10px] sm:text-xs font-semibold text-white line-clamp-2 leading-tight">
                          {item.animeTitle}
                        </p>
                      </div>
                      <div
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-xs font-bold border border-white/10"
                        style={{ color: group.color }}
                      >
                        {item.score}
                      </div>
                    </motion.a>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
        
        {/* Intersection Observer target for infinite scrolling */}
        {hasNextPage && (
          <div ref={loadMoreRef} className="py-8 flex justify-center">
            {isFetchingNextPage ? (
              <Loader2 className="animate-spin text-violet-500" size={24} />
            ) : (
              <span className="text-slate-500 text-sm">Scroll to load more...</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
