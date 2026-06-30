'use client';

import React, { useState } from 'react';
import AnimeCard from '@/components/AnimeCard';
import { AnimeData } from '@/services/jikan';
import { Calendar, Flame, SortAsc, HelpCircle } from 'lucide-react';

interface SeasonalDashboardProps {
  currentSeason: AnimeData[];
  upcomingSeason: AnimeData[];
  seasonName: string;
  seasonYear: number;
}

export default function SeasonalDashboard({
  currentSeason,
  upcomingSeason,
  seasonName,
  seasonYear,
}: SeasonalDashboardProps) {
  const [activeTab, setActiveTab] = useState<'current' | 'upcoming'>('current');
  const [sortBy, setSortBy] = useState<'score' | 'popularity' | 'title'>('score');

  const activeList = activeTab === 'current' ? currentSeason : upcomingSeason;

  // Sorting logic
  const sortedList = [...activeList].sort((a, b) => {
    if (sortBy === 'score') {
      const scoreA = a.score || 0;
      const scoreB = b.score || 0;
      return scoreB - scoreA;
    } else if (sortBy === 'popularity') {
      const popA = a.popularity || 999999;
      const popB = b.popularity || 999999;
      return popA - popB; // Smaller index means more popular
    } else {
      const titleA = a.title_english || a.title || '';
      const titleB = b.title_english || b.title || '';
      return titleA.localeCompare(titleB);
    }
  });

  return (
    <div className="space-y-6">
      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Tab switchers */}
        <div className="flex gap-2 p-1 bg-bg-secondary rounded-lg border border-border-subtle w-fit">
          <button
            onClick={() => setActiveTab('current')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'current'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Current Season ({seasonName} {seasonYear})
          </button>
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'upcoming'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Upcoming / Next Season
          </button>
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-2">
          <SortAsc size={14} className="text-text-muted" />
          <span className="text-xs text-text-secondary">Sort By:</span>
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="text-xs bg-bg-secondary border border-border-subtle rounded-md p-1.5 focus:outline-none focus:border-purple-800 text-text-primary cursor-pointer"
          >
            <option value="score">Highest Rated</option>
            <option value="popularity">Most Popular</option>
            <option value="title">Title (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Anime Grid */}
      {sortedList.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {sortedList.map((anime, index) => (
            <div key={`${anime.mal_id}-${index}`} className="w-full">
              <AnimeCard anime={anime} />
            </div>
          ))}
        </div>
      ) : (
        <div className="p-16 text-center rounded-xl bg-bg-secondary border border-border-subtle max-w-md mx-auto">
          <HelpCircle size={32} className="mx-auto text-text-muted mb-3" />
          <h4 className="font-bold text-sm mb-1 text-text-primary">No Releases Found</h4>
          <p className="text-xs text-text-muted">
            We couldn't load seasonal entries for this view.
          </p>
        </div>
      )}
    </div>
  );
}
