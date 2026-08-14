import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const syncOfflineWatchlist = (entries: Record<string, WatchlistEntry>) => {
  if (typeof window === 'undefined') return;
  const list = Object.values(entries);
  localStorage.setItem('offline-watchlist', JSON.stringify(list));
};

export interface WatchlistEntry {
  id: string;
  userId: string;
  animeId: string;
  animeTitle: string;
  animeImage: string;
  animeEpisodes: number | null;
  status: string;
  score: number | null;
  episodesWatched: number;
  rewatchCount: number;
  notes: string | null;
  isPrivate: boolean;
  isFavorite: boolean;
  isTopFavorite: boolean;
  topFavoriteOrder: number | null;
  updatedAt: string;
}

interface WatchlistState {
  entries: Record<string, WatchlistEntry>;
  loading: boolean;
  error: string | null;
  
  // Undo state
  undoActive: boolean;
  undoTimeoutId: any | null;
  previousState: Record<string, WatchlistEntry> | null;
  lastActionTargetIds: string[];
  lastActionType: 'update' | 'delete' | null;

  fetchList: () => Promise<void>;
  upsertEntry: (data: {
    animeId: string;
    animeTitle: string;
    animeImage: string;
    animeEpisodes?: number | null;
    status: string;
    score?: number | null;
    episodesWatched?: number;
    rewatchCount?: number;
    notes?: string | null;
    isPrivate?: boolean;
    isFavorite?: boolean;
    isTopFavorite?: boolean;
    topFavoriteOrder?: number | null;
  }) => Promise<void>;
  deleteEntry: (animeId: string) => Promise<void>;
  
  // Bulk operations
  bulkUpdateEntries: (animeIds: string[], fields: {
    status?: string;
    score?: number | null;
    isFavorite?: boolean;
    isPrivate?: boolean;
  }) => Promise<void>;
  bulkDeleteEntries: (animeIds: string[]) => Promise<void>;
  
  // Undo mechanics
  triggerUndo: () => Promise<void>;
  clearUndo: () => void;
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => {
      const registerUndo = (targetIds: string[], type: 'update' | 'delete') => {
    const currentTimeout = get().undoTimeoutId;
    if (currentTimeout) clearTimeout(currentTimeout);

    const timeoutId = setTimeout(() => {
      set({ undoActive: false, previousState: null, undoTimeoutId: null, lastActionTargetIds: [], lastActionType: null });
    }, 10000); // 10 seconds timeout

    set({
      undoActive: true,
      previousState: { ...get().entries },
      lastActionTargetIds: targetIds,
      lastActionType: type,
      undoTimeoutId: timeoutId,
    });
  };

  return {
    entries: {},
    loading: false,
    error: null,
    
    undoActive: false,
    undoTimeoutId: null,
    previousState: null,
    lastActionTargetIds: [],
    lastActionType: null,

    fetchList: async () => {
      set({ loading: true, error: null });
      try {
        const res = await fetch('/api/list/entry');
        if (res.ok) {
          const list: WatchlistEntry[] = await res.json();
          const entriesMap: Record<string, WatchlistEntry> = {};
          list.forEach((entry) => {
            entriesMap[entry.animeId] = entry;
          });
          set({ entries: entriesMap, loading: false });
          syncOfflineWatchlist(entriesMap);
        } else {
          set({ loading: false });
        }
      } catch (err: any) {
        set({ error: err.message || 'Failed to fetch list', loading: false });
      }
    },

    upsertEntry: async (data) => {
      const { animeId } = data;
      const currentEntries = get().entries;
      const previousEntries = { ...currentEntries };

      registerUndo([animeId], 'update');

      // Optimistic update
      const existingEntry = previousEntries[animeId];
      const tempEntry: WatchlistEntry = {
        id: existingEntry?.id || 'temp-id',
        userId: existingEntry?.userId || 'temp-user',
        animeId,
        animeTitle: data.animeTitle || existingEntry?.animeTitle || 'Loading...',
        animeImage: data.animeImage || existingEntry?.animeImage || '',
        animeEpisodes: data.animeEpisodes !== undefined ? data.animeEpisodes : existingEntry?.animeEpisodes || null,
        status: data.status,
        score: data.score !== undefined ? data.score : (existingEntry?.score ?? null),
        episodesWatched: data.episodesWatched !== undefined ? data.episodesWatched : (existingEntry?.episodesWatched ?? 0),
        rewatchCount: data.rewatchCount !== undefined ? data.rewatchCount : (existingEntry?.rewatchCount ?? 0),
        notes: data.notes !== undefined ? data.notes : (existingEntry?.notes ?? null),
        isPrivate: data.isPrivate !== undefined ? data.isPrivate : (existingEntry?.isPrivate ?? false),
        isFavorite: data.isFavorite !== undefined ? data.isFavorite : (existingEntry?.isFavorite ?? false),
        isTopFavorite: data.isTopFavorite !== undefined ? data.isTopFavorite : (existingEntry?.isTopFavorite ?? false),
        topFavoriteOrder: data.topFavoriteOrder !== undefined ? data.topFavoriteOrder : (existingEntry?.topFavoriteOrder ?? null),
        updatedAt: new Date().toISOString(),
      };

      const optimisticEntries = {
        ...currentEntries,
        [animeId]: tempEntry,
      };
      set({ entries: optimisticEntries });
      syncOfflineWatchlist(optimisticEntries);

      try {
        const res = await fetch('/api/list/entry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!res.ok) throw new Error('Failed to save tracking entry');

        const savedEntry: WatchlistEntry = await res.json();
        const finalEntries = {
          ...get().entries,
          [animeId]: savedEntry,
        };
        set({ entries: finalEntries });
        syncOfflineWatchlist(finalEntries);
      } catch (err) {
        set({ entries: previousEntries });
        syncOfflineWatchlist(previousEntries);
        console.error(err);
      }
    },

    deleteEntry: async (animeId) => {
      const currentEntries = get().entries;
      const previousEntries = { ...currentEntries };

      registerUndo([animeId], 'delete');

      const updatedEntries = { ...currentEntries };
      delete updatedEntries[animeId];
      set({ entries: updatedEntries });
      syncOfflineWatchlist(updatedEntries);

      try {
        const res = await fetch(`/api/list/entry?animeId=${animeId}`, {
          method: 'DELETE',
        });

        if (!res.ok) throw new Error('Failed to delete tracking entry');
      } catch (err) {
        set({ entries: previousEntries });
        syncOfflineWatchlist(previousEntries);
        console.error(err);
      }
    },

    bulkUpdateEntries: async (animeIds, fields) => {
      const currentEntries = get().entries;
      const previousEntries = { ...currentEntries };

      registerUndo(animeIds, 'update');

      // Optimistic update of multiple entries
      const updatedEntries = { ...currentEntries };
      animeIds.forEach((id) => {
        if (updatedEntries[id]) {
          updatedEntries[id] = {
            ...updatedEntries[id],
            ...fields,
            updatedAt: new Date().toISOString(),
          } as WatchlistEntry;
        }
      });
      set({ entries: updatedEntries });
      syncOfflineWatchlist(updatedEntries);

      try {
        const res = await fetch('/api/list/entry/bulk', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ animeIds, fields }),
        });

        if (!res.ok) throw new Error('Failed bulk update');
        
        const savedEntries: WatchlistEntry[] = await res.json();
        const mergedEntries = { ...get().entries };
        savedEntries.forEach((entry) => {
          mergedEntries[entry.animeId] = entry;
        });
        set({ entries: mergedEntries });
        syncOfflineWatchlist(mergedEntries);
      } catch (err) {
        set({ entries: previousEntries });
        syncOfflineWatchlist(previousEntries);
        console.error(err);
      }
    },

    bulkDeleteEntries: async (animeIds) => {
      const currentEntries = get().entries;
      const previousEntries = { ...currentEntries };

      registerUndo(animeIds, 'delete');

      const updatedEntries = { ...currentEntries };
      animeIds.forEach((id) => {
        delete updatedEntries[id];
      });
      set({ entries: updatedEntries });
      syncOfflineWatchlist(updatedEntries);

      try {
        const res = await fetch('/api/list/entry/bulk', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ animeIds }),
        });

        if (!res.ok) throw new Error('Failed bulk delete');
      } catch (err) {
        set({ entries: previousEntries });
        syncOfflineWatchlist(previousEntries);
        console.error(err);
      }
    },

    triggerUndo: async () => {
      const { previousState, undoTimeoutId, lastActionTargetIds, lastActionType } = get();
      if (!previousState || lastActionTargetIds.length === 0) return;

      if (undoTimeoutId) clearTimeout(undoTimeoutId);

      // Revert state in UI optimistically
      set({
        entries: previousState,
        undoActive: false,
        previousState: null,
        undoTimeoutId: null,
      });
      syncOfflineWatchlist(previousState);

      // Synchronize the undo with the backend
      try {
        if (lastActionType === 'delete' || lastActionType === 'update') {
          // Send all target entries back in their previous state
          const entriesToRestore = lastActionTargetIds.map(id => previousState[id]).filter(Boolean);
          
          if (entriesToRestore.length > 0) {
            await fetch('/api/list/entry/bulk', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ entries: entriesToRestore }),
            });
          }
        }
      } catch (err) {
        console.error('Failed to sync undo state to backend:', err);
      } finally {
        set({ lastActionTargetIds: [], lastActionType: null });
      }
    },

    clearUndo: () => {
      const currentTimeout = get().undoTimeoutId;
      if (currentTimeout) clearTimeout(currentTimeout);
      set({ undoActive: false, previousState: null, undoTimeoutId: null, lastActionTargetIds: [], lastActionType: null });
    },
  };
}, {
  name: 'aniworld-watchlist-store',
  partialize: (state) => ({
    entries: state.entries,
  }),
}));
