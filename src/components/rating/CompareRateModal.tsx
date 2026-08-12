'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Sliders } from 'lucide-react';
import { getScaleLabel, VALID_SCORES, snapToQuarterPoint } from '@/lib/rating/scaleDescriptions';
import { getCompareRatePreview, RatedEntry } from '@/lib/rating/compareRate';

interface CompareRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  animeId: string;
  animeTitle: string;
  animeImage: string;
  existingScore?: number;
  onConfirm?: (score: number) => void;
}

export default function CompareRateModal({
  isOpen,
  onClose,
  animeId,
  animeTitle,
  animeImage,
  existingScore = 7.5,
  onConfirm,
}: CompareRateModalProps) {
  const [sliderScore, setSliderScore] = useState<number>(existingScore);
  const [ratedEntries, setRatedEntries] = useState<RatedEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSliderScore(existingScore);
      fetchRatedEntries();
    }
  }, [isOpen, existingScore]);

  const fetchRatedEntries = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/list/rated');
      if (res.ok) {
        const data = await res.json();
        setRatedEntries(data.entries || []);
      }
    } catch (err) {
      console.error('Failed to fetch rated entries:', err);
    } finally {
      setLoading(false);
    }
  };

  const preview = getCompareRatePreview(sliderScore, ratedEntries, animeId);
  const currentLabel = getScaleLabel(preview.targetScore);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/list/compare-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ animeId, score: preview.targetScore }),
      });

      if (res.ok) {
        if (onConfirm) onConfirm(preview.targetScore);
        onClose();
      }
    } catch (err) {
      console.error('Failed to save compare rate:', err);
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
          className="relative w-full max-w-4xl max-h-[90vh] bg-[#12121a] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <Sliders className="w-5 h-5 text-violet-400" />
              <h2 className="text-lg font-bold text-white">Compare Rate</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Body */}
          <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
            {/* Left Controls: Slider & Target Anime Card */}
            <div className="md:col-span-5 p-6 border-r border-white/10 flex flex-col items-center justify-between bg-white/[0.01]">
              <div className="w-full flex flex-col items-center text-center">
                <img
                  src={animeImage}
                  alt={animeTitle}
                  className="w-32 h-44 object-cover rounded-xl shadow-lg border border-violet-500/30 mb-4"
                />
                <h3 className="font-bold text-white text-base line-clamp-1">{animeTitle}</h3>
                
                {/* Score badge & label */}
                <div className="mt-4 flex flex-col items-center">
                  <div
                    className="text-4xl font-extrabold px-4 py-1 rounded-2xl bg-white/5 border border-white/10 shadow-inner"
                    style={{ color: currentLabel.color }}
                  >
                    {preview.targetScore.toFixed(2)}
                  </div>
                  <div className="text-sm font-semibold mt-2" style={{ color: currentLabel.color }}>
                    {currentLabel.label}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">{currentLabel.descriptor}</p>
                </div>
              </div>

              {/* Slider Control */}
              <div className="w-full mt-6">
                <input
                  type="range"
                  min="1.00"
                  max="10.00"
                  step="0.25"
                  value={sliderScore}
                  onChange={(e) => setSliderScore(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                  <span>1.00 (Slop)</span>
                  <span>5.00 (Mid)</span>
                  <span>10.00 (God)</span>
                </div>
              </div>
            </div>

            {/* Right: Live Re-ordering Preview List */}
            <div className="md:col-span-7 p-4 overflow-y-auto flex flex-col gap-2 max-h-[60vh] md:max-h-full">
              <div className="text-xs font-semibold text-slate-400 mb-2 px-2 uppercase tracking-wider">
                Live Reordered Stack ({preview.orderedEntries.length} items)
              </div>

              {loading ? (
                <div className="p-8 text-center text-slate-400 text-sm">Loading your ratings...</div>
              ) : (
                preview.orderedEntries.map((item, idx) => {
                  const isTarget = item.animeId === animeId;
                  const label = getScaleLabel(item.score);

                  return (
                    <motion.div
                      key={item.animeId}
                      layout
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        isTarget
                          ? 'bg-violet-950/60 border-violet-500/80 shadow-lg shadow-violet-950/40 ring-1 ring-violet-500/50'
                          : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                      }`}
                      style={{
                        borderLeftWidth: '4px',
                        borderLeftColor: label.color,
                      }}
                    >
                      <span className="text-xs font-mono text-slate-500 w-6 text-center">#{idx + 1}</span>
                      <img
                        src={isTarget ? animeImage : item.animeImage}
                        alt={isTarget ? animeTitle : item.animeTitle}
                        className="w-9 h-12 object-cover rounded-lg bg-slate-800 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-semibold truncate ${isTarget ? 'text-violet-200' : 'text-white'}`}>
                          {isTarget ? animeTitle : item.animeTitle}
                        </div>
                        <div className="text-xs text-slate-400">{label.label}</div>
                      </div>
                      <div
                        className="text-sm font-bold font-mono px-2.5 py-1 rounded-lg bg-black/30 border border-white/5"
                        style={{ color: label.color }}
                      >
                        {item.score.toFixed(2)}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 bg-white/[0.02]">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/30 transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {saving ? 'Saving...' : 'Confirm Position'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
