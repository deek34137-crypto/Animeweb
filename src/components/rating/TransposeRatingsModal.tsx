'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, RefreshCw, AlertTriangle } from 'lucide-react';

interface TransposeRatingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TransposeRatingsModal({ isOpen, onClose }: TransposeRatingsModalProps) {
  const [delta, setDelta] = useState<number>(0);
  const [preview, setPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && delta !== 0) {
      fetchPreview();
    } else {
      setPreview([]);
    }
  }, [delta, isOpen]);

  const fetchPreview = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/list/transpose?delta=${delta}`);
      if (res.ok) {
        const data = await res.json();
        setPreview(data.preview || []);
      }
    } catch (err) {
      console.error('Failed to fetch transpose preview:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (delta === 0) return;
    setSaving(true);
    try {
      const res = await fetch('/api/list/transpose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta }),
      });

      if (res.ok) {
        alert(`Successfully shifted all ratings by ${delta > 0 ? '+' : ''}${delta.toFixed(2)}!`);
        onClose();
      }
    } catch (err) {
      console.error('Failed to transpose ratings:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

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
              <RefreshCw className="w-5 h-5 text-violet-400" />
              <h2 className="font-bold text-white text-lg">Transpose All Ratings</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 flex flex-col items-center">
            <p className="text-xs text-slate-400 text-center mb-6">
              Rated everything too generously or strictly? Shift your entire rating history up or down in one move.
            </p>

            {/* Shift Delta Controls */}
            <div className="w-full bg-white/[0.02] p-4 rounded-xl border border-white/5 mb-6 text-center">
              <div className="text-3xl font-extrabold text-violet-400 mb-2 font-mono">
                {delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)}
              </div>
              <input
                type="range"
                min="-2.50"
                max="2.50"
                step="0.25"
                value={delta}
                onChange={(e) => setDelta(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                <span>-2.50 (Strict)</span>
                <span>0.00 (No change)</span>
                <span>+2.50 (Generous)</span>
              </div>
            </div>

            {/* Dry Run Preview List */}
            {delta !== 0 && (
              <div className="w-full flex flex-col gap-2 max-h-[220px] overflow-y-auto mb-4">
                <div className="text-xs font-semibold text-slate-400 mb-1 px-1">
                  Preview ({preview.length} items affected):
                </div>
                {loading ? (
                  <div className="text-xs text-slate-500 text-center py-4">Computing shift...</div>
                ) : (
                  preview.map((item) => (
                    <div
                      key={item.animeId}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-xs"
                    >
                      <span className="font-medium text-white truncate max-w-[200px]">
                        {item.animeTitle}
                      </span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-slate-400">{item.oldScore.toFixed(2)}</span>
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                        <span className={delta > 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          {item.newScore.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 bg-white/[0.02]">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={delta === 0 || saving}
              className="px-6 py-2 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/30 transition-all disabled:opacity-40"
            >
              {saving ? 'Applying...' : 'Apply Shift'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
