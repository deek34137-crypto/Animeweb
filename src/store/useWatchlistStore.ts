import { create } from 'zustand';

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
  updatedAt: string;
}

interface WatchlistState {
  entries: Record<string, WatchlistEntry>;
  loading: boolean;
  error: string | null;
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
  }) => Promise<void>;
  deleteEntry: (animeId: string) => Promise<void>;
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  entries: {},
  loading: false,
  error: null,

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
      } else {
        set({ loading: false });
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch list', loading: false });
    }
  },

  upsertEntry: async (data) => {
    const { animeId } = data;
    const previousEntries = { ...get().entries };

    // Optimistic Update
    const existingEntry = previousEntries[animeId];
    const tempEntry: WatchlistEntry = {
      id: existingEntry?.id || 'temp-id',
      userId: existingEntry?.userId || 'temp-user',
      animeId,
      animeTitle: data.animeTitle || existingEntry?.animeTitle || 'Loading...',
      animeImage: data.animeImage || existingEntry?.animeImage || '',
      animeEpisodes: data.animeEpisodes !== undefined ? data.animeEpisodes : existingEntry?.animeEpisodes || null,
      status: data.status,
      score: data.score !== undefined ? data.score : existingEntry?.score || null,
      episodesWatched: data.episodesWatched !== undefined ? data.episodesWatched : existingEntry?.episodesWatched || 0,
      rewatchCount: data.rewatchCount !== undefined ? data.rewatchCount : existingEntry?.rewatchCount || 0,
      notes: data.notes !== undefined ? data.notes : existingEntry?.notes || null,
      isPrivate: data.isPrivate !== undefined ? data.isPrivate : existingEntry?.isPrivate || false,
      updatedAt: new Date().toISOString(),
    };

    set({
      entries: {
        ...previousEntries,
        [animeId]: tempEntry,
      },
    });

    try {
      const res = await fetch('/api/list/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error('Failed to save tracking entry');
      }

      const savedEntry: WatchlistEntry = await res.json();
      set({
        entries: {
          ...get().entries,
          [animeId]: savedEntry,
        },
      });
    } catch (err) {
      // Revert on failure
      set({ entries: previousEntries });
      console.error(err);
    }
  },

  deleteEntry: async (animeId) => {
    const previousEntries = { ...get().entries };
    const updatedEntries = { ...previousEntries };
    delete updatedEntries[animeId];

    set({ entries: updatedEntries });

    try {
      const res = await fetch(`/api/list/entry?animeId=${animeId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete tracking entry');
      }
    } catch (err) {
      // Revert on failure
      set({ entries: previousEntries });
      console.error(err);
    }
  },
}));
