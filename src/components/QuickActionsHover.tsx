'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Heart, Check, Plus, Star, FileText, Loader2, Play, FolderPlus, FolderCheck, X, CheckSquare
} from 'lucide-react';
import { useWatchlistStore } from '@/store/useWatchlistStore';
import { useSession } from 'next-auth/react';

interface QuickActionsHoverProps {
  animeId: string;
  animeTitle: string;
  animeImage: string;
  animeEpisodes: number | null;
  onClose?: () => void;
}

export default function QuickActionsHover({
  animeId,
  animeTitle,
  animeImage,
  animeEpisodes,
  onClose,
}: QuickActionsHoverProps) {
  const { data: session } = useSession();
  const isLoggedIn = !!session;

  const { entries, upsertEntry } = useWatchlistStore();
  const entry = entries[animeId];
  
  const status = entry?.status || '';
  const isFavorite = entry?.isFavorite || false;
  const score = entry?.score || null;
  const notes = entry?.notes || '';

  const [isUpdating, setIsUpdating] = useState(false);
  const [showCollections, setShowCollections] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState(notes);
  const [collections, setCollections] = useState<any[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch collections when folder option is clicked
  useEffect(() => {
    if (showCollections && isLoggedIn) {
      setCollectionsLoading(true);
      fetch('/api/collections')
        .then((res) => res.json())
        .then((data) => {
          if (data.collections) setCollections(data.collections);
        })
        .catch((err) => console.error(err))
        .finally(() => setCollectionsLoading(false));
    }
  }, [showCollections, isLoggedIn]);

  const handleUpdate = async (fields: any) => {
    if (!isLoggedIn) return;
    setIsUpdating(true);
    try {
      await upsertEntry({
        animeId,
        animeTitle,
        animeImage,
        animeEpisodes,
        status: fields.status !== undefined ? fields.status : (status || 'planning'),
        score: fields.score !== undefined ? fields.score : score,
        isFavorite: fields.isFavorite !== undefined ? fields.isFavorite : isFavorite,
        notes: fields.notes !== undefined ? fields.notes : notes,
        episodesWatched: fields.status === 'completed' && animeEpisodes ? animeEpisodes : (entry?.episodesWatched || 0),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleCollection = async (colId: string, isInCollection: boolean) => {
    try {
      if (isInCollection) {
        await fetch(`/api/collections/${colId}/entries?animeId=${animeId}`, { method: 'DELETE' });
        setCollections((prev) =>
          prev.map((c) =>
            c.id === colId
              ? { ...c, entries: c.entries.filter((e: any) => e.animeId !== animeId) }
              : c
          )
        );
      } else {
        const res = await fetch(`/api/collections/${colId}/entries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ animeId, animeTitle, animeImage }),
        });
        if (res.ok) {
          const data = await res.json();
          setCollections((prev) =>
            prev.map((c) =>
              c.id === colId ? { ...c, entries: [...c.entries, data.entry] } : c
            )
          );
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isLoggedIn) return null;

  return (
    <div
      ref={menuRef}
      className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col justify-between p-3.5 z-30 transition-all duration-200 animate-fade-in text-white rounded-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-1.5 w-full">
        <span className="text-[10px] font-black uppercase tracking-wider text-accent-violet">Quick Actions</span>
        {onClose && (
          <button onClick={onClose} className="p-0.5 hover:text-red-400 transition">
            <X size={12} />
          </button>
        )}
      </div>

      {/* Middle Interactive States */}
      <div className="flex-1 flex flex-col justify-center w-full min-h-0 overflow-y-auto rail-scroll my-1.5">
        {showCollections && (
          <div className="space-y-1 w-full text-left">
            <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider block mb-1">Add to Collections</span>
            {collectionsLoading ? (
              <Loader2 size={12} className="animate-spin mx-auto my-2" />
            ) : collections.length === 0 ? (
              <span className="text-[9px] text-white/50 block">No collections found.</span>
            ) : (
              <div className="space-y-0.5 max-h-24 overflow-y-auto rail-scroll pr-1">
                {collections.map((col) => {
                  const isInCol = col.entries.some((e: any) => e.animeId === animeId);
                  return (
                    <button
                      key={col.id}
                      onClick={() => handleToggleCollection(col.id, isInCol)}
                      className={`w-full flex items-center justify-between p-1 px-2 rounded text-[10px] font-semibold border ${
                        isInCol
                          ? 'bg-accent-violet/10 border-accent-violet/30 text-accent-violet'
                          : 'bg-white/5 border-white/5 text-white/80 hover:border-white/20'
                      }`}
                    >
                      <span className="truncate max-w-[120px]">{col.name}</span>
                      {isInCol ? <FolderCheck size={10} /> : <FolderPlus size={10} />}
                    </button>
                  );
                })}
              </div>
            )}
            <button
              onClick={() => setShowCollections(false)}
              className="text-[9px] font-bold text-text-muted hover:text-white uppercase block pt-1.5"
            >
              ← Back
            </button>
          </div>
        )}

        {showRating && (
          <div className="space-y-1.5 w-full text-center">
            <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">Quick Score</span>
            <div className="flex items-center justify-center gap-0.5 flex-wrap">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((starVal) => {
                const isActive = score !== null && starVal <= score;
                return (
                  <button
                    key={starVal}
                    onClick={() => {
                      handleUpdate({ score: starVal });
                      setShowRating(false);
                    }}
                    className="p-0.5 transition"
                    title={`${starVal} Star${starVal > 1 ? 's' : ''}`}
                  >
                    <Star
                      size={13}
                      fill={isActive ? 'currentColor' : 'none'}
                      className={isActive ? 'text-accent-gold' : 'text-text-disabled hover:text-accent-gold'}
                    />
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowRating(false)}
              className="text-[9px] font-bold text-text-muted hover:text-white uppercase block mx-auto pt-1"
            >
              ← Back
            </button>
          </div>
        )}

        {showNoteInput && (
          <div className="space-y-1 w-full">
            <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">Add Note</span>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write a quick note..."
              className="w-full h-14 bg-white/5 border border-white/10 rounded-lg p-1.5 text-[10px] text-white focus:outline-none focus:border-accent-violet resize-none"
            />
            <div className="flex justify-between items-center pt-1">
              <button
                onClick={() => setShowNoteInput(false)}
                className="text-[9px] font-bold text-text-muted hover:text-white uppercase"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleUpdate({ notes: noteText });
                  setShowNoteInput(false);
                }}
                className="px-2 py-0.5 bg-accent-violet rounded text-[9px] font-bold text-white hover:bg-accent-violet/80"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {!showCollections && !showRating && !showNoteInput && (
          <div className="grid grid-cols-5 gap-2 w-full px-2">
            {/* 1. Favorite Heart */}
            <button
              onClick={() => handleUpdate({ isFavorite: !isFavorite })}
              className={`p-2 rounded-xl flex items-center justify-center border transition-all ${
                isFavorite
                  ? 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20'
                  : 'bg-white/5 border-white/5 text-white/60 hover:text-white hover:border-white/20'
              }`}
              title={isFavorite ? 'Unfavorite' : 'Favorite'}
            >
              <Heart size={14} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>

            {/* 2. Complete Check */}
            <button
              onClick={() => handleUpdate({ status: 'completed' })}
              className={`p-2 rounded-xl flex items-center justify-center border transition-all ${
                status === 'completed'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-white/5 border-white/5 text-white/60 hover:text-white hover:border-white/20'
              }`}
              title="Mark Completed"
            >
              <Check size={14} />
            </button>

            {/* 3. Add to Collection */}
            <button
              onClick={() => setShowCollections(true)}
              className="p-2 rounded-xl bg-white/5 border border-white/5 text-white/60 hover:text-white hover:border-white/20 flex items-center justify-center transition-all"
              title="Add to Collection"
            >
              <Plus size={14} />
            </button>

            {/* 4. Quick Rate */}
            <button
              onClick={() => setShowRating(true)}
              className={`p-2 rounded-xl flex items-center justify-center border transition-all ${
                score !== null
                  ? 'bg-accent-gold/10 border-accent-gold/30 text-accent-gold hover:bg-accent-gold/20'
                  : 'bg-white/5 border-white/5 text-white/60 hover:text-white hover:border-white/20'
              }`}
              title="Rate Star"
            >
              <Star size={14} fill={score !== null ? 'currentColor' : 'none'} />
            </button>

            {/* 5. Add Note */}
            <button
              onClick={() => setShowNoteInput(true)}
              className={`p-2 rounded-xl flex items-center justify-center border transition-all ${
                notes
                  ? 'bg-accent-violet/10 border-accent-violet/30 text-accent-violet hover:bg-accent-violet/20'
                  : 'bg-white/5 border-white/5 text-white/60 hover:text-white hover:border-white/20'
              }`}
              title="Quick Note"
            >
              <FileText size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Bottom Status Label Indicator */}
      <div className="text-[8px] font-bold text-white/40 text-center w-full uppercase border-t border-white/5 pt-1 truncate">
        {isUpdating ? 'Saving...' : (status ? `Status: ${status}` : 'Not in Library')}
      </div>
    </div>
  );
}
