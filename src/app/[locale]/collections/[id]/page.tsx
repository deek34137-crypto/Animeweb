'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Link, useRouter } from '@/navigation';
import {
  Play, Star, Save, ArrowUp, ArrowDown, Share2, Clipboard,
  Download, Eye, Globe, EyeOff, Loader2, ArrowLeft, Trash2, Edit3, Film, ChevronDown
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import Progress from '@/components/ui/Progress';

// Simple Markdown parser for descriptions
function parseMarkdown(text: string) {
  if (!text) return '';
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

  return escaped
    .replace(/^# (.*$)/gim, '<h1 class="text-xl font-black mt-4 mb-2 text-white">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold mt-3 mb-1.5 text-white">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 class="text-md font-bold mt-2 mb-1 text-white">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/⭐ (.*)/g, '<span class="text-accent-gold">⭐</span> $1')
    .replace(/\n/g, '<br />');
}

export default function CollectionDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { data: session } = useSession();
  const isLoggedIn = !!session;
  const currentUserId = session?.user?.id;

  const [collection, setCollection] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Collection Metadata State
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editVis, setEditVis] = useState<'PRIVATE' | 'UNLISTED' | 'PUBLIC'>('PRIVATE');

  // Cover Selection State
  const [isEditingCover, setIsEditingCover] = useState(false);
  const [coverType, setCoverType] = useState('AUTO'); // AUTO, CUSTOM, ANIME
  const [customCoverUrl, setCustomCoverUrl] = useState('');
  const [selectedCoverAnimeId, setSelectedCoverAnimeId] = useState('');

  // Reordering & Sorting State
  const [sortBy, setSortBy] = useState('manual'); // manual, alphabetical, score, newest, oldest
  const [entriesList, setEntriesList] = useState<any[]>([]);

  // Entry Edit Notes/Score State
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [entryNote, setEntryNote] = useState('');
  const [entryScore, setEntryScore] = useState<number | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchCollectionDetails();
  }, [id]);

  const fetchCollectionDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/collections/${id}`);
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('This collection is private.');
        }
        throw new Error('Collection not found.');
      }
      const data = await res.json();
      setCollection(data);
      setEntriesList(data.entries || []);
      
      // Populate metadata edits
      setEditName(data.name);
      setEditDesc(data.description || '');
      setEditVis(data.visibility);
      setCoverType(data.coverSelectionType);
      setCustomCoverUrl(data.coverImage || '');
      setSelectedCoverAnimeId(data.coverAnimeId || '');
    } catch (err: any) {
      setError(err.message || 'Failed to load collection');
    } finally {
      setLoading(false);
    }
  };

  const isOwner = isLoggedIn && currentUserId === collection?.userId;

  // Sorting Handler
  useEffect(() => {
    if (!collection) return;
    const sorted = [...(collection.entries || [])];

    if (sortBy === 'alphabetical') {
      sorted.sort((a, b) => a.animeTitle.localeCompare(b.animeTitle));
    } else if (sortBy === 'score') {
      sorted.sort((a, b) => (b.score || 0) - (a.score || 0));
    } else if (sortBy === 'newest') {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === 'oldest') {
      sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else {
      // Manual sorting (sortOrder)
      sorted.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    setEntriesList(sorted);
  }, [sortBy, collection]);

  const handleSaveMeta = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/collections/${collection.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, description: editDesc, visibility: editVis }),
      });
      if (res.ok) {
        const updated = await res.json();
        // If slug changed, redirect to new slug
        if (updated.slug !== collection.slug) {
          router.push(`/collections/${updated.slug}` as '/');
        } else {
          setCollection((prev: any) => ({ ...prev, ...updated }));
          setIsEditingMeta(false);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCoverSettings = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/collections/${collection.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coverSelectionType: coverType,
          coverImage: customCoverUrl,
          coverAnimeId: selectedCoverAnimeId,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCollection((prev: any) => ({ ...prev, ...updated }));
        setIsEditingCover(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  // Reordering helpers (Shift Up/Down)
  const handleMoveEntry = async (index: number, direction: 'up' | 'down') => {
    if (sortBy !== 'manual') return; // Must be in manual sort to reorder
    const nextList = [...entriesList];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;

    if (targetIdx < 0 || targetIdx >= nextList.length) return;

    // Swap sortOrder attributes in state
    const tempOrder = nextList[index].sortOrder;
    nextList[index].sortOrder = nextList[targetIdx].sortOrder;
    nextList[targetIdx].sortOrder = tempOrder;

    // Swap positions in list
    const tempVal = nextList[index];
    nextList[index] = nextList[targetIdx];
    nextList[targetIdx] = tempVal;

    setEntriesList(nextList);

    // Optimistically push the update to database
    try {
      const reorderPayload = nextList.map(item => ({
        animeId: item.animeId,
        sortOrder: item.sortOrder,
      }));

      await fetch(`/api/collections/${collection.id}/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reorderPayload),
      });
    } catch (e) {
      console.error('Failed to sync reorder:', e);
    }
  };

  // HTML5 Native Drag and Drop for optimistic reordering
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const handleDragStart = (idx: number) => {
    if (sortBy !== 'manual') return;
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (sortBy !== 'manual' || draggedIdx === null || draggedIdx === idx) return;

    // Swap items in state
    const newList = [...entriesList];
    const draggedItem = newList[draggedIdx];
    newList.splice(draggedIdx, 1);
    newList.splice(idx, 0, draggedItem);

    // Recalculate sortOrders sequentially
    const updatedList = newList.map((item, index) => ({
      ...item,
      sortOrder: index,
    }));

    setDraggedIdx(idx);
    setEntriesList(updatedList);
  };

  const handleDragEnd = async () => {
    if (sortBy !== 'manual') return;
    setDraggedIdx(null);

    // Persist final sequence to DB
    try {
      const reorderPayload = entriesList.map((item, index) => ({
        animeId: item.animeId,
        sortOrder: index,
      }));

      await fetch(`/api/collections/${collection.id}/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reorderPayload),
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Entry Update note/score
  const handleEditEntry = (entry: any) => {
    setEditingEntryId(entry.id);
    setEntryNote(entry.notes || '');
    setEntryScore(entry.score);
  };

  const handleSaveEntry = async (entryAnimeId: string) => {
    try {
      const res = await fetch(`/api/collections/${collection.id}/entries`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          animeId: entryAnimeId,
          notes: entryNote,
          score: entryScore,
        }),
      });

      if (res.ok) {
        setCollection((prev: any) => ({
          ...prev,
          entries: prev.entries.map((e: any) =>
            e.animeId === entryAnimeId ? { ...e, notes: entryNote, score: entryScore } : e
          ),
        }));
        setEditingEntryId(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveEntry = async (entryAnimeId: string) => {
    if (!confirm('Remove this anime from the collection?')) return;
    try {
      const res = await fetch(`/api/collections/${collection.id}/entries?animeId=${entryAnimeId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setCollection((prev: any) => ({
          ...prev,
          entries: prev.entries.filter((e: any) => e.animeId !== entryAnimeId),
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const copyShareLink = () => {
    const url = `${window.location.origin}/collections/${collection.slug || collection.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-40">
        <Loader2 size={32} className="animate-spin text-accent-violet" />
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4">
        <div className="text-red-400 font-bold text-lg">{error || 'Collection not found.'}</div>
        <Link href="/profile" className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface-2 border border-border-default rounded-xl text-xs font-bold text-text-secondary hover:text-white transition">
          <ArrowLeft size={14} /> Back to Profile
        </Link>
      </div>
    );
  }

  // Calculate statistics
  const totalAnime = collection.entries.length;
  const scores = collection.entries.map((e: any) => e.score).filter((s: any): s is number => s !== null);
  const avgScore = scores.length > 0 ? (scores.reduce((a: number, b: number) => a + b, 0) / scores.length).toFixed(1) : 'N/A';
  const updatedDate = new Date(collection.updatedAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const cover = collection.coverSelectionType === 'ANIME' && collection.coverAnimeId
    ? collection.entries.find((e: any) => e.animeId === collection.coverAnimeId)?.animeImage
    : (collection.coverSelectionType === 'CUSTOM' ? collection.coverImage : collection.entries[0]?.animeImage);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8 animate-fade-up">
      {/* Back to Profile */}
      <Link href="/profile" className="inline-flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-text-primary transition-colors">
        <ArrowLeft size={13} /> Back to Profile
      </Link>

      {/* Hero Header panel */}
      <div className="relative rounded-3xl overflow-hidden border border-border-default bg-surface-2 shadow-lg p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center">
        {/* Cover image area */}
        <div className="relative w-44 h-60 bg-surface-3 rounded-2xl overflow-hidden border border-border-subtle flex items-center justify-center flex-shrink-0 group">
          {cover ? (
            <img src={cover} alt={collection.name} className="w-full h-full object-cover" />
          ) : (
            <Film size={36} className="text-text-disabled" />
          )}
          {isOwner && (
            <button
              onClick={() => setIsEditingCover(true)}
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold text-white gap-1"
            >
              <Edit3 size={13} /> Edit Cover
            </button>
          )}
        </div>

        {/* Collection details */}
        <div className="flex-grow space-y-4 text-center md:text-left w-full">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Curated by {collection.user.displayName || collection.user.username}</span>
            <span className="w-1 h-1 bg-white/20 rounded-full" />
            <span className="text-[10px] text-text-muted font-bold">Updated {updatedDate}</span>
            <span className="w-1 h-1 bg-white/20 rounded-full" />
            <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-lg px-2 py-0.5 border border-white/5">
              {collection.visibility === 'PUBLIC' && <Globe size={10} className="text-emerald-400" />}
              {collection.visibility === 'UNLISTED' && <Eye size={10} className="text-cyan-400" />}
              {collection.visibility === 'PRIVATE' && <EyeOff size={10} className="text-red-400" />}
              <span className="text-[9px] font-black text-white uppercase tracking-wider">{collection.visibility}</span>
            </div>
          </div>

          {isEditingMeta ? (
            <div className="space-y-3 max-w-xl">
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full bg-surface-3 border border-border-subtle focus:border-accent-violet focus:outline-none rounded-xl px-3 py-2 text-sm font-semibold text-text-primary"
              />
              <textarea
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                rows={3}
                className="w-full bg-surface-3 border border-border-subtle focus:border-accent-violet focus:outline-none rounded-xl px-3 py-2 text-xs font-semibold text-text-primary resize-none"
              />
              <div className="flex items-center gap-2">
                <select
                  value={editVis}
                  onChange={e => setEditVis(e.target.value as any)}
                  className="bg-surface-3 border border-border-subtle text-xs font-bold text-text-secondary pl-3 pr-8 py-2 rounded-xl focus:outline-none focus:border-accent-violet"
                >
                  <option value="PRIVATE">Private</option>
                  <option value="UNLISTED">Unlisted</option>
                  <option value="PUBLIC">Public</option>
                </select>
                <button
                  onClick={handleSaveMeta}
                  disabled={isSaving}
                  className="px-4 py-2 bg-accent-violet hover:bg-accent-violet/90 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                >
                  <Save size={12} /> Save
                </button>
                <button
                  onClick={() => setIsEditingMeta(false)}
                  className="px-4 py-2 bg-surface-3 text-text-secondary rounded-xl text-xs font-bold hover:bg-surface-1 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black text-text-primary font-display flex flex-wrap items-center justify-center md:justify-start gap-3">
                {collection.name}
                {isOwner && (
                  <button onClick={() => setIsEditingMeta(true)} className="p-1 hover:text-accent-violet transition-colors text-text-muted">
                    <Edit3 size={16} />
                  </button>
                )}
              </h1>
              <div
                className="text-xs sm:text-sm text-text-secondary max-w-xl leading-relaxed prose prose-invert font-medium"
                dangerouslySetInnerHTML={{ __html: parseMarkdown(collection.description || '') }}
              />
            </div>
          )}

          {/* Quick Collection Statistics */}
          <div className="grid grid-cols-3 gap-3 max-w-md pt-2">
            <div className="bg-surface-3/50 border border-border-subtle rounded-xl p-3 text-center">
              <span className="text-base font-black text-accent-violet block">{totalAnime}</span>
              <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Titles</span>
            </div>
            <div className="bg-surface-3/50 border border-border-subtle rounded-xl p-3 text-center">
              <span className="text-base font-black text-accent-gold block">{avgScore}</span>
              <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Avg Score</span>
            </div>
            <div className="bg-surface-3/50 border border-border-subtle rounded-xl p-3 text-center">
              <span className="text-base font-black text-accent-sakura block">Curated</span>
              <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Playlist</span>
            </div>
          </div>

          {/* Share options */}
          {collection.visibility !== 'PRIVATE' && (
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-2">
              <button
                onClick={copyShareLink}
                className="inline-flex items-center gap-1.5 px-4.5 py-2 bg-surface-3 hover:bg-surface-1 border border-border-subtle text-xs font-bold text-text-secondary rounded-xl transition"
              >
                <Clipboard size={12} /> {copied ? 'Copied!' : 'Copy Share Link'}
              </button>
              <a
                href={`/api/collections/${collection.id}/share-image`}
                download={`${collection.slug || 'collection'}-OG-card.svg`}
                className="inline-flex items-center gap-1.5 px-4.5 py-2 bg-surface-3 hover:bg-surface-1 border border-border-subtle text-xs font-bold text-text-secondary rounded-xl transition"
              >
                <Download size={12} /> Download OG Card
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Sorting panel */}
      <div className="flex justify-between items-center bg-surface-2 border border-border-default rounded-2xl p-4 shadow-sm flex-wrap gap-4">
        <div>
          <h3 className="text-sm font-bold text-text-primary">Anime Playlist</h3>
          <p className="text-xs text-text-muted">Order is managed dynamically.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted font-bold uppercase">Sort By:</span>
          <div className="relative">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="appearance-none bg-surface-3 border border-border-subtle text-xs font-bold text-text-secondary pl-3 pr-8 py-2 rounded-xl focus:outline-none focus:border-accent-violet cursor-pointer transition-colors"
            >
              <option value="manual">Manual Reorder</option>
              <option value="alphabetical">Alphabetical</option>
              <option value="score">Rating Score</option>
              <option value="newest">Newest Added</option>
              <option value="oldest">Oldest Added</option>
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Playlist Items */}
      {entriesList.length === 0 ? (
        <div className="glass-panel border border-border-default rounded-3xl p-16 text-center max-w-sm mx-auto space-y-3">
          <Film size={36} className="text-text-disabled mx-auto animate-pulse" />
          <h3 className="text-sm font-bold text-text-primary">Collection Empty</h3>
          <p className="text-xs text-text-muted">No titles have been added to this collection yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {entriesList.map((entry, index) => {
            const isEditingThisEntry = editingEntryId === entry.id;

            return (
              <div
                key={entry.id}
                draggable={isOwner && sortBy === 'manual'}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`bg-surface-2 border border-border-subtle rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm transition-all duration-300 ${
                  draggedIdx === index ? 'opacity-40 border-accent-violet bg-accent-violet/5' : 'hover:border-accent-violet/20'
                }`}
              >
                {/* Drag Handle & Info */}
                <div className="flex items-center gap-4 w-full md:w-auto">
                  {isOwner && sortBy === 'manual' && (
                    <div className="flex flex-col gap-1 text-text-disabled cursor-grab active:cursor-grabbing px-1">
                      <button onClick={() => handleMoveEntry(index, 'up')} disabled={index === 0} className="hover:text-white disabled:opacity-30 p-0.5">
                        <ArrowUp size={14} />
                      </button>
                      <button onClick={() => handleMoveEntry(index, 'down')} disabled={index === entriesList.length - 1} className="hover:text-white disabled:opacity-30 p-0.5">
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  )}

                  {/* Thumbnail cover */}
                  <div className="w-14 h-20 bg-surface-3 rounded-lg overflow-hidden border border-border-subtle flex-shrink-0">
                    <img src={entry.animeImage} alt={entry.animeTitle} className="w-full h-full object-cover" />
                  </div>

                  {/* Name and review note */}
                  <div className="space-y-1 w-full text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/anime/${entry.animeId}`} className="text-sm font-black text-text-primary hover:text-accent-violet transition-colors">
                        {entry.animeTitle}
                      </Link>
                      {entry.score && (
                        <div className="flex items-center gap-1 bg-accent-gold/10 border border-accent-gold/20 rounded-md px-1.5 py-0.5">
                          <Star size={9} fill="currentColor" className="text-accent-gold" />
                          <span className="text-[10px] font-black text-accent-gold">{entry.score.toFixed(1)}</span>
                        </div>
                      )}
                    </div>

                    {isEditingThisEntry ? (
                      <div className="space-y-2 pt-1.5 w-full">
                        <textarea
                          value={entryNote}
                          onChange={e => setEntryNote(e.target.value)}
                          placeholder="Write a custom review/note..."
                          rows={2}
                          className="w-full max-w-xl bg-surface-3 border border-border-subtle focus:border-accent-violet focus:outline-none rounded-lg px-2 py-1 text-xs text-text-primary resize-none"
                        />
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-text-muted font-bold uppercase">Custom Score:</span>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => (
                              <button key={v} onClick={() => setEntryScore(v)} className="p-0.5">
                                <Star size={12} fill={entryScore !== null && v <= entryScore ? 'currentColor' : 'none'} className={entryScore !== null && v <= entryScore ? 'text-accent-gold' : 'text-text-disabled hover:text-accent-gold'} />
                              </button>
                            ))}
                          </div>
                          <button onClick={() => setEntryScore(null)} className="text-[9px] text-text-muted hover:text-red-400 font-bold uppercase ml-2">Clear</button>
                        </div>
                      </div>
                    ) : (
                      entry.notes && (
                        <p className="text-xs text-text-secondary leading-relaxed font-medium bg-surface-3/30 border border-border-subtle/40 rounded-xl p-2.5 max-w-xl italic">
                          "{entry.notes}"
                        </p>
                      )
                    )}
                  </div>
                </div>

                {/* Actions row */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-end border-t md:border-t-0 border-white/5 pt-3 md:pt-0">
                  {isEditingThisEntry ? (
                    <>
                      <button
                        onClick={() => handleSaveEntry(entry.animeId)}
                        className="px-3 py-1.5 bg-accent-violet hover:bg-accent-violet/90 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                      >
                        <Save size={12} /> Save
                      </button>
                      <button
                        onClick={() => setEditingEntryId(null)}
                        className="px-3 py-1.5 bg-surface-3 text-text-secondary rounded-lg text-xs font-bold hover:bg-surface-1 transition"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    isOwner && (
                      <>
                        <button
                          onClick={() => handleEditEntry(entry)}
                          className="px-3 py-1.5 bg-surface-3 hover:bg-surface-1 border border-border-subtle text-text-secondary rounded-lg text-xs font-bold transition flex items-center gap-1"
                        >
                          <Edit3 size={11} /> Edit Note
                        </button>
                        <button
                          onClick={() => handleRemoveEntry(entry.animeId)}
                          className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition"
                          title="Remove from Collection"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )
                  )}

                  {!isEditingThisEntry && (
                    <Link
                      href={`/watch/${entry.animeId}/1` as '/'}
                      className="px-3 py-1.5 bg-accent-violet/10 text-accent-violet hover:bg-accent-violet/20 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <Play size={11} fill="currentColor" /> Play
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── COVER SETTINGS MODAL ───────────────────────────────────────────────── */}
      {isEditingCover && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-surface-2 border border-border-default rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-fade-up text-left">
            <h3 className="text-base font-black text-text-primary border-b border-white/5 pb-2">Edit Collection Cover</h3>
            
            <div className="space-y-1">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1">Cover Image Source</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setCoverType('AUTO')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center ${
                    coverType === 'AUTO' ? 'bg-accent-violet/10 border-accent-violet/30 text-accent-violet' : 'bg-surface-3 border-border-subtle text-text-secondary'
                  }`}
                >
                  Auto Cover
                </button>
                <button
                  onClick={() => setCoverType('CUSTOM')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center ${
                    coverType === 'CUSTOM' ? 'bg-accent-violet/10 border-accent-violet/30 text-accent-violet' : 'bg-surface-3 border-border-subtle text-text-secondary'
                  }`}
                >
                  Upload URL
                </button>
                <button
                  onClick={() => setCoverType('ANIME')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center ${
                    coverType === 'ANIME' ? 'bg-accent-violet/10 border-accent-violet/30 text-accent-violet' : 'bg-surface-3 border-border-subtle text-text-secondary'
                  }`}
                >
                  Choose Anime
                </button>
              </div>
            </div>

            {coverType === 'CUSTOM' && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Custom Image URL</label>
                <input
                  type="text"
                  placeholder="https://example.com/cover.jpg"
                  value={customCoverUrl}
                  onChange={e => setCustomCoverUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-3 border border-border-subtle focus:border-accent-violet focus:outline-none rounded-xl text-xs font-semibold text-text-primary"
                />
              </div>
            )}

            {coverType === 'ANIME' && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Select Anime from Collection</label>
                <select
                  value={selectedCoverAnimeId}
                  onChange={e => setSelectedCoverAnimeId(e.target.value)}
                  className="w-full bg-surface-3 border border-border-subtle text-xs font-bold text-text-secondary p-3 rounded-xl focus:outline-none focus:border-accent-violet cursor-pointer"
                >
                  <option value="">-- Choose Anime --</option>
                  {collection.entries.map((e: any) => (
                    <option key={e.id} value={e.animeId}>{e.animeTitle}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button
                onClick={() => setIsEditingCover(false)}
                className="px-4 py-2 rounded-xl bg-surface-3 hover:bg-surface-1 text-xs font-bold text-text-secondary transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCoverSettings}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-accent-violet text-white text-xs font-bold hover:bg-accent-violet/90 transition"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
