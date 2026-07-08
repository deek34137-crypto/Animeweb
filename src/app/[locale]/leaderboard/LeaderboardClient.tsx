'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, Award, Flame, ChevronDown, Loader2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from '@/navigation';
import { EmptyState } from '@/components/ui/EmptyState';

interface LeaderboardUser {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  xp: number;
  streakCurrent: number;
  rank: number;
}

type LeaderboardFilter = 'all-time' | 'seasonal' | 'monthly' | 'weekly';

export default function LeaderboardClient() {
  const [filter, setFilter] = useState<LeaderboardFilter>('all-time');
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchLeaderboard(filter, true);
  }, [filter]);

  const fetchLeaderboard = async (selectedFilter: LeaderboardFilter, isInitial: boolean = false) => {
    if (isInitial) {
      setLoading(true);
      setError(false);
    } else {
      setLoadingMore(true);
    }

    try {
      let url = `/api/leaderboard?filter=${selectedFilter}&limit=15`;
      if (!isInitial && nextCursor) {
        url += `&cursor=${nextCursor}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('API request failed');
      const data = await res.json();

      if (data.users) {
        if (isInitial) {
          setUsers(data.users);
        } else {
          setUsers((prev) => [...prev, ...data.users]);
        }
        setNextCursor(data.nextCursor);
        setHasNextPage(data.hasNextPage);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
      if (isInitial) setError(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (hasNextPage && !loadingMore) {
      fetchLeaderboard(filter, false);
    }
  };

  // Split top 3 from the rest
  const podiumUsers = users.slice(0, 3);
  const listUsers = users.slice(3);

  // Reorder podium users for visual placement: [2nd, 1st, 3rd]
  const orderedPodium: (LeaderboardUser | null)[] = [null, null, null];
  if (podiumUsers[1]) orderedPodium[0] = podiumUsers[1]; // 2nd
  if (podiumUsers[0]) orderedPodium[1] = podiumUsers[0]; // 1st
  if (podiumUsers[2]) orderedPodium[2] = podiumUsers[2]; // 3rd

  const getLevelFromXP = (xp: number) => Math.floor(Math.sqrt(xp / 100)) + 1;

  const filterTabs: { key: LeaderboardFilter; label: string }[] = [
    { key: 'all-time', label: 'All-Time' },
    { key: 'seasonal', label: 'Seasonal' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'weekly', label: 'Weekly' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-up">
      {/* Title Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-gold/10 border border-accent-gold/20 text-accent-gold rounded-full text-[10px] font-black uppercase tracking-widest">
          <Trophy size={12} className="fill-current" /> Hall of Fame
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white font-display tracking-tight">Global Leaderboard</h1>
        <p className="text-xs text-text-secondary max-w-md mx-auto leading-relaxed">
          Rankings updated in real-time. Watch anime, write reviews, and maintain active daily streaks to reach the top!
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex justify-center">
        <div className="flex gap-1.5 p-1 bg-surface-2 border border-border-subtle rounded-2xl">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filter === tab.key
                  ? 'bg-accent-violet text-white shadow-[0_4px_12px_rgba(124,91,255,0.35)]'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="glass-panel border border-red-500/20 text-red-400 rounded-2xl p-8 text-center text-sm max-w-md mx-auto">
          <RefreshCw size={24} className="mx-auto mb-3 animate-spin text-red-400 animate-duration-1000" />
          <p className="font-semibold">Error loading leaderboard.</p>
          <p className="text-xs text-text-muted mt-1">Failed to connect to leaderboard services.</p>
          <button
            onClick={() => fetchLeaderboard(filter, true)}
            className="mt-4 text-xs font-bold text-white bg-accent-violet hover:bg-[#6b4ae6] rounded-xl px-5 py-2.5 transition"
          >
            Try Again
          </button>
        </div>
      ) : loading ? (
        <div className="flex justify-center items-center py-32">
          <Loader2 size={36} className="animate-spin text-accent-violet" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Podium (Top 3 Bento Pods) */}
          {podiumUsers.length > 0 && (
            <div className="grid grid-cols-3 gap-3 sm:gap-6 items-end max-w-2xl mx-auto pt-6 px-2">
              
              {/* 2nd Place Pod */}
              {orderedPodium[0] ? (
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-surface-2 border border-border-default rounded-3xl p-4 text-center space-y-4 flex flex-col justify-between h-[200px] sm:h-[240px] shadow-md border-b-4 border-b-slate-400"
                >
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-slate-400">2nd Place</span>
                    <div className="relative w-12 h-12 sm:w-16 sm:h-16 mx-auto rounded-2xl overflow-hidden border-2 border-slate-400 shadow-inner">
                      {orderedPodium[0].avatar ? (
                        <img src={orderedPodium[0].avatar} alt={orderedPodium[0].username} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-surface-3 flex items-center justify-center font-bold text-white uppercase">
                          {orderedPodium[0].username[0]}
                        </div>
                      )}
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                      <Link href={`/user/${orderedPodium[0].username}`} className="text-xs sm:text-sm font-black text-white hover:text-accent-violet transition block truncate">
                        {orderedPodium[0].displayName || orderedPodium[0].username}
                      </Link>
                      <p className="text-[9px] text-text-muted">Level {getLevelFromXP(orderedPodium[0].xp)}</p>
                    </div>
                  </div>
                  <div className="bg-slate-400/10 px-2 py-1 rounded-xl text-[10px] sm:text-xs font-black text-slate-300">
                    {orderedPodium[0].xp.toLocaleString()} XP
                  </div>
                </motion.div>
              ) : (
                <div />
              )}

              {/* 1st Place Pod */}
              {orderedPodium[1] ? (
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-surface-2 border border-border-emphasis rounded-3xl p-4 text-center space-y-4 flex flex-col justify-between h-[240px] sm:h-[280px] scale-105 sm:scale-110 shadow-xl border-b-4 border-b-accent-gold relative z-10"
                >
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-2xl animate-bounce">👑</div>
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-accent-gold tracking-widest">Champion</span>
                    <div className="relative w-14 h-14 sm:w-20 sm:h-20 mx-auto rounded-3xl overflow-hidden border-2 border-accent-gold shadow-md">
                      {orderedPodium[1].avatar ? (
                        <img src={orderedPodium[1].avatar} alt={orderedPodium[1].username} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-surface-3 flex items-center justify-center font-bold text-white uppercase">
                          {orderedPodium[1].username[0]}
                        </div>
                      )}
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                      <Link href={`/user/${orderedPodium[1].username}`} className="text-xs sm:text-sm font-black text-white hover:text-accent-gold transition block truncate">
                        {orderedPodium[1].displayName || orderedPodium[1].username}
                      </Link>
                      <p className="text-[9px] text-accent-gold font-bold">Level {getLevelFromXP(orderedPodium[1].xp)}</p>
                    </div>
                  </div>
                  <div className="bg-accent-gold/10 px-2 py-1 rounded-xl text-[10px] sm:text-xs font-black text-accent-gold">
                    {orderedPodium[1].xp.toLocaleString()} XP
                  </div>
                </motion.div>
              ) : (
                <div />
              )}

              {/* 3rd Place Pod */}
              {orderedPodium[2] ? (
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-surface-2 border border-border-default rounded-3xl p-4 text-center space-y-4 flex flex-col justify-between h-[180px] sm:h-[220px] shadow-md border-b-4 border-b-amber-600"
                >
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-amber-600">3rd Place</span>
                    <div className="relative w-12 h-12 sm:w-16 sm:h-16 mx-auto rounded-2xl overflow-hidden border-2 border-amber-600 shadow-inner">
                      {orderedPodium[2].avatar ? (
                        <img src={orderedPodium[2].avatar} alt={orderedPodium[2].username} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-surface-3 flex items-center justify-center font-bold text-white uppercase">
                          {orderedPodium[2].username[0]}
                        </div>
                      )}
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                      <Link href={`/user/${orderedPodium[2].username}`} className="text-xs sm:text-sm font-black text-white hover:text-accent-violet transition block truncate">
                        {orderedPodium[2].displayName || orderedPodium[2].username}
                      </Link>
                      <p className="text-[9px] text-text-muted">Level {getLevelFromXP(orderedPodium[2].xp)}</p>
                    </div>
                  </div>
                  <div className="bg-amber-600/10 px-2 py-1 rounded-xl text-[10px] sm:text-xs font-black text-amber-500">
                    {orderedPodium[2].xp.toLocaleString()} XP
                  </div>
                </motion.div>
              ) : (
                <div />
              )}
            </div>
          )}

          {/* Leaderboard Table List */}
          <div className="space-y-3.5 pt-4">
            {listUsers.length === 0 && podiumUsers.length <= 3 && users.length === 0 ? (
              <EmptyState
                icon={Trophy}
                title="No Rankings Found"
                description="No rankings found for this timeframe. Be the first to earn XP!"
                size="sm"
              />
            ) : (
              listUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 bg-surface-2 border border-border-subtle hover:border-border-default transition-colors rounded-2xl shadow-sm"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Rank Badge */}
                    <span className="w-6 text-center text-xs font-bold text-text-muted font-mono">
                      #{user.rank}
                    </span>

                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-surface-3 border border-border-subtle flex-shrink-0 flex items-center justify-center text-xs font-bold text-white uppercase">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                      ) : (
                        user.username[0]
                      )}
                    </div>

                    {/* Username & level details */}
                    <div className="min-w-0">
                      <Link href={`/user/${user.username}`} className="text-xs sm:text-sm font-black text-text-primary hover:text-accent-violet transition-colors block truncate">
                        {user.displayName || user.username}
                      </Link>
                      <span className="text-[9px] text-text-muted font-semibold">
                        Level {getLevelFromXP(user.xp)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-5 flex-shrink-0">
                    {user.streakCurrent > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-accent-gold" title={`${user.streakCurrent}-day active streak`}>
                        <Flame size={12} className="fill-current" />
                        {user.streakCurrent}
                      </span>
                    )}
                    <span className="px-3 py-1 bg-surface-3 rounded-lg text-xs font-bold text-text-secondary border border-border-subtle">
                      {user.xp.toLocaleString()} XP
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Load More Button */}
          {hasNextPage && (
            <div className="flex justify-center pt-4">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 px-6 py-2.5 bg-surface-2 border border-border-subtle hover:border-border-emphasis text-text-secondary hover:text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                {loadingMore ? (
                  <Loader2 size={13} className="animate-spin text-accent-violet" />
                ) : (
                  <>
                    Load More <ChevronDown size={13} />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
