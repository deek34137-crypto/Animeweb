'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import CountdownClock from './CountdownClock';
import { Calendar, Play, ExternalLink } from 'lucide-react';

interface ScheduledItem {
  animeId: string;
  title: string;
  poster: string;
  broadcast: string;
  airingAt: string;
}

interface CalendarDashboardProps {
  schedule: ScheduledItem[];
}

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export default function CalendarDashboard({ schedule }: CalendarDashboardProps) {
  // Get current local weekday (0 = Sunday, 1 = Monday, etc.)
  const todayIndex = new Date().getDay();
  const [selectedDay, setSelectedDay] = useState<number>(todayIndex);

  // Group items by local weekday
  const groupedSchedule: Record<number, ScheduledItem[]> = {
    0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
  };

  schedule.forEach((item) => {
    const localDate = new Date(item.airingAt);
    const localDay = localDate.getDay();
    groupedSchedule[localDay].push(item);
  });

  // Sort each day's anime list by local airing time
  DAYS_OF_WEEK.forEach((_, idx) => {
    groupedSchedule[idx].sort(
      (a, b) => new Date(a.airingAt).getTime() - new Date(b.airingAt).getTime()
    );
  });

  const activeAnimeList = groupedSchedule[selectedDay] || [];

  return (
    <div className="space-y-6">
      {/* Weekday Tab Switchers */}
      <div className="flex flex-wrap md:flex-nowrap gap-2 bg-bg-secondary p-1.5 rounded-xl border border-border-subtle overflow-x-auto scrollbar-none">
        {DAYS_OF_WEEK.map((day, idx) => {
          const count = groupedSchedule[idx].length;
          const isToday = idx === todayIndex;
          const isSelected = idx === selectedDay;

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(idx)}
              className={`flex-1 min-w-[90px] flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-br from-purple-600 to-purple-800 text-white font-semibold shadow-md shadow-purple-900/10'
                  : 'hover:bg-bg-elevated text-text-secondary hover:text-text-primary'
              }`}
            >
              <span className="text-xs">{day.slice(0, 3)}</span>
              <div className="flex items-center gap-1 mt-0.5">
                {isToday && (
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-sakura" />
                )}
                <span className="text-[10px] opacity-80">{count} Shows</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Airing Cards List */}
      {activeAnimeList.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {activeAnimeList.map((item) => {
            const malId = parseInt(item.animeId, 10);
            
            return (
              <div
                key={item.animeId}
                className="flex gap-4 p-3 rounded-xl bg-bg-secondary/40 border border-border-subtle hover:border-purple-900/40 transition-all duration-200 group relative overflow-hidden"
              >
                {/* Poster card image */}
                <div className="w-20 h-28 relative rounded-lg overflow-hidden flex-shrink-0 bg-bg-secondary">
                  {item.poster ? (
                    <img
                      src={item.poster}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-bg-secondary flex items-center justify-center">
                      <Play className="text-text-muted" size={16} />
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col justify-between py-0.5">
                  <div className="space-y-1">
                    <Link
                      href={`/anime/${malId}`}
                      className="font-bold text-sm text-text-primary hover:text-accent-sakura transition-colors line-clamp-2"
                    >
                      {item.title}
                    </Link>
                    <span className="text-[10px] text-text-muted italic">
                      {item.broadcast}
                    </span>
                  </div>

                  <div className="flex items-end justify-between border-t border-border-subtle pt-2">
                    <CountdownClock airingAt={item.airingAt} />

                    <Link
                      href={`/anime/${malId}`}
                      className="p-1.5 rounded-md hover:bg-bg-elevated text-text-muted hover:text-accent-sakura transition-colors"
                      title="View Details"
                    >
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-16 text-center rounded-xl bg-bg-secondary/40 border border-border-subtle max-w-md mx-auto">
          <Calendar size={32} className="mx-auto text-text-muted mb-3" />
          <h4 className="font-bold text-sm mb-1 text-text-primary">No Scheduled Releases</h4>
          <p className="text-xs text-text-muted">
            There are no currently tracked anime airing on this weekday.
          </p>
        </div>
      )}
    </div>
  );
}
