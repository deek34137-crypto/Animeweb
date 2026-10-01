'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ThumbsUp, EyeOff, Plus, Play, RefreshCw } from 'lucide-react';
import MomentSubmitModal from '@/components/community/MomentSubmitModal';

interface Moment {
  id: string;
  animeId: string;
  animeTitle: string;
  episode: number;
  timestamp?: string;
  title: string;
  description?: string;
  voteCount: number;
  spoilerRisk: boolean;
  hasVoted?: boolean;
  user: {
    username: string;
    displayName?: string;
  };
}

export default function TopMomentsClient() {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [sort, setSort] = useState<'votes' | 'new'>('votes');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchMoments();
  }, [sort]);

  const fetchMoments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/top-moments?sort=${sort}`);
      if (res.ok) {
        const data = await res.json();
        setMoments(data.moments || []);
      }
    } catch (err) {
      console.error('Failed to fetch top moments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncSakugabooru = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/top-moments/sync-sakugabooru?limit=25', { method: 'POST' });
      if (res.ok) {
        await fetchMoments();
      }
    } catch (err) {
      console.error('Failed to sync Sakugabooru:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleVote = async (momentId: string) => {
    try {
      const res = await fetch(`/api/top-moments/${momentId}/vote`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setMoments((prev) =>
          prev.map((m) =>
            m.id === momentId
              ? {
                  ...m,
                  hasVoted: data.voted,
                  voteCount: data.voted ? m.voteCount + 1 : m.voteCount - 1,
                }
              : m
          )
        );
      }
    } catch (err) {
      console.error('Failed to vote on moment:', err);
    }
  };

  const toggleSpoilerReveal = (id: string) => {
    setRevealedSpoilers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#0f0f13] text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 text-violet-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              Community Hall of Fame
            </div>
            <h1 className="text-3xl font-extrabold text-white">Top Anime Moments</h1>
            <p className="text-sm text-slate-400 mt-1">
              The greatest scenes and climaxes ranked by fans.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSyncSakugabooru}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-semibold text-sm transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Sakugabooru'}
            </button>
            <button
              onClick={() => setIsSubmitOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm shadow-lg shadow-violet-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              Nominate Moment
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 border-b border-white/5 pb-4">
          <button
            onClick={() => setSort('votes')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              sort === 'votes'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            Highest Voted
          </button>
          <button
            onClick={() => setSort('new')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              sort === 'new'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            Newest
          </button>
        </div>

        {/* Moments Feed */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading moments...</div>
        ) : moments.length === 0 ? (
          <div className="p-12 text-center bg-white/[0.02] border border-white/5 rounded-2xl">
            <Play className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">No Moments Submitted Yet</h3>
            <p className="text-sm text-slate-400 mb-4">Be the first to nominate an iconic anime scene!</p>
            <button
              onClick={() => setIsSubmitOpen(true)}
              className="px-5 py-2 rounded-xl bg-violet-600 text-white font-semibold text-xs"
            >
              Nominate Scene
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {moments.map((m) => {
              const isBlurred = m.spoilerRisk && !revealedSpoilers.has(m.id);

              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative p-5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-violet-500/40 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    {/* Anime & Episode Badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-violet-400 line-clamp-1">
                        {m.animeTitle}
                      </span>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white/5 text-slate-400">
                        Ep. {m.episode} {m.timestamp ? `@ ${m.timestamp}` : ''}
                      </span>
                    </div>

                    {/* Spoiler Overlay vs Content */}
                    {isBlurred ? (
                      <div className="p-6 rounded-xl bg-violet-950/40 border border-violet-500/30 text-center space-y-2">
                        <EyeOff className="w-6 h-6 text-violet-400 mx-auto" />
                        <div className="text-xs font-bold text-violet-200">Contains Major Spoilers</div>
                        <button
                          onClick={() => toggleSpoilerReveal(m.id)}
                          className="px-3 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-semibold"
                        >
                          Click to Reveal
                        </button>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-base font-bold text-white">{m.title}</h3>
                        {m.description && (
                          <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                            {m.description}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Submitter & Vote Action */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-slate-500">
                    <span>
                      by{' '}
                      {m.animeId?.startsWith('sakugabooru_') || m.description?.includes('Sakugabooru')
                        ? 'Sakugabooru'
                        : m.user?.displayName || m.user?.username || 'User'}
                    </span>
                    <button
                      onClick={() => handleVote(m.id)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all ${
                        m.hasVoted
                          ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{m.voteCount}</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        <MomentSubmitModal
          isOpen={isSubmitOpen}
          onClose={() => setIsSubmitOpen(false)}
          onSuccess={fetchMoments}
        />
      </div>
    </div>
  );
}
