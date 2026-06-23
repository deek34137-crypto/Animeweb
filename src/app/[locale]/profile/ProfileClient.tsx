'use client';

import React, { useState, useEffect } from 'react';
import { Link, useRouter } from '@/navigation';
import {
  Play, Star, List, Film, Check, BookOpen, Pause, Trash, Heart,
  BarChart3, Calendar, Settings, Shield, EyeOff, Eye, Globe,
  FolderCheck, Plus, CheckSquare, Square, RefreshCcw, Search, Filter,
  ChevronDown, Download, Upload, ExternalLink, Undo2, AlertCircle, XCircle, Loader2
} from 'lucide-react';
import Progress from '@/components/ui/Progress';
import { useWatchlistStore } from '@/store/useWatchlistStore';
import { useSession } from 'next-auth/react';

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
  isFavorite: boolean;
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

type FilterStatus = 'all' | 'watching' | 'completed' | 'paused' | 'dropped' | 'planning' | 'favorites' | 'collections' | 'insights' | 'activity';

export default function ProfileClient({ listEntries, stats }: ProfileClientProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const isLoggedIn = !!session;

  const {
    entries,
    fetchList,
    bulkUpdateEntries,
    bulkDeleteEntries,
    undoActive,
    triggerUndo,
    clearUndo
  } = useWatchlistStore();

  const [activeTab, setActiveTab] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('all'); // all, TV, Movie, OVA
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedScore, setSelectedScore] = useState('all');

  // Bulk Edit State
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [showBulkCollectionDropdown, setShowBulkCollectionDropdown] = useState(false);

  // Collections, Insights, and Activity states
  const [collections, setCollections] = useState<any[]>([]);
  const [deletedCollections, setDeletedCollections] = useState<any[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');
  const [newColVis, setNewColVis] = useState<'PRIVATE' | 'UNLISTED' | 'PUBLIC'>('PRIVATE');

  const [insights, setInsights] = useState<any | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const [activity, setActivity] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  // Undo notification countdown timer
  const [undoCountdown, setUndoCountdown] = useState(10);

  // Load store watchlist entries on mount
  useEffect(() => {
    if (isLoggedIn) fetchList();
  }, [isLoggedIn, fetchList]);

  // Sync component data with store entries
  const currentWatchlist = Object.values(entries);

  // Handle undo timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (undoActive) {
      setUndoCountdown(10);
      interval = setInterval(() => {
        setUndoCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            clearUndo();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [undoActive, clearUndo]);

  // Fetch specialized tab contents
  useEffect(() => {
    if (activeTab === 'collections' && isLoggedIn) {
      fetchCollections();
    } else if (activeTab === 'insights' && isLoggedIn) {
      fetchInsights();
    } else if (activeTab === 'activity' && isLoggedIn) {
      fetchActivity();
    }
  }, [activeTab, isLoggedIn]);

  const fetchCollections = async () => {
    setCollectionsLoading(true);
    try {
      const [colRes, delRes] = await Promise.all([
        fetch('/api/collections'),
        fetch('/api/collections?showDeleted=true'),
      ]);
      const colData = await colRes.json();
      const delData = await delRes.json();

      if (colData.collections) setCollections(colData.collections);
      if (delData.collections) setDeletedCollections(delData.collections);
    } catch (e) {
      console.error(e);
    } finally {
      setCollectionsLoading(false);
    }
  };

  const fetchInsights = async () => {
    setInsightsLoading(true);
    try {
      const res = await fetch('/api/user/insights');
      const data = await res.json();
      setInsights(data);
    } catch (e) {
      console.error(e);
    } finally {
      setInsightsLoading(false);
    }
  };

  const fetchActivity = async () => {
    setActivityLoading(true);
    try {
      const res = await fetch('/api/user/activity');
      const data = await res.json();
      setActivity(data);
    } catch (e) {
      console.error(e);
    } finally {
      setActivityLoading(false);
    }
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName) return;

    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newColName, description: newColDesc, visibility: newColVis }),
      });
      if (res.ok) {
        setNewColName('');
        setNewColDesc('');
        setNewColVis('PRIVATE');
        setShowCreateModal(false);
        fetchCollections();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRestoreCollection = async (colId: string) => {
    try {
      const res = await fetch(`/api/collections/${colId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restore: true }),
      });
      if (res.ok) fetchCollections();
    } catch (e) {
      console.error(e);
    }
  };

  const handlePermanentDeleteCollection = async (colId: string) => {
    if (!confirm('Are you sure you want to permanently delete this collection? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/collections/${colId}`, { method: 'DELETE' });
      if (res.ok) fetchCollections();
    } catch (e) {
      console.error(e);
    }
  };

  // Bulk Actions
  const toggleSelectAll = () => {
    const visibleIds = filteredEntries.map(e => e.animeId);
    const allSelected = visibleIds.every(id => selectedIds[id]);

    const newSelections = { ...selectedIds };
    visibleIds.forEach(id => {
      if (allSelected) {
        delete newSelections[id];
      } else {
        newSelections[id] = true;
      }
    });
    setSelectedIds(newSelections);
  };

  const handleBulkMoveStatus = async (status: string) => {
    const ids = Object.keys(selectedIds);
    if (ids.length === 0) return;
    await bulkUpdateEntries(ids, { status });
    setSelectedIds({});
    setBulkMode(false);
  };

  const handleBulkFavoriteToggle = async (isFavorite: boolean) => {
    const ids = Object.keys(selectedIds);
    if (ids.length === 0) return;
    await bulkUpdateEntries(ids, { isFavorite });
    setSelectedIds({});
    setBulkMode(false);
  };

  const handleBulkDelete = async () => {
    const ids = Object.keys(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`Are you sure you want to delete these ${ids.length} entries from your library?`)) return;
    await bulkDeleteEntries(ids);
    setSelectedIds({});
    setBulkMode(false);
  };

  const handleBulkAddToCollection = async (colId: string) => {
    const ids = Object.keys(selectedIds);
    if (ids.length === 0) return;

    setIsUpdatingState(true);
    try {
      await Promise.all(
        ids.map(async id => {
          const entry = entries[id];
          if (entry) {
            await fetch(`/api/collections/${colId}/entries`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                animeId: id,
                animeTitle: entry.animeTitle,
                animeImage: entry.animeImage,
              }),
            });
          }
        })
      );
      alert('Selected anime added to collection successfully.');
      setSelectedIds({});
      setBulkMode(false);
      setShowBulkCollectionDropdown(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingState(false);
    }
  };

  const [isUpdatingState, setIsUpdatingState] = useState(false);

  // Tabs Definitions
  const tabs: { key: FilterStatus; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'all', label: 'All Anime', icon: <List size={14} />, count: currentWatchlist.length },
    { key: 'watching', label: 'Watching', icon: <Play size={14} className="text-status-watching" />, count: currentWatchlist.filter(e => e.status === 'watching').length },
    { key: 'completed', label: 'Completed', icon: <Check size={14} className="text-status-completed" />, count: currentWatchlist.filter(e => e.status === 'completed').length },
    { key: 'paused', label: 'On Hold', icon: <Pause size={14} className="text-status-paused" />, count: currentWatchlist.filter(e => e.status === 'paused').length },
    {key: 'dropped', label: 'Dropped', icon: <XCircle size={14} className="text-status-dropped" />, count: currentWatchlist.filter(e => e.status === 'dropped').length },
    { key: 'planning', label: 'Plan to Watch', icon: <BookOpen size={14} className="text-status-planning" />, count: currentWatchlist.filter(e => e.status === 'planning').length },
    { key: 'favorites', label: 'Favorites', icon: <Heart size={14} fill="currentColor" className="text-red-500" />, count: currentWatchlist.filter(e => e.isFavorite).length },
    { key: 'collections', label: 'Collections', icon: <FolderCheck size={14} className="text-accent-gold" /> },
    { key: 'insights', label: 'Insights', icon: <BarChart3 size={14} className="text-accent-sakura" /> },
    { key: 'activity', label: 'Activity Log', icon: <Calendar size={14} className="text-cyan-400" /> },
  ];

  // Filtering Logic
  const filteredEntries = currentWatchlist.filter((entry) => {
    // 1. Status/Favorite Tab Filter
    if (activeTab === 'favorites') {
      if (!entry.isFavorite) return false;
    } else if (activeTab !== 'all' && activeTab !== 'collections' && activeTab !== 'insights' && activeTab !== 'activity') {
      if (entry.status !== activeTab) return false;
    }

    // 2. Search query (supports English, Romaji and alternates lookups)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!entry.animeTitle.toLowerCase().includes(q)) return false;
    }

    // 3. Score Filter
    if (selectedScore !== 'all') {
      const limit = parseFloat(selectedScore);
      if (!entry.score || entry.score < limit) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 relative pb-20">
      {/* Navigation Tabs */}
      <div className="flex gap-1.5 overflow-x-auto rail-scroll pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setBulkMode(false);
              setSelectedIds({});
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex-shrink-0 transition-all ${
              activeTab === tab.key
                ? 'bg-accent-violet text-white shadow-[0_0_12px_rgba(124,91,255,0.4)]'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-2 bg-surface-1 border border-border-subtle'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-white/20' : 'bg-surface-3 text-text-muted'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* SEARCH AND FILTERS PANEL (Only shown for list entry views) */}
      {activeTab !== 'collections' && activeTab !== 'insights' && activeTab !== 'activity' && (
        <div className="bg-surface-2 border border-border-default rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm animate-fade-up">
          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <input
              type="text"
              placeholder="Search library (English/Romaji)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-3 border border-border-subtle focus:border-accent-violet focus:outline-none rounded-xl text-xs font-semibold text-text-primary placeholder:text-text-muted transition-colors"
            />
          </div>

          {/* Filter dropdowns */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            {/* Score filter */}
            <div className="relative">
              <select
                value={selectedScore}
                onChange={(e) => setSelectedScore(e.target.value)}
                className="appearance-none bg-surface-3 border border-border-subtle text-xs font-bold text-text-secondary pl-3 pr-8 py-2 rounded-xl focus:outline-none focus:border-accent-violet cursor-pointer transition-colors"
              >
                <option value="all">Rating: All</option>
                <option value="9">⭐ 9.0+ Excellent</option>
                <option value="8">⭐ 8.0+ Very Good</option>
                <option value="7">⭐ 7.0+ Good</option>
                <option value="5">⭐ 5.0+ Average</option>
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            </div>

            {/* Bulk Mode Toggle */}
            <button
              onClick={() => {
                setBulkMode(!bulkMode);
                setSelectedIds({});
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                bulkMode
                  ? 'bg-accent-sakura/10 border-accent-sakura/30 text-accent-sakura shadow-[0_0_8px_rgba(236,72,153,0.1)]'
                  : 'bg-surface-3 border-border-subtle hover:border-border-emphasis text-text-secondary'
              }`}
            >
              <CheckSquare size={13} />
              {bulkMode ? 'Cancel Bulk Edit' : 'Bulk Edit'}
            </button>

            {/* Export Menu */}
            <div className="relative group">
              <button className="flex items-center gap-1.5 px-4 py-2 bg-surface-3 border border-border-subtle hover:border-border-emphasis text-text-secondary rounded-xl text-xs font-bold transition-all">
                <Download size={13} /> Export Library
              </button>
              <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl bg-surface-2 border border-border-default shadow-xl z-50 p-1 space-y-0.5 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200">
                <a href="/api/library/export?format=json" download className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold text-text-secondary hover:text-white hover:bg-white/5">
                  JSON backup <span className="text-[9px] text-text-muted">.json</span>
                </a>
                <a href="/api/library/export?format=csv" download className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold text-text-secondary hover:text-white hover:bg-white/5">
                  CSV spreadsheet <span className="text-[9px] text-text-muted">.csv</span>
                </a>
                <a href="/api/library/export?format=markdown" download className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold text-text-secondary hover:text-white hover:bg-white/5">
                  Markdown List <span className="text-[9px] text-text-muted">.md</span>
                </a>
                <a href="/api/library/export?format=mal" download className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold text-text-secondary hover:text-white hover:bg-white/5">
                  MyAnimeList XML <span className="text-[9px] text-text-muted">.xml</span>
                </a>
                <a href="/api/library/export?format=anilist" download className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold text-text-secondary hover:text-white hover:bg-white/5">
                  AniList Import <span className="text-[9px] text-text-muted">.json</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 1: LIST ENTRIES (GRID DISPLAY) ─────────────────────────────────── */}
      {activeTab !== 'collections' && activeTab !== 'insights' && activeTab !== 'activity' && (
        <>
          {bulkMode && (
            <div className="flex items-center justify-between px-4 py-2 bg-accent-violet/10 border border-accent-violet/30 rounded-xl text-xs font-semibold text-accent-violet animate-fade-down">
              <div className="flex items-center gap-2">
                <button onClick={toggleSelectAll} className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-2 border border-border-subtle rounded-lg text-text-primary hover:bg-surface-3 transition">
                  {filteredEntries.every(e => selectedIds[e.animeId]) ? 'Deselect All' : 'Select All'}
                </button>
                <span>Selected {Object.keys(selectedIds).length} / {filteredEntries.length} items</span>
              </div>
            </div>
          )}

          {filteredEntries.length === 0 ? (
            <div className="glass-panel border border-border-default rounded-3xl p-16 text-center max-w-sm mx-auto space-y-3">
              <Film size={36} className="text-text-disabled mx-auto animate-pulse" />
              <h3 className="text-sm font-bold text-text-primary">No Anime Found</h3>
              <p className="text-xs text-text-muted">No titles matched your current filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredEntries.map((entry) => {
                const isSelected = !!selectedIds[entry.animeId];
                const totalEps = entry.animeEpisodes || 0;
                const progressPct = totalEps > 0 ? Math.round((entry.episodesWatched / totalEps) * 100) : 0;
                const nextEp = entry.status === 'completed' ? 1 : Math.min(totalEps || 999, entry.episodesWatched + 1);

                return (
                  <div
                    key={entry.id}
                    onClick={() => {
                      if (bulkMode) {
                        const nextSelections = { ...selectedIds };
                        if (isSelected) {
                          delete nextSelections[entry.animeId];
                        } else {
                          nextSelections[entry.animeId] = true;
                        }
                        setSelectedIds(nextSelections);
                      }
                    }}
                    className={`group relative flex flex-col bg-surface-2 border rounded-xl overflow-hidden transition-all duration-300 shadow-sm cursor-pointer ${
                      isSelected 
                        ? 'border-accent-violet bg-accent-violet/5 ring-1 ring-accent-violet' 
                        : 'border-border-subtle hover:border-accent-violet/40'
                    }`}
                  >
                    {/* Poster Cover */}
                    <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface-3 border-b border-border-subtle">
                      <img
                        src={entry.animeImage}
                        alt={entry.animeTitle}
                        className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-500 ease-out"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#05050A]/90 via-[#05050A]/30 to-transparent" />

                      {/* Checkbox overlay in Bulk Mode */}
                      {bulkMode && (
                        <div className="absolute top-2 right-2 z-30 p-1.5 rounded-lg bg-black/60 backdrop-blur-sm">
                          {isSelected ? (
                            <CheckSquare size={16} className="text-accent-violet" />
                          ) : (
                            <Square size={16} className="text-white/60" />
                          )}
                        </div>
                      )}

                      {/* Favorite indicator heart */}
                      {entry.isFavorite && (
                        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-red-500/80 backdrop-blur-sm rounded-lg p-1.5 text-white">
                          <Heart size={10} fill="currentColor" />
                        </div>
                      )}

                      {/* Score Tag */}
                      {entry.score && (
                        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-0.5">
                          <Star size={10} fill="currentColor" className="text-accent-gold" />
                          <span className="text-[10px] font-bold text-text-primary">{entry.score.toFixed(1)}</span>
                        </div>
                      )}

                      {/* Play Button Overlay (Only when not in bulk mode) */}
                      {!bulkMode && (
                        <Link
                          href={`/watch/${entry.animeId}/${nextEp}` as '/'}
                          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        >
                          <div className="w-10 h-10 rounded-full bg-accent-violet/90 backdrop-blur-xs flex items-center justify-center shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform duration-200">
                            <Play size={16} fill="white" className="text-white ml-0.5" />
                          </div>
                        </Link>
                      )}

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
                        onClick={(e) => {
                          if (bulkMode) {
                            e.preventDefault();
                            e.stopPropagation();
                          }
                        }}
                      >
                        {entry.animeTitle}
                      </Link>

                      {totalEps > 0 && (
                        <Progress value={entry.episodesWatched} max={totalEps} variant="violet" size="xs" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ─── TAB 2: CUSTOM COLLECTIONS ──────────────────────────────────────────── */}
      {activeTab === 'collections' && (
        <div className="space-y-8 animate-fade-up">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-text-primary">Custom Playlists &amp; Collections</h2>
              <p className="text-xs text-text-muted">Group your favorites into unlimited shareable lists.</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent-violet text-white text-xs font-bold hover:bg-accent-violet/90 transition shadow-[0_4px_12px_rgba(124,91,255,0.3)]"
            >
              <Plus size={14} /> Create Collection
            </button>
          </div>

          {collectionsLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 size={32} className="animate-spin text-accent-violet" />
            </div>
          ) : collections.length === 0 ? (
            <div className="glass-panel border border-border-default rounded-3xl p-16 text-center max-w-sm mx-auto space-y-3">
              <FolderCheck size={36} className="text-text-disabled mx-auto" />
              <h3 className="text-sm font-bold text-text-primary">No Collections Yet</h3>
              <p className="text-xs text-text-muted">Create a custom list to group your favorite shows.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {collections.map((col) => {
                const count = col.entries.length;
                const cover = col.coverSelectionType === 'ANIME' && col.coverAnimeId
                  ? col.entries.find((e: any) => e.animeId === col.coverAnimeId)?.animeImage
                  : (col.coverSelectionType === 'CUSTOM' ? col.coverImage : col.entries[0]?.animeImage);

                return (
                  <div key={col.id} className="bg-surface-2 border border-border-subtle rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between hover:border-accent-violet/40 transition-colors">
                    <div className="p-5 space-y-4">
                      {/* Cover Thumbnail Grid */}
                      <div className="relative h-32 bg-surface-3 rounded-xl overflow-hidden border border-border-subtle flex items-center justify-center">
                        {cover ? (
                          <img src={cover} alt={col.name} className="w-full h-full object-cover opacity-60" />
                        ) : (
                          <Film size={28} className="text-text-disabled" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-surface-2 to-transparent" />
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md rounded-lg px-2.5 py-1">
                          {col.visibility === 'PUBLIC' && <Globe size={11} className="text-emerald-400" />}
                          {col.visibility === 'UNLISTED' && <Eye size={11} className="text-cyan-400" />}
                          {col.visibility === 'PRIVATE' && <EyeOff size={11} className="text-red-400" />}
                          <span className="text-[10px] font-black uppercase text-white tracking-wider">{col.visibility}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Link href={`/collections/${col.slug || col.id}`} className="text-base font-black text-text-primary hover:text-accent-violet transition-colors block">
                          {col.name}
                        </Link>
                        <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">{col.description || 'No description provided.'}</p>
                      </div>
                    </div>

                    <div className="px-5 py-3 border-t border-border-subtle bg-surface-3/50 flex justify-between items-center text-xs font-semibold text-text-secondary">
                      <span>{count} titles listed</span>
                      <div className="flex items-center gap-3">
                        <Link href={`/collections/${col.slug || col.id}`} className="text-accent-violet hover:underline flex items-center gap-0.5">
                          View <ExternalLink size={11} />
                        </Link>
                        <button onClick={() => {
                          if (confirm('Move this collection to Trash?')) {
                            fetch(`/api/collections/${col.id}`, { method: 'DELETE' }).then(() => fetchCollections());
                          }
                        }} className="text-red-400 hover:text-red-300">
                          <Trash size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TRASH BIN SECTION (Soft-deleted Collections) */}
          {deletedCollections.length > 0 && (
            <div className="pt-8 border-t border-border-subtle space-y-4">
              <div>
                <h3 className="text-sm font-black text-red-400 uppercase tracking-widest">🗑️ Trash Bin (Deleted Collections)</h3>
                <p className="text-[10px] text-text-muted">Collections here can be restored within 30 days before permanent deletion.</p>
              </div>
              <div className="space-y-2 max-w-2xl">
                {deletedCollections.map((col) => (
                  <div key={col.id} className="flex items-center justify-between p-3 bg-surface-2 border border-red-500/10 rounded-xl text-xs font-semibold">
                    <div className="flex flex-col">
                      <span className="font-bold text-text-primary">{col.name}</span>
                      <span className="text-[10px] text-text-muted">Deleted {new Date(col.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRestoreCollection(col.id)}
                        className="flex items-center gap-1 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition"
                      >
                        <RefreshCcw size={11} /> Restore
                      </button>
                      <button
                        onClick={() => handlePermanentDeleteCollection(col.id)}
                        className="flex items-center gap-1 px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition"
                      >
                        <Trash size={11} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: INSIGHTS & ANALYTICS ────────────────────────────────────────── */}
      {activeTab === 'insights' && (
        <div className="space-y-8 animate-fade-up">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Library Insights &amp; Statistics</h2>
            <p className="text-xs text-text-muted">Analytics derived from your watching patterns and scores.</p>
          </div>

          {insightsLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 size={32} className="animate-spin text-accent-violet" />
            </div>
          ) : insights ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left bento: Circular Progress stats */}
              <div className="bg-surface-2 border border-border-default rounded-3xl p-6 space-y-6 shadow-sm flex flex-col justify-between md:col-span-1">
                <h3 className="text-xs font-black uppercase tracking-widest text-text-muted">Completion Ratio</h3>
                <div className="flex flex-col items-center justify-center space-y-4 py-4">
                  <div className="relative w-36 h-36 flex items-center justify-center rounded-full border-8 border-surface-3 shadow-inner">
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                      <circle
                        cx="72"
                        cy="72"
                        r="64"
                        fill="none"
                        stroke="var(--player-accent, #7c3aed)"
                        strokeWidth="8"
                        strokeDasharray={402}
                        strokeDashoffset={402 - (402 * insights.completedPct) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="text-center">
                      <span className="text-3xl font-black text-text-primary">{insights.completedPct}%</span>
                      <span className="text-[10px] text-text-muted block font-bold uppercase mt-0.5">Completed</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center border-t border-white/5 pt-4">
                  <div>
                    <span className="text-lg font-black text-accent-violet">{insights.watchingCount}</span>
                    <span className="text-[9px] text-text-muted block font-bold uppercase mt-0.5">📺 Watching</span>
                  </div>
                  <div>
                    <span className="text-lg font-black text-accent-gold">{insights.planningCount}</span>
                    <span className="text-[9px] text-text-muted block font-bold uppercase mt-0.5">📅 Plan to Watch</span>
                  </div>
                </div>
              </div>

              {/* Right bento: Metric Grid */}
              <div className="md:col-span-2 grid grid-cols-2 gap-4">
                <div className="bg-surface-2 border border-border-subtle rounded-2xl p-5 text-center flex flex-col justify-center space-y-1">
                  <span className="text-2xl font-black text-accent-sakura">🎬 {insights.favoriteGenre}</span>
                  <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Favorite Genre</span>
                </div>
                <div className="bg-surface-2 border border-border-subtle rounded-2xl p-5 text-center flex flex-col justify-center space-y-1">
                  <span className="text-2xl font-black text-accent-gold">🏢 {insights.topStudio}</span>
                  <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Favorite Studio</span>
                </div>
                <div className="bg-surface-2 border border-border-subtle rounded-2xl p-5 text-center flex flex-col justify-center space-y-1 col-span-2">
                  <span className="text-lg font-black text-white">🎙️ {insights.favoriteVA}</span>
                  <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Most Watched Voice Actor</span>
                </div>
                <div className="bg-surface-2 border border-border-subtle rounded-2xl p-5 text-center flex flex-col justify-center space-y-1">
                  <span className="text-xl font-black text-cyan-400">{insights.averageRating}</span>
                  <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Average Rating Score</span>
                </div>
                <div className="bg-surface-2 border border-border-subtle rounded-2xl p-5 text-center flex flex-col justify-center space-y-1">
                  <span className="text-xl font-black text-accent-violet">⏱️ {insights.totalWatchTimeHours}h</span>
                  <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Total Watch Time</span>
                </div>
                {insights.longestAnime && (
                  <div className="bg-surface-2 border border-border-subtle rounded-2xl p-5 text-center flex flex-col justify-center space-y-1 col-span-2">
                    <span className="text-sm font-black text-text-primary truncate">👑 {insights.longestAnime.title} ({insights.longestAnime.episodes} eps)</span>
                    <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Longest Show in Library</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-text-muted">Unable to calculate insights.</p>
          )}
        </div>
      )}

      {/* ─── TAB 4: ACTIVITY LOGS TIMELINE ──────────────────────────────────────── */}
      {activeTab === 'activity' && (
        <div className="space-y-8 animate-fade-up max-w-2xl">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Library Activity Log</h2>
            <p className="text-xs text-text-muted">Milestones and recent events in your tracking history.</p>
          </div>

          {activityLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 size={32} className="animate-spin text-accent-violet" />
            </div>
          ) : activity.length === 0 ? (
            <div className="glass-panel border border-border-default rounded-3xl p-16 text-center space-y-3">
              <Calendar size={36} className="text-text-disabled mx-auto" />
              <h3 className="text-sm font-bold text-text-primary">No Activity Yet</h3>
              <p className="text-xs text-text-muted">Your milestones will be displayed here as you watch.</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-border-subtle ml-4 pl-6 space-y-6">
              {activity.map((log) => (
                <div key={log.id} className="relative">
                  {/* Dot */}
                  <span className="absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-surface-1 bg-accent-violet shadow-md flex items-center justify-center">
                    <span className="w-1.5 h-1.5 bg-white rounded-full" />
                  </span>
                  
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-text-primary">
                        {log.action.toUpperCase() === 'RATED' && '⭐ Rated'}
                        {log.action.toUpperCase() === 'STATUS_CHANGE' && '📺 Updated Status'}
                        {log.action.toUpperCase() === 'FAVORITE' && '❤️ Favorited'}
                        {log.action.toUpperCase() === 'ADD_LIBRARY' && '➕ Added to Library'}
                        {log.action.toUpperCase() === 'ADD_COLLECTION_ENTRY' && '📁 Added to Collection'}
                        {log.action.toUpperCase() === 'REMOVE_COLLECTION_ENTRY' && '🗑️ Removed from Collection'}
                        {log.action.toUpperCase() === 'RESTORE' && '🔄 Restored Tracking'}
                        {log.action.toUpperCase() === 'DELETE' && '❌ Removed Entry'}
                        {log.action.toUpperCase() === 'CREATE_COLLECTION' && '📂 Created Collection'}
                        {log.action.toUpperCase() === 'UPDATE_COLLECTION' && '📝 Updated Collection'}
                        {log.action.toUpperCase() === 'SOFT_DELETE_COLLECTION' && '🗑️ Archived Collection'}
                        {log.action.toUpperCase() === 'RESTORE_COLLECTION' && '🔄 Restored Collection'}
                        {log.action.toUpperCase() === 'DELETE_COLLECTION' && '❌ Deleted Collection'}
                      </span>
                      {log.animeId && (
                        <Link href={`/anime/${log.animeId}`} className="text-xs font-semibold text-accent-sakura hover:underline">
                          {log.animeTitle}
                        </Link>
                      )}
                      <span className="text-[10px] text-text-muted ml-auto font-medium">{new Date(log.createdAt).toLocaleDateString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-xs text-text-muted leading-relaxed font-semibold">{log.details}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── FLOATING BULK EDIT ACTIONS BAR ────────────────────────────────────── */}
      {bulkMode && Object.keys(selectedIds).length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface-2/95 border border-border-default backdrop-blur-md rounded-2xl p-4 shadow-2xl z-40 flex flex-wrap items-center gap-3 animate-fade-up max-w-[90%] md:max-w-max">
          <span className="text-xs font-black text-text-primary px-2 border-r border-white/10">{Object.keys(selectedIds).length} Selected</span>
          
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Status change actions */}
            <button onClick={() => handleBulkMoveStatus('watching')} className="px-3 py-1.5 bg-status-watching/10 text-status-watching hover:bg-status-watching/20 rounded-lg text-[10px] font-black uppercase">Watching</button>
            <button onClick={() => handleBulkMoveStatus('completed')} className="px-3 py-1.5 bg-status-completed/10 text-status-completed hover:bg-status-completed/20 rounded-lg text-[10px] font-black uppercase">Completed</button>
            <button onClick={() => handleBulkMoveStatus('paused')} className="px-3 py-1.5 bg-status-paused/10 text-status-paused hover:bg-status-paused/20 rounded-lg text-[10px] font-black uppercase">On Hold</button>
            <button onClick={() => handleBulkMoveStatus('dropped')} className="px-3 py-1.5 bg-status-dropped/10 text-status-dropped hover:bg-status-dropped/20 rounded-lg text-[10px] font-black uppercase">Dropped</button>
            
            <span className="w-[1px] h-6 bg-white/10 mx-1" />

            {/* Favorite toggle */}
            <button onClick={() => handleBulkFavoriteToggle(true)} className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-[10px] font-black" title="Favorite Selected"><Heart size={14} fill="currentColor" /></button>
            <button onClick={() => handleBulkFavoriteToggle(false)} className="p-1.5 bg-white/5 text-text-muted hover:text-white rounded-lg text-[10px] font-black" title="Unfavorite Selected"><Heart size={14} /></button>

            {/* Add to collection bulk */}
            <div className="relative">
              <button
                onClick={() => setShowBulkCollectionDropdown(!showBulkCollectionDropdown)}
                className="px-3 py-1.5 bg-accent-gold/10 hover:bg-accent-gold/20 text-accent-gold rounded-lg text-[10px] font-black uppercase flex items-center gap-1"
              >
                + Add Collection <ChevronDown size={10} />
              </button>
              {showBulkCollectionDropdown && (
                <div className="absolute bottom-full right-0 mb-2 w-48 rounded-xl bg-surface-2 border border-border-default shadow-xl p-1 z-50 space-y-0.5">
                  {collections.map(col => (
                    <button
                      key={col.id}
                      onClick={() => handleBulkAddToCollection(col.id)}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold text-text-secondary hover:text-white hover:bg-white/5 truncate"
                    >
                      {col.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <span className="w-[1px] h-6 bg-white/10 mx-1" />

            {/* Bulk Delete */}
            <button onClick={handleBulkDelete} className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg" title="Delete Selected"><Trash size={14} /></button>
          </div>
        </div>
      )}

      {/* ─── FLOATING SINGLE-STEP 10s UNDO TOAST ─────────────────────────────────── */}
      {undoActive && (
        <div className="fixed bottom-6 left-4 bg-surface-2/95 border border-accent-violet/30 backdrop-blur-md rounded-2xl p-4 shadow-2xl z-50 flex items-center gap-4 animate-fade-right w-80">
          <AlertCircle size={20} className="text-accent-violet flex-shrink-0 animate-bounce" />
          <div className="flex-grow space-y-0.5">
            <h4 className="text-xs font-black text-text-primary">Library entry updated</h4>
            <p className="text-[10px] text-text-muted font-bold">You can undo this action within {undoCountdown} seconds.</p>
          </div>
          <button
            onClick={triggerUndo}
            className="flex items-center gap-1 px-3 py-1.5 bg-accent-violet text-white text-[10px] font-black uppercase rounded-lg hover:bg-accent-violet/85 transition"
          >
            <Undo2 size={11} /> Undo
          </button>
        </div>
      )}

      {/* ─── CREATE COLLECTION MODAL ────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreateCollection} className="bg-surface-2 border border-border-default rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-fade-up">
            <h3 className="text-base font-black text-text-primary border-b border-white/5 pb-2">Create Custom Collection</h3>
            
            <div className="space-y-1">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">Collection Name</label>
              <input
                type="text"
                placeholder="e.g. Must Watch Dark Fantasy"
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-surface-3 border border-border-subtle focus:border-accent-violet focus:outline-none rounded-xl text-xs font-semibold text-text-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">Description (Markdown Supported)</label>
              <textarea
                placeholder="Write a brief description for this playlist..."
                value={newColDesc}
                onChange={(e) => setNewColDesc(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-surface-3 border border-border-subtle focus:border-accent-violet focus:outline-none rounded-xl text-xs font-semibold text-text-primary resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Visibility Settings</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setNewColVis('PRIVATE')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                    newColVis === 'PRIVATE'
                      ? 'bg-red-500/10 border-red-500/30 text-red-400'
                      : 'bg-surface-3 border-border-subtle text-text-secondary'
                  }`}
                >
                  <EyeOff size={12} /> Private
                </button>
                <button
                  type="button"
                  onClick={() => setNewColVis('UNLISTED')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                    newColVis === 'UNLISTED'
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                      : 'bg-surface-3 border-border-subtle text-text-secondary'
                  }`}
                >
                  <Eye size={12} /> Unlisted
                </button>
                <button
                  type="button"
                  onClick={() => setNewColVis('PUBLIC')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                    newColVis === 'PUBLIC'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-surface-3 border-border-subtle text-text-secondary'
                  }`}
                >
                  <Globe size={12} /> Public
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl bg-surface-3 hover:bg-surface-1 text-xs font-bold text-text-secondary transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-accent-violet text-white text-xs font-bold hover:bg-accent-violet/90 transition"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
