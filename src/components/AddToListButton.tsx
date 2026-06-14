'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Play, CheckCircle2, Pause, XCircle, BookMarked, RefreshCw,
  ChevronDown, Star, Trash, Loader2
} from 'lucide-react';
import { useWatchlistStore } from '@/store/useWatchlistStore';

interface TrackingData {
  status: string;
  score: number | null;
  episodesWatched: number;
  rewatchCount: number;
  startedAt: Date | null;
  completedAt: Date | null;
  notes: string | null;
  isPrivate: boolean;
}

interface AddToListButtonProps {
  animeId: string;
  animeTitle: string;
  animeImage: string;
  episodes?: number | null;
  isLoggedIn: boolean;
  initialTracking?: TrackingData | null;
}

const STATUS_COLORS: Record<string, string> = {
  watching: 'text-status-watching bg-status-watching/10 border-status-watching/20',
  completed: 'text-status-completed bg-status-completed/10 border-status-completed/20',
  dropped: 'text-status-dropped bg-status-dropped/10 border-status-dropped/20',
  paused: 'text-status-paused bg-status-paused/10 border-status-paused/20',
  planning: 'text-status-planning bg-status-planning/10 border-status-planning/20',
  rewatching: 'text-status-rewatching bg-status-rewatching/10 border-status-rewatching/20',
};

const STATUS_LABELS: Record<string, string> = {
  watching: 'Watching',
  completed: 'Completed',
  paused: 'Paused',
  dropped: 'Dropped',
  planning: 'Plan to Watch',
  rewatching: 'Rewatching',
};

export default function AddToListButton({
  animeId,
  animeTitle,
  animeImage,
  episodes,
  isLoggedIn,
  initialTracking,
}: AddToListButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get watchlist actions from Zustand store
  const { entries, fetchList, upsertEntry, deleteEntry } = useWatchlistStore();

  // Load from store if available, fallback to SSR initial tracking
  const currentEntry = entries[animeId];
  const hasEntry = !!currentEntry;

  useEffect(() => {
    // Populate store entries if empty
    if (isLoggedIn && Object.keys(entries).length === 0) {
      fetchList();
    }
  }, [isLoggedIn, entries, fetchList]);

  // Sync state values
  const status = currentEntry?.status || initialTracking?.status || '';
  const score = currentEntry?.score !== undefined ? currentEntry.score : (initialTracking?.score ?? null);
  const episodesWatched = currentEntry?.episodesWatched !== undefined ? currentEntry.episodesWatched : (initialTracking?.episodesWatched ?? 0);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isLoggedIn) {
    return (
      <a
        href="/login"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-surface-2 border border-border-default text-text-secondary font-semibold text-sm hover:border-border-emphasis hover:text-text-primary transition-all duration-200"
      >
        <Plus size={16} /> Add to List
      </a>
    );
  }

  const handleQuickAdd = async () => {
    setIsUpdating(true);
    try {
      await upsertEntry({
        animeId,
        animeTitle,
        animeImage,
        animeEpisodes: episodes,
        status: 'planning',
        episodesWatched: 0,
        score: null,
      });
      setIsOpen(true); // Open settings overlay for further adjustment
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateField = async (fields: { status?: string; score?: number | null; episodesWatched?: number }) => {
    setIsUpdating(true);
    try {
      const nextStatus = fields.status !== undefined ? fields.status : status;
      const nextScore = fields.score !== undefined ? fields.score : score;
      let nextEps = fields.episodesWatched !== undefined ? fields.episodesWatched : episodesWatched;

      // Validate episodes boundary
      if (episodes && nextEps > episodes) nextEps = episodes;
      if (nextEps < 0) nextEps = 0;

      await upsertEntry({
        animeId,
        animeTitle,
        animeImage,
        animeEpisodes: episodes,
        status: nextStatus || 'planning',
        score: nextScore,
        episodesWatched: nextEps,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemove = async () => {
    setIsUpdating(true);
    try {
      await deleteEntry(animeId);
      setIsOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const statusIcons: Record<string, React.ReactNode> = {
    watching: <Play size={14} className="text-status-watching" />,
    completed: <CheckCircle2 size={14} className="text-status-completed" />,
    paused: <Pause size={14} className="text-status-paused" />,
    dropped: <XCircle size={14} className="text-status-dropped" />,
    planning: <BookMarked size={14} className="text-status-planning" />,
    rewatching: <RefreshCw size={14} className="text-status-rewatching" />,
  };

  return (
    <div className="relative inline-flex items-center" ref={dropdownRef}>
      {hasEntry || status ? (
        <>
          {/* Main button showing current state */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`inline-flex items-center gap-2 px-5 py-3 rounded-l-xl bg-surface-2 border border-border-default hover:border-border-emphasis text-sm font-semibold capitalize ${STATUS_COLORS[status] || 'text-text-secondary'}`}
          >
            {isUpdating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              statusIcons[status] || <BookMarked size={14} />
            )}
            <span>{STATUS_LABELS[status] || status}</span>
            {episodesWatched > 0 && (
              <span className="text-xs opacity-60">({episodesWatched}{episodes ? `/${episodes}` : ''})</span>
            )}
          </button>

          {/* Settings Trigger */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center justify-center p-3 rounded-r-xl bg-surface-3 border-y border-r border-border-default hover:border-border-emphasis text-text-muted hover:text-text-primary transition-colors h-[46px]"
            aria-label="List options"
          >
            <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </>
      ) : (
        <button
          onClick={handleQuickAdd}
          disabled={isUpdating}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-surface-2 border border-border-default text-text-secondary font-semibold text-sm hover:border-border-emphasis hover:text-text-primary transition-all duration-200"
        >
          {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          <span>Add to List</span>
        </button>
      )}

      {/* Popover Settings Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 rounded-2xl bg-surface-2 border border-border-default backdrop-blur-md shadow-2xl z-50 p-4 space-y-4 animate-fade-up">
          {/* 1. Watch Status */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Watch Status</span>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.keys(STATUS_LABELS).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleUpdateField({ status: st })}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                    status === st
                      ? 'bg-accent-violet/10 border-accent-violet/30 text-accent-violet shadow-[0_0_8px_rgba(124,91,255,0.1)]'
                      : 'bg-surface-3 border-border-subtle hover:border-border-emphasis text-text-secondary'
                  }`}
                >
                  {statusIcons[st]}
                  <span>{STATUS_LABELS[st]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Episode Progress Counter */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Episodes Watched</span>
            <div className="flex items-center justify-between gap-4 p-2 bg-surface-3 border border-border-subtle rounded-xl">
              <button
                type="button"
                onClick={() => handleUpdateField({ episodesWatched: episodesWatched - 1 })}
                className="w-8 h-8 rounded-lg bg-surface-2 hover:bg-surface-1 text-sm font-bold flex items-center justify-center transition border border-border-subtle text-text-primary"
              >
                -
              </button>
              <div className="flex items-baseline gap-1 text-sm font-black text-text-primary">
                <span>{episodesWatched}</span>
                <span className="text-xs text-text-muted font-bold">/ {episodes || '??'}</span>
              </div>
              <button
                type="button"
                onClick={() => handleUpdateField({ episodesWatched: episodesWatched + 1 })}
                className="w-8 h-8 rounded-lg bg-surface-2 hover:bg-surface-1 text-sm font-bold flex items-center justify-center transition border border-border-subtle text-text-primary"
              >
                +
              </button>
            </div>
          </div>

          {/* 3. Rating Score */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Score / Rating</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((starVal) => {
                const isActive = score !== null && starVal <= score;
                return (
                  <button
                    key={starVal}
                    type="button"
                    onClick={() => handleUpdateField({ score: starVal })}
                    className="p-0.5 transition"
                    title={`${starVal} Star${starVal > 1 ? 's' : ''}`}
                  >
                    <Star
                      size={16}
                      fill={isActive ? 'currentColor' : 'none'}
                      className={isActive ? 'text-accent-gold' : 'text-text-disabled hover:text-accent-gold'}
                    />
                  </button>
                );
              })}
              {score !== null && (
                <button
                  type="button"
                  onClick={() => handleUpdateField({ score: null })}
                  className="text-[9px] text-text-muted hover:text-red-400 font-bold uppercase ml-auto"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* 4. Delete / Remove Button */}
          <div className="pt-2 border-t border-border-subtle flex justify-between items-center">
            <button
              type="button"
              onClick={handleRemove}
              className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 font-bold uppercase transition"
            >
              <Trash size={12} />
              <span>Remove from List</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
