'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, AlertCircle } from 'lucide-react';

interface MomentSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function MomentSubmitModal({ isOpen, onClose, onSuccess }: MomentSubmitModalProps) {
  const [animeTitle, setAnimeTitle] = useState('');
  const [animeId, setAnimeId] = useState('21'); // Default sample MAL ID or user-entered
  const [episode, setEpisode] = useState(1);
  const [timestamp, setTimestamp] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [spoilerRisk, setSpoilerRisk] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!animeTitle || !title || !episode) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/top-moments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          animeId,
          animeTitle,
          episode,
          timestamp,
          title,
          description,
          spoilerRisk,
        }),
      });

      if (res.ok) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to submit moment');
      }
    } catch (err) {
      console.error('Failed to submit top moment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg bg-[#12121a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-400" />
              <h2 className="font-bold text-white text-lg">Nominate Top Moment</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Anime Title *
              </label>
              <input
                type="text"
                required
                value={animeTitle}
                onChange={(e) => setAnimeTitle(e.target.value)}
                placeholder="e.g. Attack on Titan, One Piece..."
                className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Episode Number *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={episode}
                  onChange={(e) => setEpisode(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Timestamp (Optional)
                </label>
                <input
                  type="text"
                  value={timestamp}
                  onChange={(e) => setTimestamp(e.target.value)}
                  placeholder="e.g. 14:32"
                  className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Moment Title *
              </label>
              <input
                type="text"
                required
                maxLength={100}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. All Might's United States of Smash"
                className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Description / Context
              </label>
              <textarea
                rows={3}
                maxLength={300}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe why this moment is legendary..."
                className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none"
              />
            </div>

            <div className="flex items-center gap-2 p-3 rounded-xl bg-violet-950/30 border border-violet-500/20">
              <input
                type="checkbox"
                id="spoilerRisk"
                checked={spoilerRisk}
                onChange={(e) => setSpoilerRisk(e.target.checked)}
                className="w-4 h-4 accent-violet-600 rounded cursor-pointer"
              />
              <label htmlFor="spoilerRisk" className="text-xs text-violet-200 cursor-pointer flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-violet-400" />
                This moment contains major spoilers (spoiler blurred)
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/30 transition-all disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Moment'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
