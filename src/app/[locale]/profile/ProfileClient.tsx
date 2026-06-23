'use client';

import React, { useState, useEffect } from 'react';
import { Link } from '@/navigation';
import { Play, Star, List, Film, Check, BookOpen, Pause, Trash } from 'lucide-react';
import Progress from '@/components/ui/Progress';

interface ListEntry {
  id: string;
  userId: string;
  animeId: string;
  animeTitle: string;
  animeImage: string;
  animeEpisodes: number | null;
  status: string;
  score: number | null;
  episodesWatched: number;
  updatedAt: Date;
}

interface ProfileClientProps {
  listEntries: ListEntry[];
  stats: {
    totalAnime: number;
    completedCount: number;
    watchingCount: number;
    planningCount: number;
    pausedCount: number;
    droppedCount: number;
  };
}

type FilterStatus = 'all' | 'watching' | 'completed' | 'planning' | 'paused' | 'dropped';

export default function ProfileClient({ listEntries, stats }: ProfileClientProps) {
  const [activeTab, setActiveTab] = useState<FilterStatus>('all');
  const [watchStats, setWatchStats] = useState<{
    totalEpisodes: number;
    totalWatchTimeMinutes: number;
    episodesThisWeek: number;
    currentlyWatching: number;
    completedCount: number;
    longestStreak: number;
    currentStreak: number;
  } | null>(null);

  useEffect(() => {
    fetch('/api/user/stats')
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setWatchStats(data);
      })
      .catch((err) => console.error('Failed to fetch watch stats:', err));
  }, []);

  const tabs: { key: FilterStatus; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'all', label: 'All Anime', icon: <List size={14} />, count: stats.totalAnime },
    { key: 'watching', label: 'Watching', icon: <Play size={14} className="text-accent-violet" />, count: stats.watchingCount },
    { key: 'completed', label: 'Completed', icon: <Check size={14} className="text-green-400" />, count: stats.completedCount },
    { key: 'planning', label: 'Planning', icon: <BookOpen size={14} className="text-cyan-400" />, count: stats.planningCount },
    { key: 'paused', label: 'Paused', icon: <Pause size={14} className="text-yellow-400" />, count: stats.pausedCount },
    { key: 'dropped', label: 'Dropped', icon: <Trash size={14} className="text-red-400" />, count: stats.droppedCount },
  ];

  const filteredEntries = activeTab === 'all'
    ? listEntries
    : listEntries.filter((entry) => entry.status === activeTab);

  return (
    <div className="space-y-6">
      {/* Watch Statistics Card */}
      {watchStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-surface-2 border border-border-default rounded-3xl p-5 shadow-sm animate-fade-up">
          <div className="flex flex-col items-center justify-center p-3 text-center border-b md:border-b-0 border-white/5 md:border-r border-white/5 last:border-0">
            <span className="text-xl font-black text-accent-violet">{watchStats.totalEpisodes}</span>
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider mt-1">📺 Total Episodes</span>
          </div>
          <div className="flex flex-col items-center justify-center p-3 text-center border-b md:border-b-0 border-white/5 md:border-r border-white/5 last:border-0">
            <span className="text-xl font-black text-accent-sakura">
              {watchStats.totalWatchTimeMinutes > 60
                ? `${Math.round(watchStats.totalWatchTimeMinutes / 60)}h ${watchStats.totalWatchTimeMinutes % 60}m`
                : `${watchStats.totalWatchTimeMinutes}m`}
            </span>
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider mt-1">⏱ Watch Time</span>
          </div>
          <div className="flex flex-col items-center justify-center p-3 text-center border-b md:border-b-0 border-white/5 md:border-r border-white/5 last:border-0">
            <span className="text-xl font-black text-accent-gold">
              🔥 {watchStats.currentStreak} <span className="text-xs font-medium text-text-muted">/ {watchStats.longestStreak}</span>
            </span>
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider mt-1">Streak (Active / Max)</span>
          </div>
          <div className="flex flex-col items-center justify-center p-3 text-center last:border-0">
            <span className="text-xl font-black text-green-400">+{watchStats.episodesThisWeek}</span>
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider mt-1">📈 Watched This Week</span>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex gap-1.5 overflow-x-auto rail-scroll pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex-shrink-0 transition-all ${
              activeTab === tab.key
                ? 'bg-accent-violet text-white shadow-[0_0_12px_rgba(124,91,255,0.4)]'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-2 bg-surface-1 border border-border-subtle'
            }`}
          >
            {tab.icon}
            {tab.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-white/20' : 'bg-surface-3 text-text-muted'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Grid of list entries */}
      {filteredEntries.length === 0 ? (
        <div className="glass-panel border border-border-default rounded-3xl p-16 text-center max-w-sm mx-auto space-y-3">
          <Film size={36} className="text-text-disabled mx-auto" />
          <h3 className="text-sm font-bold text-text-primary">No Anime Found</h3>
          <p className="text-xs text-text-muted">
            There are no titles in this category yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredEntries.map((entry) => {
            const totalEps = entry.animeEpisodes || 0;
            const progressPct = totalEps > 0 ? Math.round((entry.episodesWatched / totalEps) * 100) : 0;
            const nextEp = entry.status === 'completed'
              ? 1
              : Math.min(totalEps || 999, entry.episodesWatched + 1);

            return (
              <div
                key={entry.id}
                className="group relative flex flex-col bg-surface-2 border border-border-subtle hover:border-accent-violet/40 rounded-xl overflow-hidden transition-all duration-300 shadow-sm"
              >
                {/* Poster Cover */}
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface-3 border-b border-border-subtle">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={entry.animeImage}
                    alt={entry.animeTitle}
                    className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-500 ease-out"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />

                  {/* Gradient bottom overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#05050A]/90 via-[#05050A]/30 to-transparent" />

                  {/* Score Tag */}
                  {entry.score && (
                    <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-0.5">
                      <Star size={10} fill="currentColor" className="text-accent-gold" />
                      <span className="text-[10px] font-bold text-text-primary">{entry.score.toFixed(1)}</span>
                    </div>
                  )}

                  {/* Watch Play Button */}
                  <Link
                    href={`/watch/${entry.animeId}/${nextEp}` as '/'}
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  >
                    <div className="w-10 h-10 rounded-full bg-accent-violet/90 backdrop-blur-xs flex items-center justify-center shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform duration-200">
                      <Play size={16} fill="white" className="text-white ml-0.5" />
                    </div>
                  </Link>

                  {/* Episodes watched badge bottom overlay */}
                  <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center text-[10px] text-white font-semibold">
                    <span>Ep {entry.episodesWatched}{totalEps > 0 ? ` / ${totalEps}` : ''}</span>
                    {progressPct > 0 && <span className="text-accent-violet">{progressPct}%</span>}
                  </div>
                </div>

                {/* Info Area */}
                <div className="p-3 flex-grow flex flex-col justify-between space-y-2">
                  <Link
                    href={`/anime/${entry.animeId}` as '/'}
                    className="text-xs font-bold text-text-primary line-clamp-2 leading-snug group-hover:text-accent-violet transition-colors duration-200"
                  >
                    {entry.animeTitle}
                  </Link>

                  {/* Progress Slider Bar */}
                  {totalEps > 0 && (
                    <Progress value={entry.episodesWatched} max={totalEps} variant="violet" size="xs" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
