'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Swords, Trophy, Sparkles } from 'lucide-react';
import {
  SmartRateCandidate,
  SmartRateMatchup,
  SmartRateResult,
  initSmartRateSession,
  pickNextMatchup,
  processMatch,
  finalizeSession,
  recommendedMatchCount,
} from '@/lib/rating/smartRate';
import { getScaleLabel } from '@/lib/rating/scaleDescriptions';

interface SmartRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (results: SmartRateResult[]) => void;
}

export default function SmartRateModal({ isOpen, onClose, onComplete }: SmartRateModalProps) {
  const [candidates, setCandidates] = useState<SmartRateCandidate[]>([]);
  const [currentMatchup, setCurrentMatchup] = useState<SmartRateMatchup | null>(null);
  const [playedPairs] = useState<Set<string>>(new Set());
  const [matchHistory, setMatchHistory] = useState<any[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [targetMatches, setTargetMatches] = useState(10);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [finalResults, setFinalResults] = useState<SmartRateResult[]>([]);

  useEffect(() => {
    if (isOpen) {
      startNewSession();
    }
  }, [isOpen]);

  const startNewSession = async () => {
    setLoading(true);
    setIsFinished(false);
    setMatchCount(0);
    setMatchHistory([]);
    playedPairs.clear();

    try {
      const res = await fetch('/api/list/rated');
      if (res.ok) {
        const data = await res.json();
        const rawEntries = (data.entries || []).map((e: any) => ({
          animeId: e.animeId,
          animeTitle: e.animeTitle,
          animeImage: e.animeImage,
          score: e.score,
        }));

        if (rawEntries.length < 2) {
          alert('You need at least 2 rated anime to play Smart Rate 1v1!');
          onClose();
          return;
        }

        const initialized = initSmartRateSession(rawEntries);
        setCandidates(initialized);
        const target = recommendedMatchCount(initialized.length);
        setTargetMatches(target);

        const next = pickNextMatchup(initialized, playedPairs);
        setCurrentMatchup(next);
      }
    } catch (err) {
      console.error('Failed to init Smart Rate session:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePickWinner = (winner: SmartRateCandidate, loser: SmartRateCandidate) => {
    const pairKey = [winner.animeId, loser.animeId].sort().join('|');
    playedPairs.add(pairKey);

    const updatedCandidates = processMatch(candidates, winner.animeId, loser.animeId);
    setCandidates(updatedCandidates);

    setMatchHistory((prev) => [
      ...prev,
      {
        winnerId: winner.animeId,
        winnerTitle: winner.animeTitle,
        loserId: loser.animeId,
        loserTitle: loser.animeTitle,
      },
    ]);

    const nextCount = matchCount + 1;
    setMatchCount(nextCount);

    if (nextCount >= targetMatches) {
      // Finish session
      const matchCounts = new Map<string, number>();
      const winCounts = new Map<string, number>();

      [...matchHistory, { winnerId: winner.animeId, loserId: loser.animeId }].forEach((m) => {
        matchCounts.set(m.winnerId, (matchCounts.get(m.winnerId) ?? 0) + 1);
        matchCounts.set(m.loserId, (matchCounts.get(m.loserId) ?? 0) + 1);
        winCounts.set(m.winnerId, (winCounts.get(m.winnerId) ?? 0) + 1);
      });

      const finalized = finalizeSession(updatedCandidates, matchCounts, winCounts);
      setFinalResults(finalized);
      setIsFinished(true);
    } else {
      const nextMatchup = pickNextMatchup(updatedCandidates, playedPairs);
      if (!nextMatchup) {
        setIsFinished(true);
      } else {
        setCurrentMatchup(nextMatchup);
      }
    }
  };

  const handleSaveResults = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/list/smart-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: `session_${Date.now()}`,
          finalCandidates: candidates,
          matches: matchHistory,
        }),
      });

      if (res.ok) {
        if (onComplete) onComplete(finalResults);
        onClose();
      }
    } catch (err) {
      console.error('Failed to save Smart Rate session:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-3xl bg-[#12121a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <Swords className="w-5 h-5 text-violet-400" />
              <h2 className="font-bold text-white text-lg">Smart Rate 1v1</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Body */}
          <div className="p-6 flex-1 min-h-[420px] flex flex-col items-center justify-center">
            {loading ? (
              <div className="text-slate-400 text-sm">Preparing matchups...</div>
            ) : isFinished ? (
              // Final Results Summary View
              <div className="w-full flex flex-col items-center text-center">
                <Trophy className="w-12 h-12 text-amber-400 mb-2 animate-bounce" />
                <h3 className="text-xl font-bold text-white mb-1">Matchup Session Complete!</h3>
                <p className="text-xs text-slate-400 mb-6">
                  Here are your updated Smart Ratings calculated from {matchCount} 1v1 matchups:
                </p>

                <div className="w-full max-h-[260px] overflow-y-auto space-y-2 mb-6">
                  {finalResults.map((res) => {
                    const label = getScaleLabel(res.derivedScore);
                    return (
                      <div
                        key={res.animeId}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5"
                      >
                        <span className="text-sm font-semibold text-white truncate max-w-[240px]">
                          {res.animeTitle}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400">
                            {res.matchesPlayed} matches ({Math.round(res.winRate * 100)}% win)
                          </span>
                          <span
                            className="font-bold font-mono text-sm px-2.5 py-0.5 rounded-lg bg-black/40 border border-white/10"
                            style={{ color: label.color }}
                          >
                            {res.derivedScore.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={handleSaveResults}
                  disabled={saving}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-xl shadow-violet-600/30 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Apply Smart Ratings'}
                </button>
              </div>
            ) : currentMatchup ? (
              // 1v1 Matchup Choice View
              <div className="w-full flex flex-col items-center">
                <div className="text-xs font-semibold text-violet-400 mb-4 bg-violet-950/60 px-3 py-1 rounded-full border border-violet-500/30">
                  Match {matchCount + 1} of {targetMatches} — Which did you like more?
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-xl">
                  {/* Left Choice */}
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handlePickWinner(currentMatchup.left, currentMatchup.right)}
                    className="flex flex-col items-center p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-violet-500/60 hover:bg-violet-950/20 transition-all text-center group cursor-pointer"
                  >
                    <img
                      src={currentMatchup.left.animeImage}
                      alt={currentMatchup.left.animeTitle}
                      className="w-36 h-52 object-cover rounded-xl shadow-lg border border-white/10 group-hover:border-violet-500/50 mb-3"
                    />
                    <span className="font-bold text-sm text-white line-clamp-2">
                      {currentMatchup.left.animeTitle}
                    </span>
                  </motion.button>

                  {/* Right Choice */}
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handlePickWinner(currentMatchup.right, currentMatchup.left)}
                    className="flex flex-col items-center p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-violet-500/60 hover:bg-violet-950/20 transition-all text-center group cursor-pointer"
                  >
                    <img
                      src={currentMatchup.right.animeImage}
                      alt={currentMatchup.right.animeTitle}
                      className="w-36 h-52 object-cover rounded-xl shadow-lg border border-white/10 group-hover:border-violet-500/50 mb-3"
                    />
                    <span className="font-bold text-sm text-white line-clamp-2">
                      {currentMatchup.right.animeTitle}
                    </span>
                  </motion.button>
                </div>
              </div>
            ) : null}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
