'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Layers, Share2, Sparkles, Trophy } from 'lucide-react';
import { TIER_DEFINITIONS, getTierForScore } from '@/lib/rating/scaleDescriptions';

interface TierEntry {
  animeId: string;
  animeTitle: string;
  animeImage: string;
  score: number;
}

interface TierCheckClientProps {
  entries: TierEntry[];
  username: string;
}

export default function TierCheckClient({ entries, username }: TierCheckClientProps) {
  const [copied, setCopied] = useState(false);

  // Group entries by tier
  const tierGroups = TIER_DEFINITIONS.map((def) => {
    const items = entries.filter((e) => getTierForScore(e.score).tier === def.tier);
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
              {entries.length} anime sorted into {tierGroups.length} tiers
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
          <div className="space-y-6">
            {tierGroups.map((group) => (
              <motion.div
                key={group.tier}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.02] backdrop-blur-md"
                style={{ borderLeftWidth: '6px', borderLeftColor: group.color }}
              >
                {/* Tier Title Bar */}
                <div
                  className="px-6 py-3 border-b border-white/5 flex items-center justify-between"
                  style={{ backgroundColor: group.bgColor }}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-base tracking-wide" style={{ color: group.color }}>
                      {group.label}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      (≥ {group.minScore.toFixed(2)})
                    </span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-black/40 text-slate-300">
                    {group.items.length} {group.items.length === 1 ? 'anime' : 'anime'}
                  </span>
                </div>

                {/* Poster Grid */}
                <div className="p-4 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {group.items.map((item) => (
                    <div
                      key={item.animeId}
                      className="group relative flex flex-col bg-black/40 border border-white/5 rounded-xl overflow-hidden hover:border-violet-500/50 transition-all"
                    >
                      <div className="relative aspect-[2/3] w-full overflow-hidden">
                        <img
                          src={item.animeImage}
                          alt={item.animeTitle}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {/* Score Tag */}
                        <div
                          className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-black/80 shadow"
                          style={{ color: group.color }}
                        >
                          {item.score.toFixed(2)}
                        </div>
                      </div>
                      <div className="p-2">
                        <p className="text-[11px] font-medium text-slate-200 line-clamp-2 leading-tight">
                          {item.animeTitle}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
