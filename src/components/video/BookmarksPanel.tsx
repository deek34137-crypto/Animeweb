'use client';

import React, { useState } from 'react';
import { Play, Trash2, Edit2, Check, X, Bookmark, Plus } from 'lucide-react';

interface EpisodeBookmark {
  id: string;
  timestamp: number;
  note?: string | null;
  label?: string | null;
}

interface BookmarksPanelProps {
  bookmarks: EpisodeBookmark[];
  currentTime: number;
  onSeek: (timestamp: number) => void;
  onAddBookmark: (timestamp: number, note: string) => Promise<void>;
  onDeleteBookmark: (id: string) => Promise<void>;
  onUpdateNote: (id: string, note: string) => Promise<void>;
  onClose: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Simple client-side Markdown formatter for rich-text notes
function parseInlineMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let currentText = text;
  let i = 0;
  
  while (i < currentText.length) {
    if (currentText.substring(i, i + 2) === '**') {
      const closingIndex = currentText.indexOf('**', i + 2);
      if (closingIndex !== -1) {
        parts.push(
          <strong key={i} className="font-bold text-white">
            {currentText.substring(i + 2, closingIndex)}
          </strong>
        );
        i = closingIndex + 2;
        continue;
      }
    }
    if (currentText.substring(i, i + 1) === '*') {
      const closingIndex = currentText.indexOf('*', i + 1);
      if (closingIndex !== -1) {
        parts.push(
          <em key={i} className="italic text-white/90">
            {currentText.substring(i + 1, closingIndex)}
          </em>
        );
        i = closingIndex + 1;
        continue;
      }
    }
    if (currentText.substring(i, i + 1) === '`') {
      const closingIndex = currentText.indexOf('`', i + 1);
      if (closingIndex !== -1) {
        parts.push(
          <code key={i} className="bg-white/10 px-1 py-0.5 rounded text-[10px] text-accent-violet font-mono">
            {currentText.substring(i + 1, closingIndex)}
          </code>
        );
        i = closingIndex + 1;
        continue;
      }
    }
    parts.push(currentText[i]);
    i++;
  }
  return parts;
}

function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className="space-y-1 text-xs text-text-secondary leading-relaxed break-words">
      {lines.map((line, idx) => {
        if (line.trim().startsWith('- ')) {
          return (
            <ul key={idx} className="list-disc pl-4 space-y-0.5">
              <li>{parseInlineMarkdown(line.trim().substring(2))}</li>
            </ul>
          );
        }
        return <p key={idx}>{parseInlineMarkdown(line)}</p>;
      })}
    </div>
  );
}

export default function BookmarksPanel({
  bookmarks,
  currentTime,
  onSeek,
  onAddBookmark,
  onDeleteBookmark,
  onUpdateNote,
  onClose,
}: BookmarksPanelProps) {
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onAddBookmark(Math.floor(currentTime), newNote);
      setNewNote('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (b: EpisodeBookmark) => {
    setEditingId(b.id);
    setEditText(b.note || '');
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await onUpdateNote(id, editText);
      setEditingId(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="absolute right-4 top-20 bottom-24 z-50 w-80 bg-[#0D0D14]/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col p-4 text-white overflow-hidden animate-fade-up">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Bookmark size={16} className="text-accent-violet" fill="currentColor" />
          <h3 className="font-bold text-sm font-display">Episode Bookmarks</h3>
        </div>
        <button
          onClick={onClose}
          className="text-text-secondary hover:text-white transition-colors"
          aria-label="Close bookmarks"
        >
          <X size={16} />
        </button>
      </div>

      {/* Add Bookmark form */}
      <form onSubmit={handleAdd} className="mt-3 pb-3 border-b border-white/10 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-secondary">At timestamp:</span>
          <span className="font-mono bg-white/10 px-2 py-0.5 rounded font-bold text-accent-violet">
            {formatTime(currentTime)}
          </span>
        </div>
        <textarea
          placeholder="Bookmark note... (supports **bold**, *italics*, `code`, - lists)"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          className="w-full h-16 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-accent-violet resize-none"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-accent-violet hover:bg-accent-violet/85 text-white font-bold text-xs transition-colors disabled:opacity-50"
        >
          <Plus size={14} />
          Add Bookmark
        </button>
      </form>

      {/* Bookmarks List */}
      <div className="flex-grow overflow-y-auto mt-3 pr-1 space-y-3 custom-scrollbar">
        {bookmarks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-text-secondary p-4 space-y-2">
            <Bookmark size={32} className="opacity-20" />
            <p className="text-xs">No bookmarks in this episode yet.</p>
            <p className="text-[10px] opacity-65">Press B during playback to quickly bookmark the current time.</p>
          </div>
        ) : (
          bookmarks.map((b) => (
            <div
              key={b.id}
              className="bg-white/5 border border-white/5 rounded-xl p-3 space-y-2 hover:border-white/10 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={() => onSeek(b.timestamp)}
                  className="flex items-center gap-1.5 text-xs font-mono font-bold text-accent-violet hover:text-accent-violet/80 transition-colors"
                >
                  <Play size={10} fill="currentColor" />
                  {formatTime(b.timestamp)}
                </button>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {editingId !== b.id ? (
                    <>
                      <button
                        onClick={() => startEdit(b)}
                        className="text-text-secondary hover:text-white transition-colors"
                        title="Edit Note"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => onDeleteBookmark(b.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        title="Delete Bookmark"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleSaveEdit(b.id)}
                        className="text-emerald-400 hover:text-emerald-300 transition-colors"
                        title="Save"
                      >
                        <Check size={12} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-text-secondary hover:text-white transition-colors"
                        title="Cancel"
                      >
                        <X size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {editingId !== b.id ? (
                b.note ? (
                  renderMarkdown(b.note)
                ) : (
                  <p className="text-[10px] italic text-white/35">No note added</p>
                )
              ) : (
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-accent-violet resize-none"
                />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
